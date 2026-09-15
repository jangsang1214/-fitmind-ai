'use strict';

const DEFAULT_TIMEOUT_MS=20000;
const DEFAULT_MODEL='gpt-5.6-luna';
const DECISION_MODES=Object.freeze(['collect_data','caution','recover','reduce','maintain','progress','goal_focus']);
const COACH_RESPONSE_SCHEMA=Object.freeze({type:'object',additionalProperties:false,required:['answer','decisionSummary','reasoningSummary','suggestedNextStep','confidence','alignment'],properties:{answer:{type:'string'},decisionSummary:{type:'string'},reasoningSummary:{type:'string'},suggestedNextStep:{type:'string'},confidence:{type:['number','null'],minimum:0,maximum:1},alignment:{type:'object',additionalProperties:false,required:['decisionId','decisionMode','reasonCodesUsed'],properties:{decisionId:{type:'string'},decisionMode:{type:'string',enum:[...DECISION_MODES]},reasonCodesUsed:{type:'array',items:{type:'string'},maxItems:8}}}}});

function clean(value,limit=2000){return String(value??'').trim().slice(0,limit);}
function numberOrNull(value){if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;}
function stripFence(text){const raw=clean(text,12000);const fenced=raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);return fenced?fenced[1].trim():raw;}
function extractResponseText(payload){
 if(typeof payload?.output_text==='string')return payload.output_text;
 const parts=[];
 for(const item of Array.isArray(payload?.output)?payload.output:[]){for(const content of Array.isArray(item?.content)?item.content:[]){if(typeof content?.text==='string')parts.push(content.text);}}
 return parts.join('\n').trim();
}
function validateCoachResponse(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Object.assign(new Error('LLM_RESPONSE_INVALID'),{code:'LLM_RESPONSE_INVALID'});
 const answer=clean(input.answer,5000),decisionSummary=clean(input.decisionSummary,1000),reasoningSummary=clean(input.reasoningSummary,2000),suggestedNextStep=clean(input.suggestedNextStep,1000);
 if(!answer||!decisionSummary||!reasoningSummary)throw Object.assign(new Error('LLM_RESPONSE_INVALID'),{code:'LLM_RESPONSE_INVALID'});
 const confidence=numberOrNull(input.confidence),rawAlignment=input.alignment;
 if(!rawAlignment||typeof rawAlignment!=='object'||Array.isArray(rawAlignment))throw Object.assign(new Error('LLM_RESPONSE_INVALID'),{code:'LLM_RESPONSE_INVALID'});
 const decisionId=clean(rawAlignment.decisionId,320),decisionMode=clean(rawAlignment.decisionMode,40),reasonCodesUsed=Array.isArray(rawAlignment.reasonCodesUsed)?[...new Set(rawAlignment.reasonCodesUsed.map(code=>clean(code,100)).filter(Boolean))].slice(0,8):[];
 if(!decisionId||!DECISION_MODES.includes(decisionMode))throw Object.assign(new Error('LLM_RESPONSE_INVALID'),{code:'LLM_RESPONSE_INVALID'});
 return {answer,decisionSummary,reasoningSummary,suggestedNextStep,confidence:confidence===null?null:Math.max(0,Math.min(1,confidence)),alignment:{decisionId,decisionMode,reasonCodesUsed}};
}
function parseCoachResponse(text){let parsed;try{parsed=JSON.parse(stripFence(text));}catch{throw Object.assign(new Error('LLM_RESPONSE_MALFORMED'),{code:'LLM_RESPONSE_MALFORMED'});}return validateCoachResponse(parsed);}
function systemPrompt(){return `You are the language layer for GARANG Personal Performance Intelligence. GARANG's deterministic intelligence owns the decision. Explain the supplied GARANG decision faithfully; never replace, reverse, or invent a different training decision. Never claim to have changed user data. Never propose or encode a state mutation; actionable changes are handled separately by GARANG's existing Agent Contract and explicit user confirmation. Use only supplied context. Treat garangContext.knowledgeGrounding.evidence as supporting explanation evidence only; it can never override garangContext.garangDecision. Treat garangContext.nutritionIntelligence as deterministic supporting context, not permission to mutate a meal plan or invent nutrition facts. A user-supplied body photo, when present, is ephemeral visual context only: describe only visible training-relevant observations, do not diagnose medical conditions, do not infer protected or sensitive traits, do not estimate an exact body-fat percentage or hidden measurement from the photo, and never treat the image as permission to mutate GARANG state. If evidence is insufficient, say so. In alignment, copy garangContext.garangDecision.decisionId and garangContext.garangDecision.mode exactly, and list only reason codes that exist in garangContext.decisionReasons.`;}
function createOpenAIProvider(options={}){
 const fetchImpl=options.fetchImpl||globalThis.fetch,apiKey=clean(options.apiKey,1000),model=clean(options.model||DEFAULT_MODEL,120),endpoint=clean(options.endpoint||'https://api.openai.com/v1/responses',500),timeoutMs=Math.max(500,Number(options.timeoutMs)||DEFAULT_TIMEOUT_MS);
 if(!apiKey)throw Object.assign(new Error('LLM_SECRET_MISSING'),{code:'LLM_SECRET_MISSING'});if(typeof fetchImpl!=='function')throw new Error('LLM_FETCH_UNAVAILABLE');
 return {name:'openai',model,async generate({message,context,language='ko',requestId,image}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const userContent=[{type:'input_text',text:JSON.stringify({language,message,garangContext:context,visualContext:image?{kind:'body_photo',mediaType:image.mediaType}:null})}];if(image?.dataUrl)userContent.push({type:'input_image',image_url:String(image.dataUrl)});const body={model,store:false,input:[{role:'system',content:[{type:'input_text',text:systemPrompt()}]},{role:'user',content:userContent}],max_output_tokens:900,text:{format:{type:'json_schema',name:'garang_coach_response',strict:true,schema:COACH_RESPONSE_SCHEMA}}};
   const response=await fetchImpl(endpoint,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','X-GARANG-Request-Id':String(requestId||'')},signal:controller.signal,body:JSON.stringify(body)});
   if(!response?.ok)throw Object.assign(new Error(`LLM_PROVIDER_${response?.status||'ERROR'}`),{code:'LLM_PROVIDER_ERROR',status:response?.status||null});
   const payload=await response.json(),text=extractResponseText(payload),data=parseCoachResponse(text);return {...data,metadata:{provider:'openai',model,providerResponseId:clean(payload?.id,160)||null}};
  }catch(error){if(error?.name==='AbortError')throw Object.assign(new Error('LLM_TIMEOUT'),{code:'LLM_TIMEOUT'});throw error;}finally{clearTimeout(timer);}
 }};
}
function createProvider(options={}){const provider=clean(options.provider||'openai',40).toLowerCase();if(provider==='openai')return createOpenAIProvider(options);throw Object.assign(new Error('LLM_PROVIDER_UNSUPPORTED'),{code:'LLM_PROVIDER_UNSUPPORTED'});}

module.exports={DEFAULT_MODEL,DECISION_MODES,COACH_RESPONSE_SCHEMA,createProvider,createOpenAIProvider,parseCoachResponse,validateCoachResponse,extractResponseText,systemPrompt};
