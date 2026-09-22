'use strict';

const {parseBearer}=require('./agent-context.cjs');
const {extractResponseText,providerPayloadError,retryableProviderError}=require('./llm-provider.cjs');

const DEFAULT_MODEL='gpt-5.6-luna';
const MAX_ITEMS=6;
const MAX_NAME=100;
const WEB_NUTRITION_SCHEMA=Object.freeze({
 type:'object',additionalProperties:false,required:['items'],properties:{
  items:{type:'array',minItems:0,maxItems:MAX_ITEMS,items:{
   type:'object',additionalProperties:false,
   required:['inputIndex','matchedName','kcal','protein','carbs','fat','confidence','sourceUrl','sourceTitle','sourceType','basisNote'],
   properties:{
    inputIndex:{type:'integer',minimum:0,maximum:MAX_ITEMS-1},
    matchedName:{type:'string',minLength:1,maxLength:100},
    kcal:{type:'number',minimum:0,maximum:10000},
    protein:{type:'number',minimum:0,maximum:2000},
    carbs:{type:'number',minimum:0,maximum:3000},
    fat:{type:'number',minimum:0,maximum:2000},
    confidence:{type:'number',minimum:0,maximum:1},
    sourceUrl:{type:'string',minLength:8,maxLength:500},
    sourceTitle:{type:'string',minLength:1,maxLength:180},
    sourceType:{type:'string',enum:['government','manufacturer','institutional']},
    basisNote:{type:'string',minLength:1,maxLength:240}
   }
  }}
 }
});

function clean(value,limit=500){return String(value??'').trim().slice(0,limit);}
function finite(value){const n=Number(value);return Number.isFinite(n)?n:null;}
function requestId(){return globalThis.crypto?.randomUUID?.()||`nutrition_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;}
function normalizeUrl(value){try{const u=new URL(String(value||''));u.hash='';u.searchParams.sort();return u.toString().replace(/\/$/,'');}catch{return '';}}
function collectCitationUrls(payload){
 const urls=new Set();
 for(const item of Array.isArray(payload?.output)?payload.output:[]){
  if(item?.type==='web_search_call'){
   for(const source of Array.isArray(item?.action?.sources)?item.action.sources:[]){
    const url=normalizeUrl(source?.url);if(url)urls.add(url);
   }
  }
  for(const content of Array.isArray(item?.content)?item.content:[]){
   for(const annotation of Array.isArray(content?.annotations)?content.annotations:[]){
    if(annotation?.type!=='url_citation')continue;
    const url=normalizeUrl(annotation?.url_citation?.url||annotation?.url);if(url)urls.add(url);
   }
  }
 }
 return [...urls];
}
function cited(url,citations){
 const target=normalizeUrl(url);if(!target)return false;
 return citations.some(candidate=>{
  if(candidate===target)return true;
  try{const a=new URL(candidate),b=new URL(target);return a.hostname===b.hostname&&a.pathname.replace(/\/$/,'')===b.pathname.replace(/\/$/,'');}catch{return false;}
 });
}
function blockedSource(url){
 try{
  const host=new URL(url).hostname.toLowerCase();
  return ['reddit.com','www.reddit.com','instagram.com','www.instagram.com','facebook.com','www.facebook.com','tiktok.com','www.tiktok.com','youtube.com','www.youtube.com','blog.naver.com','namu.wiki'].some(x=>host===x||host.endsWith(`.${x}`));
 }catch{return true;}
}
function normalizeLookupItems(value,input,citations){
 const rows=Array.isArray(value?.items)?value.items:[];
 const seen=new Set(),items=[],unresolved=[];
 for(const row of rows){
  const inputIndex=Number(row?.inputIndex);
  if(!Number.isInteger(inputIndex)||inputIndex<0||inputIndex>=input.length||seen.has(inputIndex))continue;
  const sourceUrl=normalizeUrl(row?.sourceUrl),confidence=finite(row?.confidence);
  const kcal=finite(row?.kcal),protein=finite(row?.protein),carbs=finite(row?.carbs),fat=finite(row?.fat);
  const values=[kcal,protein,carbs,fat],grams=input[inputIndex].grams;
  const implausible=values.some(v=>v===null||v<0)||kcal>Math.max(120,grams*10)||protein>grams*1.15||carbs>grams*1.15||fat>grams*1.15||(protein+carbs+fat)>grams*1.35;
  if(!sourceUrl||blockedSource(sourceUrl)||!cited(sourceUrl,citations)||confidence===null||confidence<0.55||implausible){
   unresolved.push({inputIndex,name:input[inputIndex].name,reason:'UNVERIFIED_WEB_RESULT'});seen.add(inputIndex);continue;
  }
  items.push({
   inputIndex,name:clean(row?.matchedName,MAX_NAME)||input[inputIndex].name,grams:input[inputIndex].grams,
   kcal,protein,carbs,fat,confidence:Math.max(0,Math.min(1,confidence)),
   nutritionStatus:'estimated_web',
   nutritionSource:{
    source:'web_search',provider:'OpenAI web_search',sourceType:clean(row?.sourceType,40),
    title:clean(row?.sourceTitle,180),url:sourceUrl,basis:clean(row?.basisNote,240)
   }
  });
  seen.add(inputIndex);
 }
 for(let i=0;i<input.length;i++)if(!seen.has(i))unresolved.push({inputIndex:i,name:input[i].name,reason:'NO_TRUSTWORTHY_SOURCE'});
 return {items,unresolved};
}
function parseInput(value){
 const rows=(Array.isArray(value)?value:[]).slice(0,MAX_ITEMS).map((row,index)=>{
  const name=clean(row?.name,MAX_NAME),grams=Math.max(5,Math.min(1500,Math.round(finite(row?.grams)??100)));
  const aliases=[...new Set((Array.isArray(row?.aliases)?row.aliases:[]).map(x=>clean(x,80)).filter(Boolean))].slice(0,5);
  if(!name)throw Object.assign(new Error('NUTRITION_LOOKUP_ITEM_INVALID'),{code:'NUTRITION_LOOKUP_ITEM_INVALID',inputIndex:index});
  return {name,aliases,grams};
 });
 if(!rows.length)throw Object.assign(new Error('NUTRITION_LOOKUP_ITEMS_REQUIRED'),{code:'NUTRITION_LOOKUP_ITEMS_REQUIRED'});
 return rows;
}
function systemPrompt(language='ko'){
 return `You are GARANG Nutrition Source Resolver. Search the live web for nutrition facts only when GARANG's internal food database could not match an identified meal item. Use one trustworthy primary source per item. Priority: official government food databases, the food or beverage manufacturer's official nutrition page, then reputable institutional nutrition databases. Never use blogs, forums, social media, user posts, SEO pages, crowdsourced wikis, or unsourced snippets. Return nutrition for the requested gram amount. If the source uses a serving size, scale only when the conversion is reasonable and explain the basis. Never fabricate a missing macro. If a trustworthy source with calories, protein, carbs, and fat cannot be found, omit that item. sourceUrl must be the exact URL you used from web search. Keep generic and branded products distinct. For zero-calorie or near-zero drinks, preserve legitimate zeros. Output language for labels: ${language==='en'?'English':'Korean'}. This is an estimate that requires user confirmation before GARANG saves it.`;
}
function createNutritionLookupProvider(options={}){
 const fetchImpl=options.fetchImpl||globalThis.fetch,apiKey=clean(options.apiKey,1000),model=clean(options.model||DEFAULT_MODEL,120),endpoint=clean(options.endpoint||'https://api.openai.com/v1/responses',500),timeoutMs=Math.max(1000,Number(options.timeoutMs)||25000),maxAttempts=Math.max(1,Math.min(2,Number(options.maxAttempts)||2));
 if(!apiKey)throw Object.assign(new Error('LLM_SECRET_MISSING'),{code:'LLM_SECRET_MISSING'});if(typeof fetchImpl!=='function')throw new Error('LLM_FETCH_UNAVAILABLE');
 return {name:'openai-web-search',model,async lookup({items,language='ko',requestId:id}){
  const body={
   model,store:false,
   tools:[{type:'web_search',search_context_size:'low',external_web_access:true,user_location:{type:'approximate',country:'KR',timezone:'Asia/Seoul'},filters:{blocked_domains:['reddit.com','quora.com','wikipedia.org','namu.wiki','blog.naver.com','instagram.com','facebook.com','tiktok.com','youtube.com']}}],
   tool_choice:'required',include:['web_search_call.action.sources'],reasoning:{effort:'low'},max_output_tokens:1400,
   input:[
    {role:'system',content:[{type:'input_text',text:systemPrompt(language)}]},
    {role:'user',content:[{type:'input_text',text:JSON.stringify({items:items.map((row,inputIndex)=>({inputIndex,...row}))})}]}
   ],
   text:{format:{type:'json_schema',name:'garang_nutrition_web_lookup',strict:true,schema:WEB_NUTRITION_SCHEMA}}
  };
  let lastError=null;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
   try{
    const response=await fetchImpl(endpoint,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','X-GARANG-Request-Id':String(id||'')},signal:controller.signal,body:JSON.stringify(body)});
    if(!response?.ok)throw Object.assign(new Error(`NUTRITION_LOOKUP_PROVIDER_${response?.status||'ERROR'}`),{code:'NUTRITION_LOOKUP_PROVIDER_ERROR',status:response?.status||null});
    const payload=await response.json(),payloadError=providerPayloadError(payload);if(payloadError)throw payloadError;
    const text=extractResponseText(payload);if(!text)throw Object.assign(new Error('NUTRITION_LOOKUP_RESPONSE_INVALID'),{code:'NUTRITION_LOOKUP_RESPONSE_INVALID'});
    let parsed;try{parsed=JSON.parse(text);}catch{throw Object.assign(new Error('NUTRITION_LOOKUP_RESPONSE_INVALID'),{code:'NUTRITION_LOOKUP_RESPONSE_INVALID'});}
    const citations=collectCitationUrls(payload),normalized=normalizeLookupItems(parsed,items,citations);
    return {...normalized,provider:'openai',model,attempts:attempt,citationCount:citations.length};
   }catch(error){
    if(error?.name==='AbortError')lastError=Object.assign(new Error('NUTRITION_LOOKUP_TIMEOUT'),{code:'NUTRITION_LOOKUP_TIMEOUT'});
    else if(error instanceof TypeError&&!error?.code)lastError=Object.assign(new Error('NUTRITION_LOOKUP_NETWORK_ERROR'),{code:'NUTRITION_LOOKUP_NETWORK_ERROR'});
    else lastError=error;
   }finally{clearTimeout(timer);}
   if(attempt>=maxAttempts||!retryableProviderError(lastError))throw lastError;
  }
  throw lastError||Object.assign(new Error('NUTRITION_LOOKUP_PROVIDER_ERROR'),{code:'NUTRITION_LOOKUP_PROVIDER_ERROR'});
 }};
}
function createNutritionLookupHandler(deps={}){
 const verifyIdToken=deps.verifyIdToken,consumeRateLimit=deps.consumeRateLimit||(async()=>({allowed:true})),providerFactory=deps.providerFactory||createNutritionLookupProvider,getProviderConfig=deps.getProviderConfig||(()=>({apiKey:process.env.GARANG_LLM_API_KEY||'',model:process.env.GARANG_NUTRITION_LOOKUP_MODEL||process.env.GARANG_LLM_MODEL||DEFAULT_MODEL})),clock=deps.clock||(()=>new Date());
 if(typeof verifyIdToken!=='function')throw new Error('NUTRITION_LOOKUP_DEPENDENCIES_REQUIRED');
 return async function nutritionLookup(request,response){
  if(String(request?.method||'POST').toUpperCase()!=='POST')return response.status(405).json({ok:false,error:{code:'METHOD_NOT_ALLOWED'}});
  const token=parseBearer(request?.headers?.authorization||request?.get?.('authorization'));if(!token)return response.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  let decoded;try{decoded=await verifyIdToken(token);}catch{return response.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'});}
  const uid=clean(decoded?.uid,180);if(!uid)return response.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  let items;try{items=parseInput(request?.body?.items);}catch(error){return response.status(400).json({ok:false,error:{code:error?.code||'NUTRITION_LOOKUP_ITEMS_INVALID'}});}
  const language=request?.body?.language==='en'?'en':'ko',id=requestId();
  let rate;try{rate=await consumeRateLimit(uid,{now:clock(),route:'nutrition_lookup'});}catch{return response.status(503).json({ok:false,error:{code:'NUTRITION_LOOKUP_RATE_LIMIT_UNAVAILABLE'},requestId:id});}
  if(rate?.allowed===false){const retry=Math.max(1,Number(rate.retryAfterSec)||60);response.set?.('Retry-After',String(retry));return response.status(429).json({ok:false,error:{code:'NUTRITION_LOOKUP_RATE_LIMITED'},retryAfterSec:retry,requestId:id});}
  try{
   const provider=providerFactory(getProviderConfig()),result=await provider.lookup({items,language,requestId:id});
   return response.status(200).json({ok:true,items:result.items,unresolved:result.unresolved,data:{source:'web_search',provider:result.provider,model:result.model,requestId:id,citationCount:result.citationCount}});
  }catch(error){
   const code=clean(error?.code,100)||'NUTRITION_LOOKUP_PROVIDER_ERROR',status=code==='LLM_SECRET_MISSING'?503:502;
   return response.status(status).json({ok:false,error:{code},requestId:id});
  }
 };
}

module.exports={DEFAULT_MODEL,WEB_NUTRITION_SCHEMA,parseInput,collectCitationUrls,normalizeLookupItems,systemPrompt,createNutritionLookupProvider,createNutritionLookupHandler};
