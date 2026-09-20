'use strict';

const {parseBearer,buildAgentContext}=require('./agent-context.cjs');
const {createProvider}=require('./llm-provider.cjs');
const Nutrition=require('./nutrition-intelligence-v2.cjs');
const Grounding=require('./coach-knowledge-grounding-v2.cjs');
const {RULES:COACH_KNOWLEDGE}=require('./coach-knowledge-v2.cjs');
const crypto=require('node:crypto');

const rows=value=>Array.isArray(value)?value:[];
const clean=(value,limit=1000)=>String(value??'').trim().slice(0,limit);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const finite=value=>{const n=Number(value);return Number.isFinite(n)?n:null;};
const round=(value,digits=1)=>{const n=finite(value);if(n===null)return null;const p=10**digits;return Math.round(n*p)/p;};
const directIdentifierKey=value=>/(?:^|_)(?:email|e_mail|phone|mobile|address|location|latitude|longitude|token|display_name|full_name)(?:_|$)/i.test(String(value||''));
function redactText(value,limit=800){return clean(value,limit).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[redacted-email]').replace(/(?:\+?\d[\d\s().-]{7,}\d)/g,'[redacted-phone]');}
function parseCoachImage(value){if(value===undefined||value===null||value==='')return null;if(!value||typeof value!=='object'||Array.isArray(value))throw Object.assign(new Error('COACH_IMAGE_INVALID'),{code:'COACH_IMAGE_INVALID'});const mediaType=clean(value.mediaType,40).toLowerCase();if(!['image/jpeg','image/png','image/webp'].includes(mediaType))throw Object.assign(new Error('COACH_IMAGE_TYPE_UNSUPPORTED'),{code:'COACH_IMAGE_TYPE_UNSUPPORTED'});const dataUrl=String(value.dataUrl||''),prefix=`data:${mediaType};base64,`;if(!dataUrl.startsWith(prefix))throw Object.assign(new Error('COACH_IMAGE_INVALID'),{code:'COACH_IMAGE_INVALID'});const encoded=dataUrl.slice(prefix.length);if(!encoded||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw Object.assign(new Error('COACH_IMAGE_INVALID'),{code:'COACH_IMAGE_INVALID'});const padding=(encoded.endsWith('==')?2:encoded.endsWith('=')?1:0),bytes=Math.floor(encoded.length*3/4)-padding;if(bytes>2000000)throw Object.assign(new Error('COACH_IMAGE_TOO_LARGE'),{code:'COACH_IMAGE_TOO_LARGE'});return {kind:'body_photo',mediaType,dataUrl,bytes};}
function select(row,keys,{redact=false}={}){const out={};for(const key of keys){const value=row?.[key];if(value===undefined||value===null||value==='')continue;out[key]=redact&&typeof value==='string'?redactText(value):clone(value);}return out;}
function latestCheckin(state){return [...rows(state?.dailyCheckins),...rows(state?.checkins)].slice().sort((a,b)=>String(a?.date||a?.createdAt||'').localeCompare(String(b?.date||b?.createdAt||''))).at(-1)||null;}
function normalizeCheckin(row){
 const source=row&&typeof row==='object'&&!Array.isArray(row)?row:{};
 const sorenessValue=source.soreness??source.muscleSoreness;
 const soreness=sorenessValue&&typeof sorenessValue==='object'&&!Array.isArray(sorenessValue)?clone(sorenessValue):(finite(sorenessValue)===null?{}:{overall:finite(sorenessValue)});
 return {...clone(source),sleepHours:finite(source.sleepHours??source.sleep),energy:finite(source.energy??source.energyLevel),stress:finite(source.stress??source.stressLevel),soreness,painCaution:source.painCaution===true||source.pain===true,availableMinutes:finite(source.availableMinutes)};
}
function normalizeStateForIntelligence(stateInput={}){
 const state=stateInput&&typeof stateInput==='object'&&!Array.isArray(stateInput)?clone(stateInput):{};
 const merged=[...rows(stateInput?.dailyCheckins),...rows(stateInput?.checkins)].map(normalizeCheckin);
 state.dailyCheckins=merged;
 state.checkins=merged;
 return state;
}
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
 const checkin=select(latestCheckin(state)||{},['date','sleep','sleepHours','energy','energyLevel','stress','stressLevel','soreness','muscleSoreness','availableMinutes','painCaution']);
 return {goal:clone(full?.goal??null),confirmedMemory:memory,recent:{workouts,meals,runs,body,bodyTrend:bodyTrend(body),planner,recoveryCheckin:Object.keys(checkin).length?checkin:null},stateIntelligence:clone(full?.userState||null),performance:clone(full?.performanceScore||null),userPerformance:clone(full?.userPerformance||null),outcomeLearning:clone(full?.outcome||null),garangDecision:clone(full?.decision||null),decisionReasons:rows(full?.decision?.reasonCodes).slice(0,8),actionProposalAllowed:!!full?.decision?.actionProposal};
}
function compactNutrition(value={}){return {version:value?.version||null,date:value?.date||null,mode:value?.mode||null,goal:value?.goal||null,priority:value?.priority||null,confidence:finite(value?.confidence),evidence:clone(value?.evidence||{}),reasonCodes:rows(value?.reasonCodes).slice(0,8),guardrails:rows(value?.guardrails).slice(0,8)};}
function groundingFailure(code){return Object.assign(new Error(code),{code});}
function validateGroundingContext(context={}){
 const grounding=context?.knowledgeGrounding||{},expected=context?.garangDecision||{},identity=grounding?.decisionIdentity||{},contract=grounding?.contract||{};
 if(!expected?.decisionId||!expected?.mode||identity.decisionId!==expected.decisionId||identity.mode!==expected.mode)throw groundingFailure('GROUNDING_DECISION_MISMATCH');
 if(contract.decisionOwnedBy!=='GARANG'||contract.llmRole!=='explain_only'||contract.stateMutationAllowed!==false)throw groundingFailure('GROUNDING_CONTRACT_INVALID');
 return true;
}
function buildGroundedContext(full,state={},options={}){
 const context=minimalContext(full,state),nutrition=Nutrition.interpret(state,{now:options.now}),knowledgeGrounding=Grounding.ground({decision:context.garangDecision,userState:context.stateIntelligence,nutrition,query:redactText(options.query,500),coachRules:COACH_KNOWLEDGE,limit:5}),grounded={...context,nutritionIntelligence:compactNutrition(nutrition),knowledgeGrounding};
 validateGroundingContext(grounded);return grounded;
}
function requestId(){return crypto.randomUUID?.()||`coach_${Date.now()}_${Math.random().toString(36).slice(2)}`;}
function errorCode(error){return clean(error?.code||error?.message||'LLM_GATEWAY_ERROR',80).replace(/[^A-Z0-9_]+/gi,'_').toUpperCase();}
function safeProviderData(generated={}){const {answer,decisionSummary,reasoningSummary,suggestedNextStep,confidence,metadata}=generated||{};return {answer,decisionSummary,reasoningSummary,suggestedNextStep,confidence,metadata};}
function alignmentFailure(code){return Object.assign(new Error(code),{code});}
function verifyGeneratedAlignment(generated,context){
 const alignment=generated?.alignment;if(!alignment)return {verified:false,decisionId:null,decisionMode:null,reasonCodesUsed:[]};
 const expectedId=clean(context?.garangDecision?.decisionId,320),expectedMode=clean(context?.garangDecision?.mode,40),actualId=clean(alignment?.decisionId,320),actualMode=clean(alignment?.decisionMode,40),reasonCodesUsed=Array.isArray(alignment?.reasonCodesUsed)?[...new Set(alignment.reasonCodesUsed.map(code=>clean(code,100)).filter(Boolean))].slice(0,8):[];
 if(!expectedId||!expectedMode||actualId!==expectedId||actualMode!==expectedMode)throw alignmentFailure('LLM_ALIGNMENT_MISMATCH');
 const allowed=new Set(rows(context?.decisionReasons).map(code=>clean(code,100)).filter(Boolean));
 if(reasonCodesUsed.some(code=>!allowed.has(code)))throw alignmentFailure('LLM_ALIGNMENT_UNSUPPORTED_REASON');
 return {verified:true,decisionId:actualId,decisionMode:actualMode,reasonCodesUsed};
}
function alignGenerated(generated,context){
 if(context?.knowledgeGrounding)validateGroundingContext(context);
 const providerAlignment=verifyGeneratedAlignment(generated,context),decisionConfidence=finite(context?.garangDecision?.confidence),llmConfidence=finite(generated?.confidence),effective=decisionConfidence===null?llmConfidence:llmConfidence===null?decisionConfidence:Math.min(llmConfidence,decisionConfidence),capped=decisionConfidence!==null&&llmConfidence!==null&&llmConfidence>decisionConfidence;
 return {...generated,confidence:effective===null?null:round(Math.max(0,Math.min(1,effective)),2),metadata:{...(clone(generated?.metadata)||{}),alignment:{decisionId:clean(context?.garangDecision?.decisionId,240)||null,decisionMode:clean(context?.garangDecision?.mode,40)||null,decisionConfidence,llmConfidence,confidenceCapped:capped,outcomeClassification:clean(context?.outcomeLearning?.classification,60)||'insufficient_evidence',outcomeLongitudinalClassification:clean(context?.outcomeLearning?.longitudinal?.classification,80)||'insufficient_longitudinal_evidence',contractVerified:providerAlignment.verified,reasonCodesUsed:providerAlignment.reasonCodesUsed},grounding:context?.knowledgeGrounding?{version:clean(context?.knowledgeGrounding?.version,80)||null,evidenceCount:Math.max(0,Number(context?.knowledgeGrounding?.evidenceCount)||0),nutritionMode:clean(context?.nutritionIntelligence?.mode,60)||null,decisionOwnedBy:'GARANG',contractVerified:true}:undefined}};
}
function defaultObserve(event){try{console.info('[GARANG_COACH_EVENT]',JSON.stringify(event));}catch{}}
function createCoachGatewayHandler(deps={}){
 const verifyIdToken=deps.verifyIdToken,readUser=deps.readUser,consumeRateLimit=deps.consumeRateLimit||(async()=>({allowed:true})),clock=deps.clock||(()=>new Date()),providerFactory=deps.providerFactory||createProvider,getProviderConfig=deps.getProviderConfig||(()=>({provider:'openai',apiKey:process.env.GARANG_LLM_API_KEY||'',model:process.env.GARANG_LLM_MODEL||'gpt-5.6-luna'})),observe=typeof deps.observe==='function'?deps.observe:defaultObserve;
 if(typeof verifyIdToken!=='function'||typeof readUser!=='function')throw new Error('COACH_GATEWAY_DEPENDENCIES_REQUIRED');
 return async function coachGateway(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return res.status(405).json({ok:false,error:{code:'METHOD_NOT_ALLOWED'}});
  const token=parseBearer(req?.headers?.authorization||req?.get?.('authorization'));if(!token)return res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  let decoded;try{decoded=await verifyIdToken(token);}catch{return res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});}
  const uid=clean(decoded?.uid,180);if(!uid)return res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  const language=req?.body?.language==='en'?'en':'ko';let image=null;try{image=parseCoachImage(req?.body?.image);}catch(error){return res.status(400).json({ok:false,error:{code:errorCode(error)}});}const message=clean(req?.body?.message,1800)||(image?(language==='en'?'Review this photo with my GARANG records and explain what is visibly relevant to my training.':'이 사진을 내 GARANG 기록과 함께 보고 훈련 관점에서 보이는 점을 알려줘.'):'');if(!message)return res.status(400).json({ok:false,error:{code:'MESSAGE_REQUIRED'}});
  const id=requestId(),now=clock();
  let rate;try{rate=await consumeRateLimit(uid,{now,route:'coach'});}catch{observe({event:'llm_fallback',requestId:id,code:'COACH_RATE_LIMIT_UNAVAILABLE',providerStatus:null,decisionMode:null});return res.status(503).json({ok:false,error:{code:'COACH_RATE_LIMIT_UNAVAILABLE'},fallbackRequired:true,requestId:id});}
  if(rate?.allowed===false){const retry=Math.max(1,Number(rate.retryAfterSec)||60);observe({event:'llm_fallback',requestId:id,code:'COACH_RATE_LIMITED',providerStatus:429,decisionMode:null,rateLimitReason:clean(rate?.reason,24)||null});res.set?.('Retry-After',String(retry));return res.status(429).json({ok:false,error:{code:'COACH_RATE_LIMITED'},fallbackRequired:true,retryAfterSec:retry,requestId:id});}
  let state;try{state=await readUser(uid);}catch{return res.status(503).json({ok:false,error:{code:'USER_DATA_UNAVAILABLE'}});}
  let context;try{const normalizedState=normalizeStateForIntelligence(state||{}),full=buildAgentContext(normalizedState,{ownerUid:uid,query:message,now,limit:12,memoryLimit:10});context=buildGroundedContext(full,normalizedState,{query:message,now});}catch(error){const code=errorCode(error);observe({event:'llm_fallback',requestId:id,code,providerStatus:null,decisionMode:null});return res.status(503).json({ok:false,error:{code},fallbackRequired:true,requestId:id});}
  try{
   const config=getProviderConfig();observe({event:'llm_request',requestId:id,provider:clean(config?.provider||'openai',40),decisionMode:clean(context?.garangDecision?.mode,40)||null,outcomeClassification:clean(context?.outcomeLearning?.classification,60)||'insufficient_evidence',nutritionMode:clean(context?.nutritionIntelligence?.mode,60)||null,groundingEvidenceCount:Number(context?.knowledgeGrounding?.evidenceCount)||0,hasImage:!!image});
   const provider=providerFactory(config),generated=alignGenerated(await provider.generate({message,context,language,requestId:id,image}),context),safe=safeProviderData(generated),data={...safe,source:'llm',requestId:id,garangDecision:clone(context.garangDecision),actionProposalAllowed:context.actionProposalAllowed};
   observe({event:'llm_success',requestId:id,provider:clean(safe?.metadata?.provider||config?.provider||'openai',40),decisionMode:clean(context?.garangDecision?.mode,40)||null,confidenceCapped:safe?.metadata?.alignment?.confidenceCapped===true,alignmentVerified:safe?.metadata?.alignment?.contractVerified===true,groundingVerified:safe?.metadata?.grounding?.contractVerified===true});
   return res.status(200).json({ok:true,answer:safe.answer,data});
  }catch(error){
   const code=errorCode(error);observe({event:'llm_fallback',requestId:id,code,providerStatus:finite(error?.status),decisionMode:clean(context?.garangDecision?.mode,40)||null});return res.status(code==='LLM_SECRET_MISSING'?503:502).json({ok:false,error:{code},fallbackRequired:true,requestId:id,garangDecision:clone(context.garangDecision)});
  }
 };
}
module.exports={createCoachGatewayHandler,minimalContext,buildGroundedContext,compactNutrition,validateGroundingContext,redactText,parseCoachImage,latestCheckin,normalizeCheckin,normalizeStateForIntelligence,bodyTrend,safeProviderData,verifyGeneratedAlignment,alignGenerated};
