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
const COACH_WINDOW_MS=10*60*1000,COACH_WINDOW_LIMIT=20,COACH_DAILY_LIMIT=120;
const USER_SUBCOLLECTIONS=['app','workoutHistory','mealHistory','runHistory','bodyHistory','recoverySnapshots','telemetry'];

const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'64kb'}));
app.use(securityMiddleware());

async function readRawUser(uid){
 const db=getFirestore(),root=db.collection('users').doc(uid),state=await root.collection('app').doc('state').get();
 if(state.exists)return state.data()||{};
 const legacy=await root.get();return legacy.exists?legacy.data()||{}:{};
}
async function readCanonicalUser(uid){return normalizeForServer(await readRawUser(uid));}

async function consumeCoachRateLimit(uid,{now=new Date()}={}){
 const db=getFirestore(),ref=db.collection('_internal_coach_rate_limits').doc(uid),nowMs=now instanceof Date?now.getTime():Date.now(),day=new Date(nowMs).toISOString().slice(0,10);
 return db.runTransaction(async transaction=>{
  const snap=await transaction.get(ref),current=snap.exists?(snap.data()||{}):{},sameWindow=Number(current.windowStartMs)>0&&nowMs-Number(current.windowStartMs)<COACH_WINDOW_MS,sameDay=current.day===day;
  const windowStartMs=sameWindow?Number(current.windowStartMs):nowMs,windowCount=sameWindow?Number(current.windowCount||0):0,dayCount=sameDay?Number(current.dayCount||0):0;
  if(windowCount>=COACH_WINDOW_LIMIT)return {allowed:false,retryAfterSec:Math.max(1,Math.ceil((windowStartMs+COACH_WINDOW_MS-nowMs)/1000)),reason:'window'};
  if(dayCount>=COACH_DAILY_LIMIT){const tomorrow=Date.parse(`${day}T00:00:00.000Z`)+86400000;return {allowed:false,retryAfterSec:Math.max(1,Math.ceil((tomorrow-nowMs)/1000)),reason:'daily'};}
  transaction.set(ref,{windowStartMs,windowCount:windowCount+1,day,dayCount:dayCount+1,updatedAt:new Date(nowMs).toISOString()},{merge:true});
  return {allowed:true,remainingWindow:COACH_WINDOW_LIMIT-windowCount-1,remainingDaily:COACH_DAILY_LIMIT-dayCount-1};
 });
}

async function collectionRecords(ref){const snap=await ref.get();return snap.docs.map(doc=>doc.data?.()||{});}
async function readAccountExport(uid){
 const db=getFirestore(),userRef=db.collection('users').doc(uid),rootSnap=await userRef.get(),raw=await readRawUser(uid),historyByDomain={};
 for(const [domain,name] of Object.entries(History.COLLECTIONS)){const docs=await collectionRecords(userRef.collection(name));historyByDomain[domain]=docs.map(History.recordFromDoc).filter(Boolean);}
 const merged=History.mergeStateWithHistory(raw,historyByDomain),state=canonicalTransport(merged),telemetry=await collectionRecords(userRef.collection('telemetry'));
 return {exportVersion:'garang-user-export-v1',exportedAt:new Date().toISOString(),contractVersion:state.contractVersion,schemaVersion:state.schemaVersion,state,privacy:{consent:rootSnap.exists?(rootSnap.data()?.consent||null):null},serverData:{telemetry}};
}
async function deleteCollection(ref){const snap=await ref.get();for(let i=0;i<snap.docs.length;i+=350){const batch=getFirestore().batch();snap.docs.slice(i,i+350).forEach(doc=>batch.delete(doc.ref));await batch.commit();}}
async function deleteUserData(uid){
 const db=getFirestore(),ref=db.collection('users').doc(uid);
 if(typeof db.recursiveDelete==='function')await db.recursiveDelete(ref);
 else{for(const name of USER_SUBCOLLECTIONS)await deleteCollection(ref.collection(name));await ref.delete().catch(()=>{});}
 await db.collection('_internal_coach_rate_limits').doc(uid).delete().catch(()=>{});
}
async function readAnalyticsConsent(uid){const snap=await getFirestore().collection('users').doc(uid).get();return snap.exists&&snap.data()?.consent?.analytics===true;}
async function writeTelemetry(uid,payload){await getFirestore().collection('users').doc(uid).collection('telemetry').add({...payload,createdAt:FieldValue.serverTimestamp()});}

app.get('/agent/context',createAgentContextHandler({
 verifyIdToken:token=>getAuth().verifyIdToken(token,true),
 readUser:async uid=>{try{return await readCanonicalUser(uid);}catch(error){const wrapped=new Error('USER_DATA_READ_FAILED');wrapped.code='USER_DATA_READ_FAILED';wrapped.cause=error;throw wrapped;}}
}));
app.all('/agent/context',(request,response)=>response.status(405).set('Allow','GET').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'GET requests only.'}}));

app.post('/coach',createCoachGatewayHandler({
 verifyIdToken:token=>getAuth().verifyIdToken(token,true),
 readUser:readCanonicalUser,
 consumeRateLimit:consumeCoachRateLimit,
 getProviderConfig:()=>({provider:process.env.GARANG_LLM_PROVIDER||'openai',apiKey:llmApiKey.value(),model:process.env.GARANG_LLM_MODEL||'gpt-5.6-luna',timeoutMs:Number(process.env.GARANG_LLM_TIMEOUT_MS)||20000})
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

exports.api=onRequest({region:'asia-northeast3',cors:false,timeoutSeconds:30,memory:'256MiB',maxInstances:10,secrets:[llmApiKey]},app);
