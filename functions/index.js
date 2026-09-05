'use strict';

const express=require('express');
const {onRequest}=require('firebase-functions/v2/https');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const {createAgentContextHandler}=require('./src/http-handler.cjs');
const {createDeleteAccountHandler}=require('./src/account-security.cjs');

if(!getApps().length)initializeApp();

const app=express();
app.disable('x-powered-by');
app.use(express.json({limit:'64kb'}));
const allowedOrigins=new Set(['https://jangsang1214.github.io','http://localhost:8765','http://127.0.0.1:8765']);
app.use((request,response,next)=>{
 const origin=request.get('origin');
 if(origin&&allowedOrigins.has(origin)){
  response.set('Access-Control-Allow-Origin',origin);
  response.set('Vary','Origin');
  response.set('Access-Control-Allow-Headers','Authorization, Content-Type');
  response.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');
 }
 response.set('Cache-Control','no-store');
 response.set('X-Content-Type-Options','nosniff');
 response.set('Referrer-Policy','no-referrer');
 if(request.method==='OPTIONS')return allowedOrigins.has(origin)?response.status(204).end():response.status(403).end();
 next();
});

app.get('/agent/context',createAgentContextHandler({
 verifyIdToken:token=>getAuth().verifyIdToken(token,true),
 readUser:async uid=>{
  try{
   const snapshot=await getFirestore().collection('users').doc(uid).get();
   return snapshot.exists?snapshot.data():{};
  }catch(error){
   const wrapped=new Error('USER_DATA_READ_FAILED');
   wrapped.code='USER_DATA_READ_FAILED';
   wrapped.cause=error;
   throw wrapped;
  }
 }
}));
app.all('/agent/context',(request,response)=>response.status(405).set('Allow','GET').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'GET requests only.'}}));

app.post('/account/delete',createDeleteAccountHandler({
 verifyIdToken:token=>getAuth().verifyIdToken(token,true),
 deleteUserData:async uid=>{
  const db=getFirestore(),ref=db.collection('users').doc(uid);
  if(typeof db.recursiveDelete==='function')return db.recursiveDelete(ref);
  const appDocs=await ref.collection('app').get();
  const batch=db.batch();appDocs.docs.forEach(doc=>batch.delete(doc.ref));batch.delete(ref);await batch.commit();
 },
 deleteAuthUser:uid=>getAuth().deleteUser(uid)
}));
app.all('/account/delete',(request,response)=>response.status(405).set('Allow','POST').json({ok:false,error:{code:'METHOD_NOT_ALLOWED',message:'POST requests only.'}}));

exports.api=onRequest({region:'asia-northeast3',cors:false,timeoutSeconds:15,memory:'256MiB',maxInstances:10},app);
