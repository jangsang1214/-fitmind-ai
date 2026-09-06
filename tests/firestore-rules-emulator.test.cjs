'use strict';
const fs=require('node:fs'),path=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,deleteDoc}=require('firebase/firestore');
const root=path.resolve(__dirname,'..');
(async()=>{
 const rules=fs.readFileSync(path.join(root,'07_config/firestore.rules'),'utf8');
 const env=await initializeTestEnvironment({projectId:'garang-rules-test',firestore:{rules}});
 try{
  const u1=env.authenticatedContext('u1').firestore(),u2=env.authenticatedContext('u2').firestore(),anon=env.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(u1,'users/u1'),{consent:{globalLearning:false,analytics:false}}));
  await assertSucceeds(setDoc(doc(u1,'users/u1/app/state'),{meta:{syncOwnerUid:'u1'},workouts:[]}));
  await assertFails(setDoc(doc(u1,'users/u1/app/state'),{meta:{syncOwnerUid:'u2'}}));
  await assertFails(getDoc(doc(u2,'users/u1/app/state')));await assertFails(getDoc(doc(anon,'users/u1/app/state')));
  await assertSucceeds(setDoc(doc(u1,'users/u1/workoutHistory/w1'),{ownerUid:'u1',domain:'workouts',recordId:'w1',record:{id:'w1'}}));
  await assertSucceeds(setDoc(doc(u1,'users/u1/mealHistory/m1'),{ownerUid:'u1',domain:'meals',recordId:'m1',record:{id:'m1'}}));
  await assertSucceeds(setDoc(doc(u1,'users/u1/runHistory/r1'),{ownerUid:'u1',domain:'runs',recordId:'r1',record:{id:'r1'}}));
  await assertSucceeds(setDoc(doc(u1,'users/u1/bodyHistory/b1'),{ownerUid:'u1',domain:'body',recordId:'b1',record:{id:'b1'}}));
  await assertFails(setDoc(doc(u1,'users/u1/workoutHistory/bad-owner'),{ownerUid:'u2',domain:'workouts',recordId:'x',record:{id:'x'}}));
  await assertFails(setDoc(doc(u1,'users/u1/workoutHistory/bad-domain'),{ownerUid:'u1',domain:'meals',recordId:'x',record:{id:'x'}}));
  await assertFails(setDoc(doc(u1,'users/u1/undeclared/x'),{ownerUid:'u1'}));
  await assertSucceeds(setDoc(doc(u1,'users/u1/recoverySnapshots/s1'),{migration:'history-v2'}));
  await assertSucceeds(deleteDoc(doc(u1,'users/u1/workoutHistory/w1')));
  console.log('firestore-rules-emulator: PASS');
 }finally{await env.cleanup();}
})().catch(error=>{console.error(error);process.exit(1);});
