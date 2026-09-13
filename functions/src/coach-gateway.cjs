'use strict';

const {parseBearer,buildAgentContext}=require('./agent-context.cjs');
const {createProvider}=require('./llm-provider.cjs');
const crypto=require('node:crypto');

const rows=value=>Array.isArray(value)?value:[];
const clean=(value,limit=1000)=>String(value??'').trim().slice(0,limit);
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
function select(row,keys){const out={};for(const key of keys){const value=row?.[key];if(value!==undefined&&value!==null&&value!=='')out[key]=clone(value);}return out;}
function minimalContext(full){
 const memory=rows(full?.memory?.entries).slice(0,10).map(row=>select(row,['type','key','value','confidence','importance','createdAt']));
 const workouts=rows(full?.workouts).slice(0,8).map(row=>select(row,['date','name','exercise','sets','reps','weight','rpe','duration','volume']));
 const meals=rows(full?.meals).slice(0,8).map(row=>select(row,['date','name','kcal','protein','carbs','fat']));
 const runs=rows(full?.runs).slice(0,6).map(row=>select(row,['date','distance','duration','pace','rpe']));
 const body=rows(full?.body).slice(0,6).map(row=>select(row,['date','weight','fatPercent','muscle']));
 const planner=rows(full?.planner).slice(0,6).map(row=>select(row,['date','domain','type','title','status','completed','executionScore']));
 return {goal:clone(full?.goal??null),confirmedMemory:memory,recent:{workouts,meals,runs,body,planner},stateIntelligence:clone(full?.userState||null),performance:clone(full?.performanceScore||null),garangDecision:clone(full?.decision||null),decisionReasons:rows(full?.decision?.reasonCodes).slice(0,8),actionProposalAllowed:!!full?.decision?.actionProposal};
}
function requestId(){return crypto.randomUUID?.()||`coach_${Date.now()}_${Math.random().toString(36).slice(2)}`;}
function errorCode(error){return clean(error?.code||error?.message||'LLM_GATEWAY_ERROR',80).replace(/[^A-Z0-9_]+/gi,'_').toUpperCase();}
function createCoachGatewayHandler(deps={}){
 const verifyIdToken=deps.verifyIdToken,readUser=deps.readUser,clock=deps.clock||(()=>new Date()),providerFactory=deps.providerFactory||createProvider,getProviderConfig=deps.getProviderConfig||(()=>({provider:'openai',apiKey:process.env.GARANG_LLM_API_KEY||'',model:process.env.GARANG_LLM_MODEL||'gpt-5.6-luna'}));
 if(typeof verifyIdToken!=='function'||typeof readUser!=='function')throw new Error('COACH_GATEWAY_DEPENDENCIES_REQUIRED');
 return async function coachGateway(req,res){
  if(String(req?.method||'POST').toUpperCase()!=='POST')return res.status(405).json({ok:false,error:{code:'METHOD_NOT_ALLOWED'}});
  const token=parseBearer(req?.headers?.authorization||req?.get?.('authorization'));if(!token)return res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  let decoded;try{decoded=await verifyIdToken(token);}catch{return res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});}
  const uid=clean(decoded?.uid,180);if(!uid)return res.status(401).json({ok:false,error:{code:'UNAUTHENTICATED'}});
  const message=clean(req?.body?.message,1800),language=req?.body?.language==='en'?'en':'ko';if(!message)return res.status(400).json({ok:false,error:{code:'MESSAGE_REQUIRED'}});
  let state;try{state=await readUser(uid);}catch{return res.status(503).json({ok:false,error:{code:'USER_DATA_UNAVAILABLE'}});}
  const full=buildAgentContext(state||{},{ownerUid:uid,query:message,now:clock(),limit:12,memoryLimit:10}),context=minimalContext(full),id=requestId();
  try{
   const config=getProviderConfig(),provider=providerFactory(config),generated=await provider.generate({message,context,language,requestId:id});
   const data={...generated,source:'llm',requestId:id,garangDecision:clone(context.garangDecision),actionProposalAllowed:context.actionProposalAllowed};
   return res.status(200).json({ok:true,answer:generated.answer,data});
  }catch(error){
   const code=errorCode(error);return res.status(code==='LLM_SECRET_MISSING'?503:502).json({ok:false,error:{code},fallbackRequired:true,requestId:id,garangDecision:clone(context.garangDecision)});
  }
 };
}
module.exports={createCoachGatewayHandler,minimalContext};
