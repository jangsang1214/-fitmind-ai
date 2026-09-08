(function(root,factory){
  const api=factory(root,root.GarangAgentContract||null);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.GarangAgentContractV2=api;root.GarangAgentContract=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(root,BrowserBase){
'use strict';

const Base=BrowserBase||(typeof module==='object'&&module.exports?require('./agent-contract-v1.js'):null);
if(!Base)throw new Error('GARANG_AGENT_CONTRACT_V1_REQUIRED');
const CONTRACT_VERSION=Base.CONTRACT_VERSION;
const ACTION_LAYER_VERSION='garang-agent-action-v2';
const CONFIRMATION_SCOPE_KEY='__GARANG_AGENT_CONFIRMED_WRITE_V2__';
const CRUD_DOMAINS=Object.freeze(['workouts','meals','runs','body','planner','memory']);
const READ_TOOLS=Object.freeze([...Base.READ_TOOLS]);
const WRITE_TOOLS=Object.freeze([...Base.WRITE_TOOLS,'createRecord','updateRecord']);
const READ_SET=new Set(READ_TOOLS),ALL_TOOLS=new Set([...READ_TOOLS,...WRITE_TOOLS]),DOMAIN_SET=new Set(CRUD_DOMAINS);
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:(typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value)));
const clean=value=>String(value??'').trim();
const defaultId=prefix=>root.crypto?.randomUUID?.()||`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const defaultClock=()=>new Date();
function error(code,message=code){const e=new Base.AgentContractError(code,message);return e;}
function assert(condition,code,message){if(!condition)throw error(code,message);}
function validateCrud(tool,args){
  const value=object(args)?clone(args):{};
  assert(DOMAIN_SET.has(clean(value.domain)),'INVALID_TOOL_ARGS',`${tool}.domain is invalid.`);
  if(tool==='createRecord'){
    assert(object(value.record),'INVALID_TOOL_ARGS','createRecord.record is required.');
    if(value.domain==='workouts')assert(clean(value.record.name),'INVALID_TOOL_ARGS','Workout name is required.');
    if(value.domain==='planner')assert(clean(value.record.title),'INVALID_TOOL_ARGS','Plan title is required.');
    if(value.domain==='memory'){assert(clean(value.record.key),'INVALID_TOOL_ARGS','Memory key is required.');assert(clean(value.record.value??value.record.text),'INVALID_TOOL_ARGS','Memory value is required.');}
    if(value.domain==='body')assert(Number.isFinite(Number(value.record.weight))&&Number(value.record.weight)>0,'INVALID_TOOL_ARGS','Body weight is required.');
  }else{
    assert(clean(value.id),'INVALID_TOOL_ARGS','updateRecord.id is required.');
    assert(object(value.patch)&&Object.keys(value.patch).length>0,'INVALID_TOOL_ARGS','updateRecord.patch is required.');
    assert(!Object.prototype.hasOwnProperty.call(value.patch,'id'),'INVALID_TOOL_ARGS','updateRecord.patch cannot change id.');
    if(value.expectedRevision!==undefined)assert(Number.isInteger(Number(value.expectedRevision))&&Number(value.expectedRevision)>=1,'INVALID_TOOL_ARGS','expectedRevision is invalid.');
  }
  return value;
}
function normalizeToolCall(call,{idFactory=defaultId}={}){
  assert(object(call),'INVALID_TOOL_CALL');const tool=clean(call.tool);assert(ALL_TOOLS.has(tool),'TOOL_NOT_ALLOWED',`Tool ${tool||'(empty)'} is not allowed.`);
  if(tool!=='createRecord'&&tool!=='updateRecord')return Base.normalizeToolCall(call,{idFactory});
  const args=validateCrud(tool,call.args),id=clean(call.id)||idFactory('tool');return {id,tool,args,kind:'write',status:'proposal',requiresConfirmation:true,reason:clean(call.reason)||null};
}
function createRequest(input,options={}){
  const request=Base.createRequest(input,options);
  request.capabilities={...request.capabilities,readTools:[...READ_TOOLS],writeTools:[...WRITE_TOOLS],crudDomains:[...CRUD_DOMAINS],actionLayerVersion:ACTION_LAYER_VERSION};
  request.policy={...request.policy,idempotentConfirmedWrites:true,revisionConflictProtection:true,explicitDeletionTombstones:true};
  return request;
}
function validateResponse(raw,request,{idFactory=defaultId}={}){
  assert(object(raw),'INVALID_AGENT_RESPONSE');const answer=clean(raw.answer);assert(answer,'INVALID_AGENT_RESPONSE','answer is required.');
  const calls=Array.isArray(raw.toolCalls)?raw.toolCalls:[];assert(calls.length<=8,'TOO_MANY_TOOL_CALLS');const seen=new Set();
  const toolCalls=calls.map(call=>{const normalized=normalizeToolCall(call,{idFactory});assert(!seen.has(normalized.id),'DUPLICATE_TOOL_CALL_ID');seen.add(normalized.id);return normalized;});
  return {contractVersion:CONTRACT_VERSION,actionLayerVersion:ACTION_LAYER_VERSION,requestId:request?.requestId||clean(raw.requestId)||null,language:request?.language||(raw.language==='en'?'en':'ko'),answer,toolCalls,meta:object(raw.meta)?clone(raw.meta):{}};
}
function createMockAdapter(options){return Base.createMockAdapter(options);}
function readFromState(tool,state){return Base.readFromState(tool,state);}
function withConfirmedWriteScope(meta,run){
  const previous=root[CONFIRMATION_SCOPE_KEY],scope=Object.freeze({...clone(meta),userConfirmed:true});
  root[CONFIRMATION_SCOPE_KEY]=scope;
  try{return run();}
  finally{
    if(previous===undefined)delete root[CONFIRMATION_SCOPE_KEY];
    else root[CONFIRMATION_SCOPE_KEY]=previous;
  }
}
function createSession({getState=()=>({}),readTool=null,applyWrite=()=>null,idFactory=defaultId,clock=defaultClock}={}){
  const proposals=new Map(),audit=[];
  const read=(tool,args)=>{assert(READ_SET.has(tool),'TOOL_NOT_ALLOWED');const result=typeof readTool==='function'?readTool(tool,clone(args||{})):readFromState(tool,getState());return clone(result);};
  return Object.freeze({
    contractVersion:CONTRACT_VERSION,actionLayerVersion:ACTION_LAYER_VERSION,audit,
    async run(input,{adapter=createMockAdapter({idFactory})}={}){
      const request=input?.contractVersion===CONTRACT_VERSION?clone(input):createRequest(input||{},{idFactory,clock});assert(adapter&&typeof adapter.respond==='function','INVALID_ADAPTER');
      const raw=await adapter.respond(clone(request)),response=validateResponse(raw,request,{idFactory}),reads=[],pending=[];
      for(const call of response.toolCalls){
        if(call.kind==='read'){const result=read(call.tool,call.args);reads.push({call:clone(call),result});audit.push({event:'read_executed',callId:call.id,tool:call.tool,at:clock().toISOString()});}
        else{const proposal={...clone(call),status:'pending',createdAt:clock().toISOString()};proposals.set(proposal.id,proposal);pending.push(clone(proposal));audit.push({event:'write_proposed',callId:proposal.id,tool:proposal.tool,at:proposal.createdAt});}
      }
      return {request,response,reads,proposals:pending};
    },
    confirm(proposalId,approved){
      const proposal=proposals.get(proposalId);assert(proposal,'PROPOSAL_NOT_FOUND');assert(proposal.status==='pending','PROPOSAL_ALREADY_RESOLVED');proposal.status=approved?'confirmed':'rejected';proposal.resolvedAt=clock().toISOString();let result=null;
      if(approved){
        const meta={callId:proposal.id,idempotencyKey:proposal.id,userConfirmed:true,confirmedAt:proposal.resolvedAt,proposal:clone(proposal)};
        result=withConfirmedWriteScope(meta,()=>applyWrite(proposal.tool,clone(proposal.args),meta));
      }
      audit.push({event:proposal.status==='confirmed'?'write_confirmed':'write_rejected',callId:proposal.id,tool:proposal.tool,at:proposal.resolvedAt});return {proposal:clone(proposal),result:clone(result)};
    },
    getProposal(id){const proposal=proposals.get(id);return proposal?clone(proposal):null;}
  });
}

return Object.freeze({CONTRACT_VERSION,ACTION_LAYER_VERSION,CONFIRMATION_SCOPE_KEY,CRUD_DOMAINS,READ_TOOLS,WRITE_TOOLS,AgentContractError:Base.AgentContractError,createRequest,validateResponse,normalizeToolCall,createMockAdapter,createSession,readFromState});
});
