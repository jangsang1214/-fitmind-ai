'use strict';

const {parseBearer,buildAgentContext}=require('./agent-context.cjs');
const {createProvider}=require('./llm-provider.cjs');
const crypto=require('node:crypto');

const rows=value=>Array.isArray(value)?value:[];
const clean=(value,limit=1000)=>String(value??'').trim().slice(0,limit);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const finite=value=>{const n=Number(value);return Number.isFinite(n)?n:null;};
const round=(value,digits=1)=>{const n=finite(value);if(n===null)return null;const p=10**digits;return Math.round(n*p)/p;};
const directIdentifierKey=value=>/(?:^|_)(?:email|e_mail|phone|mobile|address|location|latitude|longitude|token|display_name|full_name)(?:_|$)/i.test(String(value||''));
function redactText(value,limit=800){return clean(value,limit).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]').replace(/(?:\+?\d[\d\s().-]{7,}\d)/g,'[redacted-phone]');}
function select(row,keys,{redact=false}={}){const out={};for(const key of keys){const value=row?.[key];if(value===undefined||value===null||value==='')continue;out[key]=redact&&typeof value==='string'?redactText(value):clone(value);}return out;}
function latestCheckin(state){return [...rows(state?.dailyCheckins),...rows(state?.checkins)].slice().sort((a,b)=>String(a?.date||a?.createdAt||'').localeCompare(String(b?.date||b?.createdAt||''))).at(-1)||null;}
function bodyTrend(bodyRows){
 const sorted=rows(bodyRows).filter(row=>row?.date).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));if(!sorted.length)return null;
 const first=sorted[0],last=sorted.at(-1),delta=(key,digits=1)=>{const a=finite(first?.[key]),b=finite(last?.[key]);return a===null||b===null?null:round(b-a,digits);};
 return {fromDate:String(first.date).slice(0,10),toDate:String(last.date).slice(0,10),weightDelta:delta('weight'),fatPercentDelta:delta('fatPercent'),muscleDelta:delta('muscle')};
}
function minimalContext(full,state={}){
 const memory=rows(full?.memory?.entries).filter(row=>!directIdentifierKey(row?.key)&&String(row?.type||'').toLowerCase()!=='identity').slice(0,10).map(row=>select(row,['type','key','value','confidence','importance','createdAt'],{redact:true}));
 const workouts=rows(full?.workouts).slice(0,8).map(row=>select(row,['date','name','exercise','sets','reps','weight','rpe','duration','volume']));
 const meals=rows(full?.meals).slice(0,8).map(row=>select(row,['date','name','kcal','protein','carbs','fat']));
 const runs=rows(full?.runs).slice(0,6).map(row=>select(row,['date','distance','duration','pace','rpe']));
 const body=rows(full?.body).slice(0,6).map(row=>select(row,['date','weight','fatPercent','muscle']));
 const planner=rows(full?.planner).slice(0,6).map(row=>select(row,['date','domain','type','title','status','completed','executionScore']));
 const checkin=select(latestCheckin(state)||{},['date','sleep','sleepHours','energy','energyLevel','stress','stressLevel','soreness','muscleSoreness','availableMinutes']);
 return {goal:clone(full?.goal??null),confirmedMemory:memory,recent:{workouts,meals,runs,body,bodyTrend:bodyTrend(body),planner,recoveryCheckin:Object.keys(checkin).length?checkin:null},stateIntelligence:clone(full?.userState||null),performance:clone(full?.performanceScore||null),outcomeLearning:clone(full?.outcome||null),garangDecision:clone(full?.decision||null),decisionReasons:rows(full?.decision?.reasonCodes).slice(0,8),actionProposalAllowed:!!full?.decision?.actionProposal};
}
function requestId(){return crypto.randomUUID?.()||`coach_${Date.now()}_${Math.random().toString(36).slice(2)}`;}
function errorCode(error){return clean(error?.code||error?.message||'LLM_GATEWAY_ERROR',80).replace(/[^A-Z0-9_]+/gi,'_').toUpperCase();}
function alignGenerated(generated,context){
 const decisionConfidence=finite(context?.garangDecision?.confidence),llmConfidence=finite(generated?.confidence),effective=decisionConfidence===null?llmConfidence:llmConfidence===null?decisionConfidence:Math.min(llmConfidence,decisionConfidence),capped=decisionConfidence!==null&&llmConfidence!==null&&llmConfidence>decisionConfidence;
 return {...generated,confidence:effective===null?null:round(Math.max(0,Math.min(1,effective)),2),metadata:{...(clone(generated?.metadata)||{}),alignment:{decisionId:clean(context?.garangDecision?.decisionId,240)||null,decisionMode:clean(context?.garangDecision?.mode,40)||null,decisionConfidence,llmConfidence,confidenceCapped:capped,outcomeClassification:clean(context?.outcomeLearning?.classification,60)||'insufficient_evidence'}}};
}
function defaultObserve(event){try{console.info('[GARANG_COACH_EVENT]',JSON.stringify(event));}catch{}}
function createCoachGatewayHandler(deps={}){
 const verifyIdToken=deps.verifyIdToken,readUser=deps.readUser,clock=deps.clock||(()=>new Date()),providerFactory=deps.providerFactory||createProvider,getProviderConfig=deps.getProviderConfig||(()=>({provider:'openai',apiKey:process.env.GARANG_LLM_API_KEY||'',model:process.env.GARANG_LLM_MODEL||'gpt-5.6-luna'})),observe=typeof deps.observe==='function'?deps.observe:defaultObserve;
 if(typeof verifyIdToken!=='function'||typeof readUser!=='function')throw new Error('COACH_GATEWAY_DEPENDENCIES_REQUIRED');
 return async function coachGateway(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return res.status(405).json({ok:false,error:{code:'METHOD_NOT_ALLOWED'}});
  const token=parseBearer(req?.headers?.authorization||req?.get?.('authorization'));if(!token)return res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  let decoded;try{decoded=await verifyIdToken(token);}catch{return res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});}
  const uid=clean(decoded?.uid,180);if(!uid)return res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  const message=clean(req?.body?.message,1800),language=req?.body?.language==='en'?'en':'ko';if(!message)return res.status(400).json({ok:false,error:{code:'MESSAGE_REQUIRED'}});
  let state;try{state=await readUser(uid);}catch{return res.status(503).json({ok:false,error:{code:'USER_DATA_UNAVAILABLE'}});}
  const full=buildAgentContext(state||{},{ownerUid:uid,query:message,now:clock(),limit:12,memoryLimit:10}),context=minimalContext(full,state||{}),id=requestId();
  try{
   const config=getProviderConfig();observe({event:'llm_request',requestId:id,provider:clean(config?.provider||'openai',40),decisionMode:clean(context?.garangDecision?.mode,40)||null,outcomeClassification:clean(context?.outcomeLearning?.classification,60)||'insufficient_evidence'});
   const provider=providerFactory(config),generated=alignGenerated(await provider.generate({message,context,language,requestId:id}),context),data={...generated,source:'llm',requestId:id,garangDecision:clone(context.garangDecision),actionProposalAllowed:context.actionProposalAllowed};
   observe({event:'llm_success',requestId:id,provider:clean(generated?.metadata?.provider||config?.provider||'openai',40),decisionMode:clean(context?.garangDecision?.mode,40)||null,confidenceCapped:generated?.metadata?.alignment?.confidenceCapped===true});
   return res.status(200).json({ok:true,answer:generated.answer,data});
  }catch(error){
   const code=errorCode(error);observe({event:'llm_fallback',requestId:id,code,providerStatus:finite(error?.status),decisionMode:clean(context?.garangDecision?.mode,40)||null});return res.status(code==='LLM_SECRET_MISSING'?503:502).json({ok:false,error:{code},fallbackRequired:true,requestId:id,garangDecision:clone(context.garangDecision)});
  }
 };
}
module.exports={createCoachGatewayHandler,minimalContext,redactText,latestCheckin,bodyTrend,alignGenerated};
