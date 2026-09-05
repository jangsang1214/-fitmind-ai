'use strict';

const AI_CONTRACT_VERSION='garang-ai-v1';
const TOOL_CONTRACT_VERSION='garang-tools-v1';
const TOOL_SPECS=Object.freeze({
  createPlan:{requiresConfirmation:true},
  updatePlan:{requiresConfirmation:true},
  saveMemory:{requiresConfirmation:true},
  deleteRecord:{requiresConfirmation:true},
  updateGoal:{requiresConfirmation:true}
});

const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const clean=(v,max=4000)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
const validTime=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v||''));
const result=(ok,args=null,errors=[])=>({ok,args,errors});
const reject=(...errors)=>result(false,null,errors);
const onlyKeys=(v,keys)=>Object.keys(v).every(k=>keys.includes(k));

function validateToolCall(input){
  if(!object(input))return reject('tool call must be an object');
  const tool=clean(input.tool,80);
  if(!Object.hasOwn(TOOL_SPECS,tool))return reject('tool is not allowed');
  const raw=object(input.args)?input.args:{};

  if(tool==='createPlan'){
    if(!onlyKeys(raw,['title','date','time','type','details']))return reject('createPlan contains unsupported args');
    const title=clean(raw.title,120); if(!title)return reject('createPlan.title is required');
    if(raw.date!=null&&!validDate(raw.date))return reject('createPlan.date must be YYYY-MM-DD');
    if(raw.time!=null&&!validTime(raw.time))return reject('createPlan.time must be HH:MM');
    const type=raw.type==null?'general':clean(raw.type,30);
    if(!['workout','nutrition','running','body','recovery','general'].includes(type))return reject('createPlan.type is invalid');
    return result(true,{title,date:raw.date||null,time:raw.time||null,type,details:clean(raw.details,500)||null});
  }

  if(tool==='updatePlan'){
    if(!onlyKeys(raw,['id','patch']))return reject('updatePlan contains unsupported args');
    const id=clean(raw.id,160), patch=object(raw.patch)?raw.patch:null;
    if(!id||!patch)return reject('updatePlan.id and patch are required');
    const allowed=['title','date','time','type','details','done'];
    if(!onlyKeys(patch,allowed)||!Object.keys(patch).length)return reject('updatePlan.patch is invalid');
    const out={};
    if(Object.hasOwn(patch,'title')){out.title=clean(patch.title,120);if(!out.title)return reject('updatePlan.patch.title cannot be empty');}
    if(Object.hasOwn(patch,'date')){if(patch.date!==null&&!validDate(patch.date))return reject('updatePlan.patch.date must be YYYY-MM-DD');out.date=patch.date;}
    if(Object.hasOwn(patch,'time')){if(patch.time!==null&&!validTime(patch.time))return reject('updatePlan.patch.time must be HH:MM');out.time=patch.time;}
    if(Object.hasOwn(patch,'type')){const type=clean(patch.type,30);if(!['workout','nutrition','running','body','recovery','general'].includes(type))return reject('updatePlan.patch.type is invalid');out.type=type;}
    if(Object.hasOwn(patch,'details'))out.details=clean(patch.details,500)||null;
    if(Object.hasOwn(patch,'done')){if(typeof patch.done!=='boolean')return reject('updatePlan.patch.done must be boolean');out.done=patch.done;}
    return result(true,{id,patch:out});
  }

  if(tool==='saveMemory'){
    if(!onlyKeys(raw,['type','key','value','importance','confidence','expiresAt','userConfirmed']))return reject('saveMemory contains unsupported args');
    const value=clean(raw.value,1000); if(!value)return reject('saveMemory.value is required');
    const type=raw.type==null?'note':clean(raw.type,40);
    if(!['goal','preference','note','schedule','identity','constraint'].includes(type))return reject('saveMemory.type is invalid');
    const importance=raw.importance==null?3:Number(raw.importance), confidence=raw.confidence==null?.9:Number(raw.confidence);
    if(!Number.isInteger(importance)||importance<1||importance>5)return reject('saveMemory.importance must be integer 1..5');
    if(!Number.isFinite(confidence)||confidence<0||confidence>1)return reject('saveMemory.confidence must be 0..1');
    let expiresAt=null;
    if(raw.expiresAt!=null){const t=Date.parse(raw.expiresAt);if(!Number.isFinite(t))return reject('saveMemory.expiresAt must be ISO-8601');expiresAt=new Date(t).toISOString();}
    return result(true,{type,key:clean(raw.key,120)||null,value,importance,confidence,expiresAt,userConfirmed:raw.userConfirmed!==false});
  }

  if(tool==='deleteRecord'){
    if(!onlyKeys(raw,['domain','id']))return reject('deleteRecord contains unsupported args');
    const domain=clean(raw.domain,30),id=clean(raw.id,160);
    if(!['workouts','meals','runs','body','planner'].includes(domain))return reject('deleteRecord.domain is invalid');
    if(!id)return reject('deleteRecord.id is required');
    return result(true,{domain,id});
  }

  if(tool==='updateGoal'){
    if(!onlyKeys(raw,['goal']))return reject('updateGoal contains unsupported args');
    const goal=clean(raw.goal,160); if(!goal)return reject('updateGoal.goal is required');
    return result(true,{goal});
  }
  return reject('unsupported tool');
}

function normalizeCoachRequest(body){
  if(!object(body))return reject('request body must be an object');
  if(!onlyKeys(body,['message','context','mockScenario']))return reject('coach request contains unsupported fields');
  const message=clean(body.message,4000); if(!message)return reject('message is required');
  if(body.context!=null&&!object(body.context))return reject('context must be an object');
  return result(true,{message,context:body.context||{},mockScenario:body.mockScenario==null?null:clean(body.mockScenario,80)});
}

function normalizeProviderResult(input){
  if(!object(input))return reject('provider result must be an object');
  const text=clean(input.text,8000); if(!text)return reject('provider result text is required');
  const calls=Array.isArray(input.toolCalls)?input.toolCalls:[];
  if(calls.length>5)return reject('provider returned too many tool calls');
  const toolCalls=[];
  for(const raw of calls){
    const checked=validateToolCall(raw); if(!checked.ok)return reject(...checked.errors);
    toolCalls.push({id:clean(raw.id,160)||null,tool:clean(raw.tool,80),args:checked.args});
  }
  return result(true,{text,toolCalls,usage:object(input.usage)?input.usage:{}});
}

module.exports={AI_CONTRACT_VERSION,TOOL_CONTRACT_VERSION,TOOL_SPECS,validateToolCall,normalizeCoachRequest,normalizeProviderResult};
