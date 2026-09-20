'use strict';

const express=require('express');
const {onRequest}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {createAgentContextHandler}=require('./src/http-handler.cjs');
const {createDeleteAccountHandler}=require('./src/account-security.cjs');
const {createAccountExportHandler}=require('./src/account-export.cjs');
const {createCoachGatewayHandler}=require('./src/coach-gateway.cjs');
const {normalizeForServer,canonicalTransport}=require('./src/server-state-boundary.cjs');
const {securityMiddleware}=require('./src/request-security.cjs');
const {createTelemetryHandler}=require('./src/telemetry.cjs');
const History=require('./src/history-boundary.cjs');

if(!getApps().length)initializeApp();
const llmApiKey=defineSecret('GARANG_LLM_API_KEY');
const COACH_WINDOW_MS=10*60*1000,COACH_WINDOW_LIMIT=40,COACH_DAILY_LIMIT=200;
const USER_SUBCOLLECTIONS=['app','workoutHistory','mealHistory','runHistory','bodyHistory','recoverySnapshots','telemetry'];

const app=express();
app.disable('x-powered-by');
const smallJson=express.json({limit:'64kb'}),coachJson=express.json({limit:'3mb'});
app.use((request,response,next)=>(request.path==='/coach'?coachJson:smallJson)(request,response,next));
app.use(securityMiddleware());

async function readRawUser(uid){
 const db=getFirestore(),root=db.collection('users').doc(uid),state=await root.collection('app').doc('state').get();
 if(state.exists)return state.data()||{};
 const legacy=await root.get();return legacy.exists?legacy.data()||{}:{};
}
async function readCanonicalUser(uid){return normalizeForServer(await readRawUser(uid));}
async function mutateCanonicalUser(uid,mutator){
 const safeUid=String(uid||'').trim();if(!safeUid||typeof mutator!=='function')throw Object.assign(new Error('AUTONOMOUS_WRITE_INVALID'),{code:'AUTONOMOUS_WRITE_INVALID'});
 const db=getFirestore(),ref=db.collection('users').doc(safeUid).collection('app').doc('state');
 return db.runTransaction(async tx=>{
  const snap=await tx.get(ref),raw=snap.exists?snap.data()||{}:{},state=normalizeForServer(raw),outcome=await mutator(state);
  if(!outcome||typeof outcome!=='object'||!outcome.state||typeof outcome.state!=='object')throw Object.assign(new Error('AUTONOMOUS_WRITE_RESULT_INVALID'),{code:'AUTONOMOUS_WRITE_RESULT_INVALID'});
  if(outcome.changed===true){
   const next=normalizeForServer(outcome.state);next.updatedAtMs=Date.now();tx.set(ref,next,{merge:false});return {...outcome,state:next};
  }
  return {...outcome,state};
 });
}

async function consumeCoachRateLimit(uid,{now=new Date()}={}){
 const db=getFirestore(),safeUid=String(uid||'').trim();if(!safeUid)return {allowed:false,retryAfterSec:60,reason:'missing_uid'};
 const ref=db.collection('users').doc(safeUid).collection('app').doc('coachRateLimit'),nowMs=new Date(now).getTime(),day=new Date(now).toISOString().slice(0,10);
 return db.runTransaction(async tx=>{
  const snap=await tx.get(ref),data=snap.exists?snap.data()||{}:{},windowStart=Number(data.windowStartMs)||nowMs,windowFresh=nowMs-windowStart<COACH_WINDOW_MS,nextWindowStart=windowFresh?windowStart:nowMs,windowCount=windowFresh?Number(data.windowCount)||0:0,dailyCount=data.day===day?Number(data.dailyCount)||0:0;
  if(windowCount>=COACH_WINDOW_LIMIT)return {allowed:false,retryAfterSec:Math.max(1,Math.ceil((COACH_WINDOW_MS-(nowMs-nextWindowStart))/1000)),reason:'window'};
  if(dailyCount>=COACH_DAILY_LIMIT)return {allowed:false,retryAfterSec:Math.max(60,Math.ceil((Date.parse(`${day}T23:59:59.999Z`)-nowMs)/1000)),reason:'daily'};
  tx.set(ref,{windowStartMs:nextWindowStart,windowCount:windowCount+1,day,dailyCount:dailyCount+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  return {allowed:true,remainingWindow:Math.max(0,COACH_WINDOW_LIMIT-windowCount-1),remainingDaily:Math.max(0,COACH_DAILY_LIMIT-dailyCount-1)};
 });
}

async function readAccountExport(uid){
 const db=getFirestore(),root=db.collection('users').doc(uid),rootDoc=await root.get(),exported={profile:rootDoc.exists?rootDoc.data()||{}:{}};
 for(const name of USER_SUBCOLLECTIONS){const snap=await root.collection(name).get();exported[name]=snap.docs.map(doc=>({id:doc.id,...doc.data()}));}
 return exported;
}
async function deleteCollection(ref,batchSize=200){
 while(true){const snap=await ref.limit(batchSize).get();if(snap.empty)return;const batch=getFirestore().batch();snap.docs.forEach(doc=>batch.delete(doc.ref));await batch.commit();if(snap.size<batchSize)return;}
}
async function deleteUserData(uid){
 const root=getFirestore().collection('users').doc(uid);
 for(const name of USER_SUBCOLLECTIONS)await deleteCollection(root.collection(name));
 await root.delete();
}
async function readAnalyticsConsent(uid){const snap=await getFirestore().collection('users').doc(uid).collection('app').doc('state').get();return snap.exists&&snap.data()?.privacy?.consent?.analytics===true;}
async function writeTelemetry(uid,event){await getFirestore().collection('users').doc(uid).collection('telemetry').add({...event,createdAt:FieldValue.serverTimestamp()});}

app.get('/agent/context',createAgentContextHandler({
 verifyIdToken:token=>getAuth().verifyIdToken(token,true),
 readUser:async uid=>{try{return await readCanonicalUser(uid);}catch(error){const wrapped=new Error('USER_DATA_READ_FAILED');wrapped.code='USER_DATA_READ_FAILED';wrapped.cause=error;throw wrapped;}}
}));
app.all('/agent/context',(request,response)=>response.status(405).set('Allow','GET').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'GET requests only.'}}));

app.post('/coach',createCoachGatewayHandler({
 verifyIdToken:token=>getAuth().verifyIdToken(token,true),
 readUser:readCanonicalUser,
 mutateUser:mutateCanonicalUser,
 consumeRateLimit:consumeCoachRateLimit,
 getProviderConfig:()=>({provider:process.env.GARANG_LLM_PROVIDER||'openai',apiKey:llmApiKey.value(),model:process.env.GARANG_LLM_MODEL||'gpt-5.6-luna',timeoutMs:Number(process.env.GARANG_LLM_TIMEOUT_MS)||25000})
}));
app.all('/coach',(request,response)=>response.status(405).set('Allow','POST').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'POST requests only.'}}));

app.get('/account/export',createAccountExportHandler({verifyIdToken:token=>getAuth().verifyIdToken(token,true),readExport:readAccountExport}));
app.all('/account/export',(request,response)=>response.status(405).set('Allow','GET').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'GET requests only.'}}));

app.post('/account/delete',createDeleteAccountHandler({verifyIdToken:token=>getAuth().verifyIdToken(token,true),deleteUserData,deleteAuthUser:uid=>getAuth().deleteUser(uid)}));
app.all('/account/delete',(request,response)=>response.status(405).set('Allow','POST').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'POST requests only.'}}));

const telemetryHandler=createTelemetryHandler({verifyIdToken:token=>getAuth().verifyIdToken(token,true),readConsent:readAnalyticsConsent,writeEvent:writeTelemetry});
app.post('/analytics/events',telemetryHandler);
app.post('/telemetry/errors',telemetryHandler);
app.all(['/analytics/events','/telemetry/errors'],(request,response)=>response.status(405).set('Allow','POST').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'POST requests only.'}}));

exports.api=onRequest({region:'asia-northeast3',cors:false,timeoutSeconds:60,memory:'256MiB',maxInstances:10,secrets:[llmApiKey]},app);
