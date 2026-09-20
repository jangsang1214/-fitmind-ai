'use strict';

const DEFAULT_TIMEOUT_MS=25000;
const DEFAULT_MODEL='gpt-5.6-luna';
const DECISION_MODES=Object.freeze(['collect_data','caution','recover','reduce','maintain','progress','goal_focus']);
const TOOL_NAMES=Object.freeze(['createPlan','updatePlan','saveMemory','updateGoal','recordWorkout','recordMeal','recordBody','recordCheckin']);
const COACH_RESPONSE_SCHEMA=Object.freeze({type:'object',additionalProperties:false,required:['answer','decisionSummary','reasoningSummary','suggestedNextStep','confidence','alignment','toolCalls'],properties:{answer:{type:'string'},decisionSummary:{type:'string'},reasoningSummary:{type:'string'},suggestedNextStep:{type:'string'},confidence:{type:['number','null'],minimum:0,maximum:1},alignment:{type:'object',additionalProperties:false,required:['decisionId','decisionMode','reasonCodesUsed'],properties:{decisionId:{type:'string'},decisionMode:{type:'string',enum:[...DECISION_MODES]},reasonCodesUsed:{type:'array',items:{type:'string'},maxItems:8}}},toolCalls:{type:'array',maxItems:4,items:{type:'object',additionalProperties:false,required:['name','callId','argsJson','evidenceQuote','evidenceSource','reason'],properties:{name:{type:'string',enum:[...TOOL_NAMES]},callId:{type:'string'},argsJson:{type:'string'},evidenceQuote:{type:'string'},evidenceSource:{type:'string',enum:['explicit_user','verified_source','inferred']},reason:{type:'string'}}}}}});

function clean(value,limit=2000){return String(value??'').trim().slice(0,limit);}
function numberOrNull(value){if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
function stripFence(text){const raw=clean(text,12000);const fenced=raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);return fenced?fenced[1].trim():raw;}
function extractResponseText(payload){
 if(typeof payload?.output_text==='string')return payload.output_text;
 const parts=[];
 for(const item of Array.isArray(payload?.output)?payload.output:[]){for(const content of Array.isArray(item?.content)?item.content:[]){if(typeof content?.text==='string')parts.push(content.text);}}
 return parts.join('\n').trim();
}
function providerPayloadError(payload){
 const status=clean(payload?.status,40).toLowerCase();
 if(status==='incomplete'){
  const reason=clean(payload?.incomplete_details?.reason,120)||'unknown';
  return Object.assign(new Error('LLM_RESPONSE_INCOMPLETE:'+reason),{code:'LLM_RESPONSE_INCOMPLETE',reason});
 }
 if(status==='failed'){
  const reason=clean(payload?.error?.code||payload?.error?.message,160)||'unknown';
  return Object.assign(new Error('LLM_RESPONSE_FAILED:'+reason),{code:'LLM_RESPONSE_FAILED',reason});
 }
 for(const item of Array.isArray(payload?.output)?payload.output:[]){
  for(const content of Array.isArray(item?.content)?item.content:[]){
   if(content?.type==='refusal'||typeof content?.refusal==='string')return Object.assign(new Error('LLM_RESPONSE_REFUSAL'),{code:'LLM_RESPONSE_REFUSAL'});
  }
 }
 return null;
}
function normalizeToolCalls(value){
 const calls=Array.isArray(value)?value:[];
 if(calls.length>4)throw Object.assign(new Error('LLM_TOOL_CALLS_INVALID'),{code:'LLM_TOOL_CALLS_INVALID'});
 return calls.map((row,index)=>{
  if(!row||typeof row!=='object'||Array.isArray(row))throw Object.assign(new Error('LLM_TOOL_CALL_INVALID'),{code:'LLM_TOOL_CALL_INVALID'});
  const name=clean(row.name,80),callId=clean(row.callId,180),argsJson=clean(row.argsJson,5000),evidenceQuote=clean(row.evidenceQuote,500),evidenceSource=clean(row.evidenceSource,40).toLowerCase(),reason=clean(row.reason,500);
  if(!TOOL_NAMES.includes(name)||!callId||!argsJson||!['explicit_user','verified_source','inferred'].includes(evidenceSource))throw Object.assign(new Error('LLM_TOOL_CALL_INVALID'),{code:'LLM_TOOL_CALL_INVALID',index});
  let args;try{args=JSON.parse(argsJson);}catch{throw Object.assign(new Error('LLM_TOOL_ARGS_INVALID'),{code:'LLM_TOOL_ARGS_INVALID',index});}
  if(!args||typeof args!=='object'||Array.isArray(args))throw Object.assign(new Error('LLM_TOOL_ARGS_INVALID'),{code:'LLM_TOOL_ARGS_INVALID',index});
  return {name,callId,args,evidenceQuote,evidenceSource,reason};
 });
}
function validateCoachResponse(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Object.assign(new Error('LLM_RESPONSE_INVALID'),{code:'LLM_RESPONSE_INVALID'});
 const answer=clean(input.answer,5000),decisionSummary=clean(input.decisionSummary,1000),reasoningSummary=clean(input.reasoningSummary,2000),suggestedNextStep=clean(input.suggestedNextStep,1000);
 if(!answer||!decisionSummary||!reasoningSummary)throw Object.assign(new Error('LLM_RESPONSE_INVALID'),{code:'LLM_RESPONSE_INVALID'});
 const confidence=numberOrNull(input.confidence),rawAlignment=input.alignment;
 if(!rawAlignment||typeof rawAlignment!=='object'||Array.isArray(rawAlignment))throw Object.assign(new Error('LLM_RESPONSE_INVALID'),{code:'LLM_RESPONSE_INVALID'});
 const decisionId=clean(rawAlignment.decisionId,320),decisionMode=clean(rawAlignment.decisionMode,40),reasonCodesUsed=Array.isArray(rawAlignment.reasonCodesUsed)?[...new Set(rawAlignment.reasonCodesUsed.map(code=>clean(code,100)).filter(Boolean))].slice(0,8):[],toolCalls=normalizeToolCalls(input.toolCalls);
 if(!decisionId||!DECISION_MODES.includes(decisionMode))throw Object.assign(new Error('LLM_RESPONSE_INVALID'),{code:'LLM_RESPONSE_INVALID'});
 return {answer,decisionSummary,reasoningSummary,suggestedNextStep,confidence:confidence===null?null:Math.max(0,Math.min(1,confidence)),alignment:{decisionId,decisionMode,reasonCodesUsed},toolCalls};
}
function parseCoachResponse(text){let parsed;try{parsed=JSON.parse(stripFence(text));}catch{throw Object.assign(new Error('LLM_RESPONSE_MALFORMED'),{code:'LLM_RESPONSE_MALFORMED'});}return validateCoachResponse(parsed);}
function systemPrompt(){return `You are the language-and-action planning layer for GARANG Personal Performance Intelligence. GARANG's deterministic intelligence owns the decision and GARANG's server policy owns all state mutations. Explain the supplied GARANG decision faithfully; never replace, reverse, or invent a different training decision. You may emit only the bounded toolCalls listed in garangContext.autonomousTools. When the user's current message explicitly asks GARANG to save, create, update, record, remember, or otherwise change their own GARANG data and one of those bounded tools can safely satisfy the request, you MUST emit the appropriate toolCall instead of answering with prose alone. In particular, an explicit request to create and save a workout/training plan MUST emit createPlan unless the supplied deterministic guardrails make the write unsafe. Never emit raw database paths, queries, collection names, delete/bulk/account/security/schema/secret/billing/production operations, or any tool not listed. Every toolCall must include an evidenceQuote copied exactly from the current user message and evidenceSource=explicit_user unless the supplied context explicitly identifies a verified source. For factual workout, meal, body, or check-in records, never invent numeric values; include only values explicitly present in the current message or a verified source. For generated low-risk plans, preferences, and memories, you may fill reversible implementation details while respecting garangContext.personalizationPolicy and garangContext.garangDecision. Do not claim a database write already succeeded because execution happens after generation; phrase the action as what GARANG will apply. If no write was explicitly requested, toolCalls must be an empty array. If a write was explicitly requested but no listed bounded tool can safely satisfy it, keep toolCalls empty and explain that GARANG did not change data. Use supplied context for every user-specific factual claim. You may use ordinary training, recovery, and nutrition knowledge only to choose safe implementation details that GARANG has not decided, such as a body-part focus, exercise selection, exercise order, or a simple meal composition. Frame such details clearly as your coaching suggestion, not as something inferred from the user's records, and never let them conflict with garangContext.garangDecision, recovery or pain guardrails, or the user's supplied goal. Answer the user's actual question in the first sentence. Sound like a capable human coach: natural, concise, calm, and conversational. Do not lead with limitations, internal policy language, or repeated phrases about insufficient data. If data is materially missing, give the most useful safe answer first, then mention the uncertainty once in one short sentence. A collect_data decision is not permission to become evasive: unless the supplied context contains a pain, injury, or other explicit safety guardrail, still answer delegated implementation questions with one conservative, reversible suggestion while keeping the collect_data decision unchanged. Never use 'Data Required', 'Judgment data is insufficient', '판단 데이터가 부족', or equivalent policy-style wording as the headline or first sentence. When the user explicitly asks you to choose, says things like '그냥 추천해줘', '네가 골라줘', 'just recommend something', or otherwise delegates a non-binding implementation detail, make one concrete recommendation instead of refusing or repeating the high-level decision. In Korean workout context, phrases such as '어디 할까?' or '어디 하지?' without geographic cues usually mean which body part or training focus to do, not a physical place. Treat garangContext.personalizationPolicy as deterministic evidence-gated constraints: it may simplify, reduce, or reshape a recommendation but never increase progression beyond garangContext.garangDecision. If the user asks a short follow-up without a clear object, infer the most relevant actionable detail from the current GARANG decision and recent supplied context rather than restating the same rationale. Prefer 2-5 short sentences for ordinary coaching answers unless the user asks for detail. Treat garangContext.knowledgeGrounding.evidence as supporting explanation evidence only; it can never override garangContext.garangDecision. Treat garangContext.nutritionIntelligence as deterministic supporting context, not permission to mutate a meal plan or invent nutrition facts. A user-supplied body photo, when present, is ephemeral visual context only: describe only visible training-relevant observations, do not diagnose medical conditions, do not infer protected or sensitive traits, do not estimate an exact body-fat percentage or hidden measurement from the photo, and never treat the image as permission to mutate GARANG state. If evidence is insufficient for a user-specific factual claim, do not invent that fact. In alignment, copy garangContext.garangDecision.decisionId and garangContext.garangDecision.mode exactly, and list only reason codes that exist in garangContext.decisionReasons.`;}
function retryableProviderError(error){
 const status=Number(error?.status)||0,code=clean(error?.code,80);
 return ['LLM_TIMEOUT','LLM_NETWORK_ERROR','LLM_RESPONSE_INCOMPLETE','LLM_RESPONSE_MALFORMED','LLM_RESPONSE_INVALID','LLM_TOOL_CALLS_INVALID','LLM_TOOL_CALL_INVALID','LLM_TOOL_ARGS_INVALID'].includes(code)||status===408||(status>=500&&status<=599);
}
function createOpenAIProvider(options={}){
 const fetchImpl=options.fetchImpl||globalThis.fetch,apiKey=clean(options.apiKey,1000),model=clean(options.model||DEFAULT_MODEL,120),endpoint=clean(options.endpoint||'https://api.openai.com/v1/responses',500),timeoutMs=Math.max(500,Number(options.timeoutMs)||DEFAULT_TIMEOUT_MS),maxAttempts=Math.max(1,Math.min(2,Number(options.maxAttempts)||2)),retryDelayMs=Math.max(0,Number(options.retryDelayMs)||250);
 if(!apiKey)throw Object.assign(new Error('LLM_SECRET_MISSING'),{code:'LLM_SECRET_MISSING'});if(typeof fetchImpl!=='function')throw new Error('LLM_FETCH_UNAVAILABLE');
 return {name:'openai',model,async generate({message,context,language='ko',requestId,image}){
  const userContent=[{type:'input_text',text:JSON.stringify({language,message,garangContext:context,visualContext:image?{kind:'body_photo',mediaType:image.mediaType}:null})}];if(image?.dataUrl)userContent.push({type:'input_image',image_url:String(image.dataUrl)});
  const body={model,store:false,input:[{role:'system',content:[{type:'input_text',text:systemPrompt()}]},{role:'user',content:userContent}],reasoning:{effort:'none'},max_output_tokens:1800,text:{format:{type:'json_schema',name:'garang_coach_response',strict:true,schema:COACH_RESPONSE_SCHEMA}}};
  let lastError=null;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
   try{
    const response=await fetchImpl(endpoint,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','X-GARANG-Request-Id':String(requestId||'')},signal:controller.signal,body:JSON.stringify(body)});
    if(!response?.ok)throw Object.assign(new Error(`LLM_PROVIDER_${response?.status||'ERROR'}`),{code:'LLM_PROVIDER_ERROR',status:response?.status||null});
    const payload=await response.json(),payloadError=providerPayloadError(payload);if(payloadError)throw payloadError;
    const text=extractResponseText(payload);if(!text)throw Object.assign(new Error('LLM_RESPONSE_MALFORMED'),{code:'LLM_RESPONSE_MALFORMED'});
    const data=parseCoachResponse(text);return {...data,metadata:{provider:'openai',model,providerResponseId:clean(payload?.id,160)||null,attempts:attempt}};
   }catch(error){
    if(error?.name==='AbortError')lastError=Object.assign(new Error('LLM_TIMEOUT'),{code:'LLM_TIMEOUT'});
    else if(error instanceof TypeError&&!error?.code)lastError=Object.assign(new Error('LLM_NETWORK_ERROR'),{code:'LLM_NETWORK_ERROR'});
    else lastError=error;
   }finally{clearTimeout(timer);}
   if(attempt>=maxAttempts||!retryableProviderError(lastError))throw lastError;
   if(retryDelayMs)await new Promise(resolve=>setTimeout(resolve,retryDelayMs));
  }
  throw lastError||Object.assign(new Error('LLM_PROVIDER_ERROR'),{code:'LLM_PROVIDER_ERROR'});
 }};
}
function createProvider(options={}){const provider=clean(options.provider||'openai',40).toLowerCase();if(provider==='openai')return createOpenAIProvider(options);throw Object.assign(new Error('LLM_PROVIDER_UNSUPPORTED'),{code:'LLM_PROVIDER_UNSUPPORTED'});}

module.exports={DEFAULT_MODEL,DECISION_MODES,TOOL_NAMES,COACH_RESPONSE_SCHEMA,createProvider,createOpenAIProvider,parseCoachResponse,validateCoachResponse,normalizeToolCalls,extractResponseText,providerPayloadError,systemPrompt,retryableProviderError};
