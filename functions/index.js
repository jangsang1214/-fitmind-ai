'use strict';

const express=require('express');
const crypto=require('node:crypto');
const {onRequest}=require('firebase-functions/v2/https');
const {defineSecret}=require('firebase-functions/params');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {createAgentContextHandler}=require('./src/http-handler.cjs');
const {createDeleteAccountHandler}=require('./src/account-security.cjs');
const {createAccountExportHandler}=require('./src/account-export.cjs');
const {createCoachGatewayHandler}=require('./src/coach-gateway.cjs');
const {sanitizeWantedDemoEnvelope}=require('./src/wanted-demo-boundary.cjs');
const {normalizeForServer,canonicalTransport}=require('./src/server-state-boundary.cjs');
const {securityMiddleware}=require('./src/request-security.cjs');
const {createTelemetryHandler}=require('./src/telemetry.cjs');
const History=require('./src/history-boundary.cjs');

if(!getApps().length)initializeApp();
const llmApiKey=defineSecret('GARANG_LLM_API_KEY');
const COACH_WINDOW_MS=10*60*1000,COACH_WINDOW_LIMIT=40,COACH_DAILY_LIMIT=200;
const WANTED_PUBLIC_ORIGIN='https://garang-wanted-2026-jangsang1214.vercel.app';
const WANTED_EXPIRES_AT_MS=Date.parse('2026-10-17T15:00:00.000Z');
const WANTED_WINDOW_MS=10*60*1000,WANTED_WINDOW_LIMIT=80,WANTED_DAILY_LIMIT=600,WANTED_CLIENT_WINDOW_LIMIT=12,WANTED_CLIENT_DAILY_LIMIT=80;
const USER_SUBCOLLECTIONS=['app','workoutHistory','mealHistory','runHistory','bodyHistory','recoverySnapshots','telemetry'];

const app=express();
app.disable('x-powered-by');
const smallJson=express.json({limit:'64kb'}),coachJson=express.json({limit:'3mb'});
app.use((request,response,next)=>(request.path==='/coach'||request.path==='/wanted/coach'?coachJson:smallJson)(request,response,next));
app.use(securityMiddleware());

async function readRawUser(uid){
 const db=getFirestore(),root=db.collection('users').doc(uid),state=await root.collection('app').doc('state').get();
 if(state.exists)return state.data()||{};
 const legacy=await root.get();return legacy.exists?legacy.data()||{}:{};
}
async function readCanonicalUser(uid){return normalizeForServer(await readRawUser(uid));}

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

function wantedClientKey(request){
 const forwarded=String(request?.headers?.['x-forwarded-for']||request?.ip||'unknown').split(',')[0].trim();
 return crypto.createHash('sha256').update(`garang-wanted-2026:${forwarded}`).digest('hex').slice(0,32);
}
async function consumeWantedDemoRateLimit(clientKey,{now=new Date()}={}){
 const db=getFirestore(),nowMs=new Date(now).getTime(),day=new Date(now).toISOString().slice(0,10),root=db.collection('system').doc('wantedCoachQuota'),client=root.collection('clients').doc(String(clientKey||'unknown'));
 return db.runTransaction(async tx=>{
  const [globalSnap,clientSnap]=await Promise.all([tx.get(root),tx.get(client)]),globalData=globalSnap.exists?globalSnap.data()||{}:{},clientData=clientSnap.exists?clientSnap.data()||{}:{};
  const quota=(data,windowLimit,dailyLimit)=>{const windowStart=Number(data.windowStartMs)||nowMs,windowFresh=nowMs-windowStart<WANTED_WINDOW_MS,nextWindowStart=windowFresh?windowStart:nowMs,windowCount=windowFresh?Number(data.windowCount)||0:0,dailyCount=data.day===day?Number(data.dailyCount)||0:0;return {windowLimit,dailyLimit,nextWindowStart,windowCount,dailyCount};};
  const globalQuota=quota(globalData,WANTED_WINDOW_LIMIT,WANTED_DAILY_LIMIT),clientQuota=quota(clientData,WANTED_CLIENT_WINDOW_LIMIT,WANTED_CLIENT_DAILY_LIMIT);
  const blocked=[['wanted_global_window',globalQuota.windowCount>=globalQuota.windowLimit],['wanted_global_daily',globalQuota.dailyCount>=globalQuota.dailyLimit],['wanted_client_window',clientQuota.windowCount>=clientQuota.windowLimit],['wanted_client_daily',clientQuota.dailyCount>=clientQuota.dailyLimit]].find(([,blocked])=>blocked);
  if(blocked){const retry=blocked[0].endsWith('window')?Math.max(1,Math.ceil((WANTED_WINDOW_MS-(nowMs-(blocked[0].includes('global')?globalQuota.nextWindowStart:clientQuota.nextWindowStart)))/1000)):3600;return {allowed:false,retryAfterSec:retry,reason:blocked[0]};}
  tx.set(root,{windowStartMs:globalQuota.nextWindowStart,windowCount:globalQuota.windowCount+1,day,dailyCount:globalQuota.dailyCount+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  tx.set(client,{windowStartMs:clientQuota.nextWindowStart,windowCount:clientQuota.windowCount+1,day,dailyCount:clientQuota.dailyCount+1,updatedAt:FieldValue.serverTimestamp()},{merge:true});
  return {allowed:true,remainingWindow:Math.max(0,clientQuota.windowLimit-clientQuota.windowCount-1),remainingDaily:Math.max(0,clientQuota.dailyLimit-clientQuota.dailyCount-1)};
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
const providerConfig=()=>({provider:process.env.GARANG_LLM_PROVIDER||'openai',apiKey:llmApiKey.value(),model:process.env.GARANG_LLM_MODEL||'gpt-5.6-luna',timeoutMs:Number(process.env.GARANG_LLM_TIMEOUT_MS)||25000});
const wantedProviderConfig=()=>({...providerConfig(),retryMalformed:true,maxAttempts:2,maxOutputTokens:1000});

app.get('/agent/context',createAgentContextHandler({
 verifyIdToken:token=>getAuth().verifyIdToken(token,true),
 readUser:async uid=>{try{return await readCanonicalUser(uid);}catch(error){const wrapped=new Error('USER_DATA_READ_FAILED');wrapped.code='USER_DATA_READ_FAILED';wrapped.cause=error;throw wrapped;}}
}));
app.all('/agent/context',(request,response)=>response.status(405).set('Allow','GET').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'GET requests only.'}}));

app.post('/coach',createCoachGatewayHandler({
 verifyIdToken:token=>getAuth().verifyIdToken(token,true),
 readUser:readCanonicalUser,
 consumeRateLimit:consumeCoachRateLimit,
 getProviderConfig:providerConfig
}));
app.all('/coach',(request,response)=>response.status(405).set('Allow','POST').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'POST requests only.'}}));

app.post('/wanted/coach',async(request,response)=>{
 const origin=request.get?.('origin')||request.headers?.origin||'';
 if(origin!==WANTED_PUBLIC_ORIGIN)return response.status(403).json({ok:false,error:{code:'WANTED_ORIGIN_REQUIRED'}});
 if(Date.now()>=WANTED_EXPIRES_AT_MS)return response.status(410).json({ok:false,error:{code:'WANTED_DEMO_EXPIRED'}});
 if(request.body?.image)return response.status(400).json({ok:false,error:{code:'WANTED_DEMO_IMAGE_REQUIRES_ACCOUNT'}});
 let state;try{state=sanitizeWantedDemoEnvelope(request.body?.wantedDemo);}catch(error){return response.status(400).json({ok:false,error:{code:String(error?.code||'WANTED_DEMO_INVALID')}});}
 const clientKey=wantedClientKey(request),internalToken=`wanted:${clientKey}`,handler=createCoachGatewayHandler({
  verifyIdToken:async token=>{if(token!==internalToken)throw new Error('WANTED_INTERNAL_AUTH_INVALID');return {uid:`wanted-${clientKey}`};},
  readUser:async()=>state,
  consumeRateLimit:async()=>consumeWantedDemoRateLimit(clientKey,{now:new Date()}),
  getProviderConfig:wantedProviderConfig
 });
 request.headers=request.headers||{};request.headers.authorization=`Bearer ${internalToken}`;
 return handler(request,response);
});
app.all('/wanted/coach',(request,response)=>response.status(405).set('Allow','POST').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'POST requests only.'}}));

app.get('/account/export',createAccountExportHandler({verifyIdToken:token=>getAuth().verifyIdToken(token,true),readExport:readAccountExport}));
app.all('/account/export',(request,response)=>response.status(405).set('Allow','GET').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'GET requests only.'}}));

app.post('/account/delete',createDeleteAccountHandler({verifyIdToken:token=>getAuth().verifyIdToken(token,true),deleteUserData,deleteAuthUser:uid=>getAuth().deleteUser(uid)}));
app.all('/account/delete',(request,response)=>response.status(405).set('Allow','POST').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'POST requests only.'}}));

const telemetryHandler=createTelemetryHandler({verifyIdToken:token=>getAuth().verifyIdToken(token,true),readConsent:readAnalyticsConsent,writeEvent:writeTelemetry});
app.post('/analytics/events',telemetryHandler);
app.post('/telemetry/errors',telemetryHandler);
app.all(['/analytics/events','/telemetry/errors'],(request,response)=>response.status(405).set('Allow','POST').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'POST requests only.'}}));

exports.api=onRequest({region:'asia-northeast3',cors:false,timeoutSeconds:60,memory:'256MiB',maxInstances:10,secrets:[llmApiKey]},app);
