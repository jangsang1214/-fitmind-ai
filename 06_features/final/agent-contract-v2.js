(function(root,factory){
  const api=factory(root,root.GarangAgentContract||null);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else{root.GarangAgentContractV2=api;root.GarangAgentContract=api;}
})(typeof globalThis!=='undefined'?globalThis:this,function(root,BrowserBase){
'use strict';

const Base=BrowserBase||(typeof module==='object'&&module.exports?require('./agent-contract-v1.js'):null);
if(!Base)throw new Error('GARANG_AGENT_CONTRACT_V1_REQUIRED');
const CONTRACT_VERSION=Base.CONTRACT_VERSION;
const ACTION_LAYER_VERSION='garang-agent-action-v2.1';
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
  request.policy={...request.policy,idempotentConfirmedWrites:true,revisionConflictProtection:true,explicitDeletionTombstones:true,recommendationLifecycle:['accept','modify','dismiss'],outcomeLinkage:true};
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
function expectedOutcome(tool,args={}){
  if(tool==='createPlan'||(tool==='createRecord'&&args.domain==='planner'))return 'Complete the accepted plan and create real execution evidence that GARANG can evaluate.';
  if(tool==='updatePlan'||(tool==='updateRecord'&&args.domain==='planner'))return 'Execute the revised plan and compare the result with this recommendation.';
  if(tool==='updateGoal')return 'Use the confirmed goal as the reference for future plan alignment.';
  return 'Observe the user-confirmed result before changing the next recommendation.';
}
function recommendationEvidence(call,request){
  const fromArgs=Array.isArray(call?.args?.reasonCodes)?call.args.reasonCodes:[];
  const fromDecision=Array.isArray(request?.context?.decision?.reasonCodes)?request.context.decision.reasonCodes:[];
  return [...new Set([...fromArgs,...fromDecision].map(String).filter(Boolean))].slice(0,12);
}
function decisionIdentity(request){
  const decision=object(request?.context?.decision)?request.context.decision:{};
  return {decisionId:clean(decision.decisionId)||null,decisionMode:clean(decision.mode)||null};
}
function validateModifiedProposal(proposal,patch){
  const args={...clone(proposal.args),...clone(patch)};
  if(proposal.tool==='createRecord'||proposal.tool==='updateRecord')return validateCrud(proposal.tool,args);
  return Base.normalizeToolCall({id:proposal.id,tool:proposal.tool,args,reason:proposal.reason},{idFactory:()=>proposal.id}).args;
}
function linkedArgs(proposal){
  const metadata={decisionId:proposal.decisionId,decisionMode:proposal.decisionMode,recommendationId:proposal.recommendationId,recommendationSource:proposal.source,recommendationReason:proposal.reason,recommendationEvidence:clone(proposal.evidence),recommendationConfidence:proposal.confidence,expectedOutcome:proposal.expectedOutcome,recommendationRevision:proposal.revision};
  if(proposal.tool==='createRecord'&&proposal.args?.domain==='planner')return {...clone(proposal.args),record:{...clone(proposal.args.record),...metadata}};
  if(proposal.tool==='updateRecord'&&proposal.args?.domain==='planner')return {...clone(proposal.args),patch:{...clone(proposal.args.patch),...metadata}};
  return {...clone(proposal.args),...metadata};
}
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
      const raw=await adapter.respond(clone(request)),response=validateResponse(raw,request,{idFactory}),reads=[],pending=[],identity=decisionIdentity(request);
      for(const call of response.toolCalls){
        if(call.kind==='read'){const result=read(call.tool,call.args);reads.push({call:clone(call),result});audit.push({event:'read_executed',callId:call.id,tool:call.tool,at:clock().toISOString()});}
        else{const proposal={...clone(call),decisionId:identity.decisionId,decisionMode:identity.decisionMode,recommendationId:call.id,status:'pending',revision:1,source:clean(response?.meta?.provider)||'coach',evidence:recommendationEvidence(call,request),confidence:Number.isFinite(Number(request?.context?.decision?.confidence))?Math.max(0,Math.min(1,Number(request.context.decision.confidence))):null,expectedOutcome:expectedOutcome(call.tool,call.args),createdAt:clock().toISOString()};proposals.set(proposal.id,proposal);pending.push(clone(proposal));audit.push({event:'write_proposed',callId:proposal.id,decisionId:proposal.decisionId,recommendationId:proposal.recommendationId,tool:proposal.tool,at:proposal.createdAt});}
      }
      return {request,response,reads,proposals:pending};
    },
    modify(proposalId,changes={}){
      const proposal=proposals.get(proposalId);assert(proposal,'PROPOSAL_NOT_FOUND');assert(proposal.status==='pending','PROPOSAL_ALREADY_RESOLVED');assert(object(changes),'INVALID_TOOL_ARGS');
      const patch=object(changes.args)?changes.args:changes;proposal.args=validateModifiedProposal(proposal,patch);proposal.revision=Math.max(1,Number(proposal.revision)||1)+1;proposal.modifiedAt=clock().toISOString();
      if(clean(changes.reason))proposal.reason=clean(changes.reason);if(clean(changes.expectedOutcome))proposal.expectedOutcome=clean(changes.expectedOutcome);
      audit.push({event:'write_modified',callId:proposal.id,decisionId:proposal.decisionId,recommendationId:proposal.recommendationId,tool:proposal.tool,revision:proposal.revision,at:proposal.modifiedAt});return clone(proposal);
    },
    confirm(proposalId,approved){
      const proposal=proposals.get(proposalId);assert(proposal,'PROPOSAL_NOT_FOUND');assert(proposal.status==='pending','PROPOSAL_ALREADY_RESOLVED');proposal.status=approved?'confirmed':'rejected';proposal.resolvedAt=clock().toISOString();let result=null;
      if(approved){
        const args=linkedArgs(proposal),meta={callId:proposal.id,idempotencyKey:proposal.id,decisionId:proposal.decisionId,decisionMode:proposal.decisionMode,recommendationId:proposal.recommendationId,recommendationRevision:proposal.revision,userConfirmed:true,confirmedAt:proposal.resolvedAt,proposal:clone(proposal)};
        result=withConfirmedWriteScope(meta,()=>applyWrite(proposal.tool,args,meta));
      }
      audit.push({event:proposal.status==='confirmed'?'write_confirmed':'write_rejected',callId:proposal.id,decisionId:proposal.decisionId,recommendationId:proposal.recommendationId,tool:proposal.tool,revision:proposal.revision,at:proposal.resolvedAt});return {proposal:clone(proposal),result:clone(result)};
    },
    getProposal(id){const proposal=proposals.get(id);return proposal?clone(proposal):null;}
  });
}

return Object.freeze({CONTRACT_VERSION,ACTION_LAYER_VERSION,CONFIRMATION_SCOPE_KEY,CRUD_DOMAINS,READ_TOOLS,WRITE_TOOLS,AgentContractError:Base.AgentContractError,createRequest,validateResponse,normalizeToolCall,createMockAdapter,createSession,readFromState,expectedOutcome});
});