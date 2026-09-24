'use strict';

const {parseBearer}=require('./agent-context.cjs');
const {extractResponseText,providerPayloadError,retryableProviderError}=require('./llm-provider.cjs');

const DEFAULT_MODEL='gpt-5.6-luna';
const MAX_IMAGE_DATA_URL=2600000;
const IMAGE_TYPES=Object.freeze(['image/jpeg','image/png','image/webp']);
const MEAL_SCAN_SCHEMA=Object.freeze({
 type:'object',additionalProperties:false,required:['items','overallConfidence','uncertain','notes'],properties:{
  items:{type:'array',minItems:0,maxItems:6,items:{type:'object',additionalProperties:false,required:['name','aliases','grams','confidence','portionConfidence'],properties:{
   name:{type:'string',minLength:1,maxLength:80},
   aliases:{type:'array',maxItems:5,items:{type:'string',minLength:1,maxLength:80}},
   grams:{type:'number',minimum:5,maximum:1500},
   confidence:{type:'number',minimum:0,maximum:1},
   portionConfidence:{type:'number',minimum:0,maximum:1}
  }}},
  overallConfidence:{type:'number',minimum:0,maximum:1},
  uncertain:{type:'boolean'},
  notes:{type:'string',maxLength:300}
 }
});
const LABEL_SCAN_SCHEMA=Object.freeze({
 type:'object',additionalProperties:false,
 required:['productName','brand','servingGrams','calories','protein','carbs','fat','confidence','nutritionConfidence','uncertain','notes'],
 properties:{
  productName:{type:'string',minLength:1,maxLength:120},
  brand:{type:'string',maxLength:100},
  servingGrams:{type:'number',minimum:1,maximum:2000},
  calories:{type:'number',minimum:0,maximum:10000},
  protein:{type:'number',minimum:0,maximum:1000},
  carbs:{type:'number',minimum:0,maximum:1000},
  fat:{type:'number',minimum:0,maximum:1000},
  confidence:{type:'number',minimum:0,maximum:1},
  nutritionConfidence:{type:'number',minimum:0,maximum:1},
  uncertain:{type:'boolean'},
  notes:{type:'string',maxLength:300}
 }
});

function clean(value,limit=500){return String(value??'').trim().slice(0,limit);}
function requestId(){return globalThis.crypto?.randomUUID?.()||`meal_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;}
function parseMealImage(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(new Error('MEAL_SCAN_IMAGE_REQUIRED'),{code:'MEAL_SCAN_IMAGE_REQUIRED'});
 const mediaType=clean(value.mediaType,40).toLowerCase(),dataUrl=String(value.dataUrl||'');
 if(!IMAGE_TYPES.includes(mediaType))throw Object.assign(new Error('MEAL_SCAN_IMAGE_TYPE_UNSUPPORTED'),{code:'MEAL_SCAN_IMAGE_TYPE_UNSUPPORTED'});
 if(!dataUrl.startsWith(`data:${mediaType};base64,`)||dataUrl.length>MAX_IMAGE_DATA_URL)throw Object.assign(new Error('MEAL_SCAN_IMAGE_INVALID'),{code:'MEAL_SCAN_IMAGE_INVALID'});
 return {mediaType,dataUrl};
}
function validateMealScan(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(new Error('MEAL_SCAN_RESPONSE_INVALID'),{code:'MEAL_SCAN_RESPONSE_INVALID'});
 const items=(Array.isArray(value.items)?value.items:[]).slice(0,6).map(row=>{
  const name=clean(row?.name,80),aliases=[...new Set((Array.isArray(row?.aliases)?row.aliases:[]).map(x=>clean(x,80)).filter(Boolean))].slice(0,5),grams=Number(row?.grams),confidence=Number(row?.confidence),portionConfidence=Number(row?.portionConfidence??row?.confidence);
  if(!name||!Number.isFinite(grams)||grams<5||grams>1500||!Number.isFinite(confidence)||!Number.isFinite(portionConfidence))throw Object.assign(new Error('MEAL_SCAN_RESPONSE_INVALID'),{code:'MEAL_SCAN_RESPONSE_INVALID'});
  return {name,aliases,grams:Math.round(grams),confidence:Math.max(0,Math.min(1,confidence)),portionConfidence:Math.max(0,Math.min(1,portionConfidence))};
 });
 if(!items.length)throw Object.assign(new Error('MEAL_SCAN_NO_FOOD_DETECTED'),{code:'MEAL_SCAN_NO_FOOD_DETECTED'});
 const overallConfidence=Number(value.overallConfidence);
 return {items,overallConfidence:Number.isFinite(overallConfidence)?Math.max(0,Math.min(1,overallConfidence)):0,uncertain:value.uncertain===true,notes:clean(value.notes,300)};
}
function validateLabelScan(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(new Error('NUTRITION_LABEL_RESPONSE_INVALID'),{code:'NUTRITION_LABEL_RESPONSE_INVALID'});
 const productName=clean(value.productName,120),brand=clean(value.brand,100),servingGrams=Number(value.servingGrams),calories=Number(value.calories),protein=Number(value.protein),carbs=Number(value.carbs),fat=Number(value.fat),confidence=Number(value.confidence),nutritionConfidence=Number(value.nutritionConfidence);
 if(!productName||![servingGrams,calories,protein,carbs,fat,confidence,nutritionConfidence].every(Number.isFinite)||servingGrams<1||servingGrams>2000)throw Object.assign(new Error('NUTRITION_LABEL_RESPONSE_INVALID'),{code:'NUTRITION_LABEL_RESPONSE_INVALID'});
 return {
  productName,brand,servingGrams:Math.round(servingGrams*10)/10,
  calories:Math.max(0,calories),protein:Math.max(0,protein),carbs:Math.max(0,carbs),fat:Math.max(0,fat),
  confidence:Math.max(0,Math.min(1,confidence)),nutritionConfidence:Math.max(0,Math.min(1,nutritionConfidence)),
  uncertain:value.uncertain===true,notes:clean(value.notes,300)
 };
}
function systemPrompt(language='ko',mode='meal'){
 if(mode==='label')return `You are GARANG Nutrition Label Vision. Read only nutrition facts visibly printed on a packaged-food label. Return the product name, brand when visible, serving grams, calories, protein grams, carbohydrate grams, and fat grams for one printed serving. Never infer missing values from general knowledge or a database. If multiple columns exist, use the clearly labeled per-serving column and mention ambiguity in notes. confidence measures product identity confidence; nutritionConfidence measures confidence that the printed serving and macro values were read correctly. Set uncertain=true when text is blurry, cropped, conflicting, or the serving basis is ambiguous. Output language: ${language==='en'?'English':'Korean where appropriate'}.`;
 return `You are GARANG Meal Scan Vision. Identify only foods visibly supported by the supplied meal photo. Return 1-6 food components with conservative gram estimates, identity confidence, and a separate portionConfidence for the gram estimate. Prefer common Korean food names that can match a Korean food database; include short Korean/English aliases when useful. Do not invent hidden ingredients. Do not calculate calories, protein, carbs, fat, or any nutrition values: GARANG's verified food database owns nutrition. If food identity is uncertain, lower confidence. If portion size is uncertain, lower portionConfidence and set uncertain=true. If the image is not a meal or no food can be identified, do not fabricate food. Output language: ${language==='en'?'English with Korean aliases when known':'Korean with English aliases when useful'}.`;
}
function createMealScanProvider(options={}){
 const fetchImpl=options.fetchImpl||globalThis.fetch,apiKey=clean(options.apiKey,1000),model=clean(options.model||DEFAULT_MODEL,120),endpoint=clean(options.endpoint||'https://api.openai.com/v1/responses',500),timeoutMs=Math.max(1000,Number(options.timeoutMs)||25000),maxAttempts=Math.max(1,Math.min(2,Number(options.maxAttempts)||2));
 if(!apiKey)throw Object.assign(new Error('LLM_SECRET_MISSING'),{code:'LLM_SECRET_MISSING'});if(typeof fetchImpl!=='function')throw new Error('LLM_FETCH_UNAVAILABLE');
 return {name:'openai',model,async scan({image,language='ko',requestId:id,mode='meal'}){
  const scanMode=mode==='label'?'label':'meal',schema=scanMode==='label'?LABEL_SCAN_SCHEMA:MEAL_SCAN_SCHEMA;
  const userText=scanMode==='label'?(language==='en'?'Read this packaged-food nutrition label exactly as printed.':'이 포장식품의 영양정보 라벨을 인쇄된 값 그대로 읽어줘.'):(language==='en'?'Identify the visible foods and estimate portions.':'사진에 보이는 음식과 양을 식별해줘.');
  const body={model,store:false,input:[{role:'system',content:[{type:'input_text',text:systemPrompt(language,scanMode)}]},{role:'user',content:[{type:'input_text',text:userText},{type:'input_image',image_url:image.dataUrl}]}],reasoning:{effort:'none'},max_output_tokens:800,text:{format:{type:'json_schema',name:scanMode==='label'?'garang_nutrition_label_scan':'garang_meal_scan',strict:true,schema}}};
  let lastError=null;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
   try{
    const response=await fetchImpl(endpoint,{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','X-GARANG-Request-Id':String(id||'')},signal:controller.signal,body:JSON.stringify(body)});
    if(!response?.ok)throw Object.assign(new Error(`MEAL_SCAN_PROVIDER_${response?.status||'ERROR'}`),{code:'MEAL_SCAN_PROVIDER_ERROR',status:response?.status||null});
    const payload=await response.json(),payloadError=providerPayloadError(payload);if(payloadError)throw payloadError;
    const text=extractResponseText(payload);if(!text)throw Object.assign(new Error(scanMode==='label'?'NUTRITION_LABEL_RESPONSE_INVALID':'MEAL_SCAN_RESPONSE_INVALID'),{code:scanMode==='label'?'NUTRITION_LABEL_RESPONSE_INVALID':'MEAL_SCAN_RESPONSE_INVALID'});
    let parsed;try{parsed=JSON.parse(text);}catch{throw Object.assign(new Error(scanMode==='label'?'NUTRITION_LABEL_RESPONSE_INVALID':'MEAL_SCAN_RESPONSE_INVALID'),{code:scanMode==='label'?'NUTRITION_LABEL_RESPONSE_INVALID':'MEAL_SCAN_RESPONSE_INVALID'});}
    const validated=scanMode==='label'?{label:validateLabelScan(parsed)}:validateMealScan(parsed);
    return {...validated,mode:scanMode,provider:'openai',model,providerResponseId:clean(payload?.id,160)||null,attempts:attempt};
   }catch(error){
    if(error?.name==='AbortError')lastError=Object.assign(new Error('MEAL_SCAN_TIMEOUT'),{code:'MEAL_SCAN_TIMEOUT'});
    else if(error instanceof TypeError&&!error?.code)lastError=Object.assign(new Error('MEAL_SCAN_NETWORK_ERROR'),{code:'MEAL_SCAN_NETWORK_ERROR'});
    else lastError=error;
   }finally{clearTimeout(timer);}
   if(attempt>=maxAttempts||!retryableProviderError(lastError))throw lastError;
  }
  throw lastError||Object.assign(new Error('MEAL_SCAN_PROVIDER_ERROR'),{code:'MEAL_SCAN_PROVIDER_ERROR'});
 }};
}
function createMealScanHandler(deps={}){
 const verifyIdToken=deps.verifyIdToken,consumeRateLimit=deps.consumeRateLimit||(async()=>({allowed:true})),providerFactory=deps.providerFactory||createMealScanProvider,getProviderConfig=deps.getProviderConfig||(()=>({apiKey:process.env.GARANG_LLM_API_KEY||'',model:process.env.GARANG_MEAL_SCAN_MODEL||process.env.GARANG_LLM_MODEL||DEFAULT_MODEL})),clock=deps.clock||(()=>new Date());
 if(typeof verifyIdToken!=='function')throw new Error('MEAL_SCAN_DEPENDENCIES_REQUIRED');
 return async function mealScan(request,response){
  if(String(request?.method||'POST').toUpperCase()!=='POST')return response.status(405).json({ok:false,error:{code:'METHOD_NOT_ALLOWED'}});
  const token=parseBearer(request?.headers?.authorization||request?.get?.('authorization'));if(!token)return response.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  let decoded;try{decoded=await verifyIdToken(token);}catch{return response.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});}
  const uid=clean(decoded?.uid,180);if(!uid)return response.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  let image;try{image=parseMealImage(request?.body?.image);}catch(error){return response.status(400).json({ok:false,error:{code:error?.code||'MEAL_SCAN_IMAGE_INVALID'}});}
  const language=request?.body?.language==='en'?'en':'ko',mode=request?.body?.mode==='label'?'label':'meal',id=requestId();
  let rate;try{rate=await consumeRateLimit(uid,{now:clock(),route:mode==='label'?'nutrition_label_scan':'meal_scan'});}catch{return response.status(503).json({ok:false,error:{code:'MEAL_SCAN_RATE_LIMIT_UNAVAILABLE'},requestId:id});}
  if(rate?.allowed===false){const retry=Math.max(1,Number(rate.retryAfterSec)||60);response.set?.('Retry-After',String(retry));return response.status(429).json({ok:false,error:{code:'MEAL_SCAN_RATE_LIMITED'},retryAfterSec:retry,requestId:id});}
  try{
   const provider=providerFactory(getProviderConfig()),result=await provider.scan({image,language,mode,requestId:id});
   if(mode==='label'){
    const data={mode:'label',label:result.label,source:'vision',provider:result.provider,model:result.model,requestId:id};
    return response.status(200).json({ok:true,label:data.label,data});
   }
   const data={mode:'meal',items:result.items,overallConfidence:result.overallConfidence,uncertain:result.uncertain,notes:result.notes,source:'vision',provider:result.provider,model:result.model,requestId:id};
   return response.status(200).json({ok:true,items:data.items,data});
  }catch(error){
   const code=clean(error?.code,100)||'MEAL_SCAN_PROVIDER_ERROR',status=code==='LLM_SECRET_MISSING'?503:(code==='MEAL_SCAN_NO_FOOD_DETECTED'?422:502);
   return response.status(status).json({ok:false,error:{code},requestId:id});
  }
 };
}
module.exports={DEFAULT_MODEL,MAX_IMAGE_DATA_URL,IMAGE_TYPES,MEAL_SCAN_SCHEMA,LABEL_SCAN_SCHEMA,parseMealImage,validateMealScan,validateLabelScan,systemPrompt,createMealScanProvider,createMealScanHandler};
