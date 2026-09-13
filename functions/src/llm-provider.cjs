'use strict';

const DEFAULT_TIMEOUT_MS=8000;
const DEFAULT_MODEL='gpt-5.6-luna';
const ALLOWED_ACTIONS=new Set(['none','createPlan','updatePlan','askFollowup']);

function clean(value,limit=2000){return String(value??'').trim().slice(0,limit);}
function numberOrNull(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function stripFence(text){const raw=clean(text,12000);const fenced=raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);return fenced?fenced[1].trim():raw;}
function extractResponseText(payload){
 if(typeof payload?.output_text==='string')return payload.output_text;
 const parts=[];
 for(const item of Array.isArray(payload?.output)?payload.output:[]){
  for(const content of Array.isArray(item?.content)?item.content:[]){
   if(typeof content?.text==='string')parts.push(content.text);
  }
 }
 return parts.join('\n').trim();
}
function validateCoachResponse(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Object.assign(new Error('LLM_RESPONSE_INVALID'),{code:'LLM_RESPONSE_INVALID'});
 const answer=clean(input.answer,5000),decisionSummary=clean(input.decisionSummary,1000),reasoningSummary=clean(input.reasoningSummary,2000),suggestedNextStep=clean(input.suggestedNextStep,1000);
 if(!answer||!decisionSummary||!reasoningSummary)throw Object.assign(new Error('LLM_RESPONSE_INVALID'),{code:'LLM_RESPONSE_INVALID'});
 const requested=clean(input.actionIntent?.type||input.actionIntent||'none',40),type=ALLOWED_ACTIONS.has(requested)?requested:'none';
 const confidence=numberOrNull(input.confidence);
 return {answer,decisionSummary,reasoningSummary,suggestedNextStep,actionIntent:{type},confidence:confidence===null?null:Math.max(0,Math.min(1,confidence))};
}
function parseCoachResponse(text){
 let parsed;try{parsed=JSON.parse(stripFence(text));}catch{throw Object.assign(new Error('LLM_RESPONSE_MALFORMED'),{code:'LLM_RESPONSE_MALFORMED'});}
 return validateCoachResponse(parsed);
}
function systemPrompt(){return `You are the language/orchestration layer for GARANG Personal Performance Intelligence. GARANG's deterministic intelligence owns the decision. You must explain the supplied GARANG decision faithfully and must not replace, reverse, or invent a different training decision. Never claim to have changed user data. Never instruct direct database writes. Action intent is advisory only and requires a separate user confirmation through GARANG's Agent Contract. Use only supplied context. If evidence is insufficient, say so. Respond with JSON only using keys: answer, decisionSummary, reasoningSummary, suggestedNextStep, actionIntent:{type}, confidence. actionIntent.type must be one of none, createPlan, updatePlan, askFollowup.`;}
function createOpenAIProvider(options={}){
 const fetchImpl=options.fetchImpl||globalThis.fetch,apiKey=clean(options.apiKey,1000),model=clean(options.model||DEFAULT_MODEL,120),endpoint=clean(options.endpoint||'https://api.openai.com/v1/responses',500),timeoutMs=Math.max(500,Number(options.timeoutMs)||DEFAULT_TIMEOUT_MS);
 if(!apiKey)throw Object.assign(new Error('LLM_SECRET_MISSING'),{code:'LLM_SECRET_MISSING'});
 if(typeof fetchImpl!=='function')throw new Error('LLM_FETCH_UNAVAILABLE');
 return {name:'openai',model,async generate({message,context,language='ko',requestId}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetchImpl(endpoint,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','X-GARANG-Request-Id':String(requestId||'')},signal:controller.signal,body:JSON.stringify({model,input:[{role:'system',content:[{type:'input_text',text:systemPrompt()}]},{role:'user',content:[{type:'input_text',text:JSON.stringify({language,message,garangContext:context})}]}],max_output_tokens:900})});
   if(!response?.ok)throw Object.assign(new Error(`LLM_PROVIDER_${response?.status||'ERROR'}`),{code:'LLM_PROVIDER_ERROR',status:response?.status||null});
   const payload=await response.json(),text=extractResponseText(payload),data=parseCoachResponse(text);
   return {...data,metadata:{provider:'openai',model,providerResponseId:clean(payload?.id,160)||null}};
  }catch(error){
   if(error?.name==='AbortError')throw Object.assign(new Error('LLM_TIMEOUT'),{code:'LLM_TIMEOUT'});
   throw error;
  }finally{clearTimeout(timer);}
 }};
}
function createProvider(options={}){
 const provider=clean(options.provider||'openai',40).toLowerCase();
 if(provider==='openai')return createOpenAIProvider(options);
 throw Object.assign(new Error('LLM_PROVIDER_UNSUPPORTED'),{code:'LLM_PROVIDER_UNSUPPORTED'});
}

module.exports={DEFAULT_MODEL,createProvider,createOpenAIProvider,parseCoachResponse,validateCoachResponse,extractResponseText};
