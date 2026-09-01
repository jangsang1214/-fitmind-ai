'use strict';

const express=require('express');
const {onRequest}=require('firebase-functions/v2/https');
const {initializeApp,getApps}=require('firebase-admin/app');
const {getAuth}=require('firebase-admin/auth');
const {getFirestore}=require('firebase-admin/firestore');
const {createAgentContextHandler}=require('./src/http-handler.cjs');

if(!getApps().length)initializeApp();

const app=express();
app.disable('x-powered-by');
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

exports.api=onRequest({region:'asia-northeast3',cors:false,timeoutSeconds:15,memory:'256MiB',maxInstances:10},app);
