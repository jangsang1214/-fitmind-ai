(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangAgentContract=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';

const CONTRACT_VERSION='garang-agent-action-v1';
const READ_TOOLS=Object.freeze(['getWorkoutHistory','getNutritionHistory','getRunningHistory','getBodyTrend','getPerformanceScore','getPlanner','getMemory']);
const WRITE_TOOLS=Object.freeze(['createPlan','updatePlan','saveMemory','deleteRecord','updateGoal']);
const ALL_TOOLS=new Set([...READ_TOOLS,...WRITE_TOOLS]);
const WRITE_SET=new Set(WRITE_TOOLS),READ_SET=new Set(READ_TOOLS);
const DELETE_DOMAINS=new Set(['workouts','meals','runs','body','planner','memory']);

class AgentContractError extends Error{
  constructor(code,message=code){super(message);this.name='AgentContractError';this.code=code;}
}
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=value=>value===undefined?undefined:(typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value)));
const clean=value=>String(value??'').trim();
const lang=value=>value==='en'?'en':'ko';
const defaultId=prefix=>root.crypto?.randomUUID?.()||`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
const defaultClock=()=>new Date();
function assert(condition,code,message){if(!condition)throw new AgentContractError(code,message);}

function validateArgs(tool,args){
  const value=object(args)?args:{};
  switch(tool){
    case 'createPlan': assert(clean(value.title),'INVALID_TOOL_ARGS','createPlan.title is required.');break;
    case 'updatePlan': assert(clean(value.id),'INVALID_TOOL_ARGS','updatePlan.id is required.');break;
    case 'saveMemory':
      assert(clean(value.type),'INVALID_TOOL_ARGS','saveMemory.type is required.');
      assert(clean(value.key),'INVALID_TOOL_ARGS','saveMemory.key is required.');
      assert(clean(value.value),'INVALID_TOOL_ARGS','saveMemory.value is required.');break;
    case 'deleteRecord':
      assert(DELETE_DOMAINS.has(clean(value.domain)),'INVALID_TOOL_ARGS','deleteRecord.domain is invalid.');
      assert(clean(value.id),'INVALID_TOOL_ARGS','deleteRecord.id is required.');break;
    case 'updateGoal': assert(clean(value.goal),'INVALID_TOOL_ARGS','updateGoal.goal is required.');break;
    default: break;
  }
  return clone(value);
}

function normalizeToolCall(call,{idFactory=defaultId}={}){
  assert(object(call),'INVALID_TOOL_CALL');
  const tool=clean(call.tool);assert(ALL_TOOLS.has(tool),'TOOL_NOT_ALLOWED',`Tool ${tool||'(empty)'} is not allowed.`);
  const write=WRITE_SET.has(tool),args=validateArgs(tool,call.args);
  return {
    id:clean(call.id)||idFactory('tool'),
    tool,
    args,
    kind:write?'write':'read',
    status:write?'proposal':'ready',
    requiresConfirmation:write,
    reason:clean(call.reason)||null
  };
}

function createRequest({message,context={},language='ko',conversationId=null,requestId=null},{idFactory=defaultId,clock=defaultClock}={}){
  const text=clean(message);assert(text,'INVALID_MESSAGE','message is required.');assert(text.length<=4000,'MESSAGE_TOO_LONG');assert(object(context),'INVALID_CONTEXT');
  const languageCode=lang(language);
  return {
    contractVersion:CONTRACT_VERSION,
    requestId:requestId||idFactory('agent_req'),
    conversationId:conversationId||null,
    createdAt:clock().toISOString(),
    language:languageCode,
    locale:languageCode==='en'?'en-US':'ko-KR',
    message:text,
    context:clone(context),
    capabilities:{readTools:[...READ_TOOLS],writeTools:[...WRITE_TOOLS]},
    policy:{writeRequiresConfirmation:true,noSilentMutation:true,providerMustRespectLanguage:true}
  };
}

function validateResponse(raw,request,{idFactory=defaultId}={}){
  assert(object(raw),'INVALID_AGENT_RESPONSE');
  const answer=clean(raw.answer);assert(answer,'INVALID_AGENT_RESPONSE','answer is required.');
  const calls=Array.isArray(raw.toolCalls)?raw.toolCalls:[];assert(calls.length<=8,'TOO_MANY_TOOL_CALLS');
  const seen=new Set(),toolCalls=calls.map(call=>{
    const normalized=normalizeToolCall(call,{idFactory});assert(!seen.has(normalized.id),'DUPLICATE_TOOL_CALL_ID');seen.add(normalized.id);return normalized;
  });
  return {
    contractVersion:CONTRACT_VERSION,
    requestId:request?.requestId||clean(raw.requestId)||null,
    language:request?.language||lang(raw.language),
    answer,
    toolCalls,
    meta:object(raw.meta)?clone(raw.meta):{}
  };
}

function readFromState(tool,state){
  const s=object(state)?state:{};
  switch(tool){
    case 'getWorkoutHistory':return Array.isArray(s.workouts)?s.workouts:[];
    case 'getNutritionHistory':return Array.isArray(s.meals)?s.meals:[];
    case 'getRunningHistory':return Array.isArray(s.runs)?s.runs:[];
    case 'getBodyTrend':return Array.isArray(s.body)?s.body:[];
    case 'getPlanner':return Array.isArray(s.planner)?s.planner:[];
    case 'getMemory':return Array.isArray(s.memory?.entries)?s.memory.entries.filter(x=>x?.userConfirmed!==false&&(!x?.expiresAt||Date.parse(x.expiresAt)>Date.now())):[];
    case 'getPerformanceScore':return s.performanceScore||s.performance||null;
    default:throw new AgentContractError('TOOL_NOT_ALLOWED');
  }
}

function createMockAdapter({idFactory=defaultId}={}){
  return Object.freeze({
    name:'garang-mock-agent-v1',
    async respond(request){
      assert(request?.contractVersion===CONTRACT_VERSION,'CONTRACT_VERSION_MISMATCH');
      const en=request.language==='en',q=request.message.toLowerCase();
      const toolCalls=[];
      const addRead=(tool,reason)=>toolCalls.push({id:idFactory('mock_read'),tool,args:{},reason});
      const addWrite=(tool,args,reason)=>toolCalls.push({id:idFactory('mock_write'),tool,args,reason});
      let answer=en?'I reviewed the available GARANG context.':'GARANG이 현재 사용 가능한 컨텍스트를 확인했습니다.';

      if(/plan|schedule|계획|플래너/.test(q)){
        addRead('getPlanner',en?'Review the current planner before proposing a change.':'변경 제안 전 현재 플래너를 확인합니다.');
        addWrite('createPlan',{title:en?'Recovery-focused session':'회복 중심 세션',type:'recovery'},en?'This is a proposal only and requires user approval.':'사용자 승인이 필요한 제안입니다.');
        answer=en?'I can propose a recovery-focused plan. Nothing will be saved until you approve it.':'회복 중심 계획을 제안할 수 있습니다. 승인하기 전에는 아무것도 저장하지 않습니다.';
      }else if(/goal|목표/.test(q)){
        addWrite('updateGoal',{goal:en?'Improve performance':'퍼포먼스 향상'},en?'Goal changes require explicit approval.':'목표 변경은 명시적인 승인이 필요합니다.');
        answer=en?'I prepared a goal-change proposal. It will not be applied until you approve it.':'목표 변경 제안을 준비했습니다. 승인 전에는 적용되지 않습니다.';
      }else if(/nutrition|protein|meal|식단|단백질|식사/.test(q)){
        addRead('getNutritionHistory',en?'Use saved nutrition records.':'저장된 식단 기록을 사용합니다.');
        answer=en?'I would read your saved nutrition history before making a recommendation.':'추천 전에 저장된 식단 기록을 읽도록 구성되어 있습니다.';
      }else if(/run|running|러닝/.test(q)){
        addRead('getRunningHistory',en?'Use saved running records.':'저장된 러닝 기록을 사용합니다.');
        answer=en?'I would read your saved running history before making a recommendation.':'추천 전에 저장된 러닝 기록을 읽도록 구성되어 있습니다.';
      }else if(/recovery|body|회복|체성분|몸/.test(q)){
        addRead('getBodyTrend',en?'Review body trend data.':'체성분 추세를 확인합니다.');
        addRead('getMemory',en?'Use confirmed relevant memory only.':'확정된 관련 기억만 사용합니다.');
        answer=en?'I would combine body trend data with confirmed memory before judging recovery.':'회복 판단 전에 체성분 추세와 확정된 기억을 함께 사용하도록 구성되어 있습니다.';
      }else if(/workout|training|운동|훈련|recent|최근/.test(q)){
        addRead('getWorkoutHistory',en?'Use saved workout records.':'저장된 운동 기록을 사용합니다.');
        answer=en?'I would read your saved workout history before judging the next training action.':'다음 훈련 행동을 판단하기 전에 저장된 운동 기록을 읽도록 구성되어 있습니다.';
      }
      return {contractVersion:CONTRACT_VERSION,requestId:request.requestId,language:request.language,answer,toolCalls,meta:{provider:'mock',synthetic:true}};
    }
  });
}

function createSession({getState=()=>({}),readTool=null,applyWrite=()=>null,idFactory=defaultId,clock=defaultClock}={}){
  const proposals=new Map(),audit=[];
  const read=(tool,args)=>{
    assert(READ_SET.has(tool),'TOOL_NOT_ALLOWED');
    const result=typeof readTool==='function'?readTool(tool,clone(args||{})):readFromState(tool,getState());
    return clone(result);
  };
  return Object.freeze({
    contractVersion:CONTRACT_VERSION,
    audit,
    async run(input,{adapter=createMockAdapter({idFactory})}={}){
      const request=input?.contractVersion===CONTRACT_VERSION?clone(input):createRequest(input||{},{idFactory,clock});
      assert(adapter&&typeof adapter.respond==='function','INVALID_ADAPTER');
      const raw=await adapter.respond(clone(request));
      const response=validateResponse(raw,request,{idFactory}),reads=[],pending=[];
      for(const call of response.toolCalls){
        if(call.kind==='read'){
          const result=read(call.tool,call.args);reads.push({call:clone(call),result});audit.push({event:'read_executed',callId:call.id,tool:call.tool,at:clock().toISOString()});
        }else{
          const proposal={...clone(call),status:'pending',createdAt:clock().toISOString()};proposals.set(proposal.id,proposal);pending.push(clone(proposal));audit.push({event:'write_proposed',callId:proposal.id,tool:proposal.tool,at:proposal.createdAt});
        }
      }
      return {request,response,reads,proposals:pending};
    },
    confirm(proposalId,approved){
      const proposal=proposals.get(proposalId);assert(proposal,'PROPOSAL_NOT_FOUND');assert(proposal.status==='pending','PROPOSAL_ALREADY_RESOLVED');
      proposal.status=approved?'confirmed':'rejected';proposal.resolvedAt=clock().toISOString();
      let result=null;if(approved)result=applyWrite(proposal.tool,clone(proposal.args));
      audit.push({event:proposal.status==='confirmed'?'write_confirmed':'write_rejected',callId:proposal.id,tool:proposal.tool,at:proposal.resolvedAt});
      return {proposal:clone(proposal),result:clone(result)};
    },
    getProposal(id){const proposal=proposals.get(id);return proposal?clone(proposal):null;}
  });
}

return Object.freeze({CONTRACT_VERSION,READ_TOOLS,WRITE_TOOLS,AgentContractError,createRequest,validateResponse,normalizeToolCall,createMockAdapter,createSession,readFromState});
});
