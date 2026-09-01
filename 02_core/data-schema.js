/* Canonical persisted schema. Legacy aliases are accepted only at this boundary. */
(function(root){
 'use strict';
 const VERSION=6, SCORE_FORMULA_VERSION='recording-v2', BODY_ESTIMATE_VERSION='body-estimate-v1', isObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const date=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const id=()=>root.crypto?.randomUUID?.()||`g_${Date.now()}_${Math.random().toString(36).slice(2)}`;
 const numeric=(x)=>x==null||(typeof x==='string'&&!x.trim())?null:Number.isFinite(Number(x))?Number(x):null;
 const rounded=(value,digits=1)=>{const scale=10**digits;return Math.round((value+Number.EPSILON)*scale)/scale;};
 function deriveBodyMetrics(input={},profile={}){
  const weight=numeric(input.weight),bodyFat=numeric(input.bodyFat),muscle=numeric(input.muscle),height=numeric(profile?.height),result={weight,bodyFat,muscle,fatMass:null,bmi:null,bmr:null,estimatedMetrics:[],calculationVersion:BODY_ESTIMATE_VERSION};
  if(weight>0&&bodyFat!==null&&bodyFat>=0&&bodyFat<=100){result.fatMass=rounded(weight*bodyFat/100);result.estimatedMetrics.push('fatMass');const leanMass=weight-result.fatMass;if(leanMass>0){result.bmr=Math.round(370+21.6*leanMass);result.estimatedMetrics.push('bmr');}}
  if(weight>0&&height!==null&&height>=50&&height<=300){result.bmi=rounded(weight/(height/100)**2);result.estimatedMetrics.push('bmi');result.heightAtMeasurement=height;}
  return result;
 }
 const rows=x=>Array.isArray(x)?x.filter(isObject):[];
 const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(new Date(x+'T12:00:00Z').getTime())&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
 const row=x=>({...x,id:String(x.id||id()),date:validDate(x.date)?x.date:date()});
 function empty(){return {schemaVersion:VERSION,profile:null,workouts:[],meals:[],runs:[],body:[],planner:[],memory:{facts:[],preferences:[],goals:[],events:[],entries:[],deletedIds:[]},aiChats:[],scoreHistory:[],plan:'FREE',language:'ko',settings:{notifications:true}};}
 function hasUserData(s){return !!s&&(!!s.profile||['workouts','meals','runs','body','planner','aiChats'].some(k=>Array.isArray(s[k])&&s[k].length>0)||['facts','preferences','goals','events','entries'].some(k=>Array.isArray(s.memory?.[k])&&s.memory[k].length>0));}
 function accountBootstrap(hasAccountCache,guestState,demoEnabled){if(hasAccountCache)return null;return demoEnabled&&hasUserData(guestState)?migrate(guestState):empty();}
 function mergeRows(localRows,remoteRows,preferRemote,key='id'){
  const result=[],positions=new Map();
  for(const item of [...rows(localRows),...rows(remoteRows)]){
   const itemKey=String(item[key]??item.id??JSON.stringify(item));
   if(!positions.has(itemKey)){positions.set(itemKey,result.length);result.push({...item});continue;}
   const index=positions.get(itemKey),current=result[index];
   const itemTime=Date.parse(item.updatedAt||item.createdAt||0)||numeric(item.updatedAtMs)||0,currentTime=Date.parse(current.updatedAt||current.createdAt||0)||numeric(current.updatedAtMs)||0;
   if(itemTime>currentTime||(itemTime===currentTime&&preferRemote))result[index]={...current,...item};
  }
  return result;
 }
 function mergeStates(localInput,remoteInput){
  const local=migrate(localInput),remote=migrate(remoteInput),preferRemote=(numeric(remote.updatedAtMs)||0)>(numeric(local.updatedAtMs)||0),merged={...(preferRemote?local:remote),...(preferRemote?remote:local)};
  for(const k of ['workouts','meals','runs','body','planner','aiChats'])merged[k]=mergeRows(local[k],remote[k],preferRemote);
  merged.scoreHistory=mergeRows(local.scoreHistory,remote.scoreHistory,preferRemote,'date').sort((a,b)=>a.date.localeCompare(b.date));
  merged.memory={...(preferRemote?local.memory:remote.memory),...(preferRemote?remote.memory:local.memory)};
  for(const k of ['facts','preferences','goals','events'])merged.memory[k]=[...new Map([...(local.memory[k]||[]),...(remote.memory[k]||[])].map(x=>[typeof x==='string'?x:JSON.stringify(x),x])).values()];
  merged.memory.deletedIds=[...new Set([...(local.memory.deletedIds||[]),...(remote.memory.deletedIds||[])].map(String))];
  merged.memory.entries=mergeRows(local.memory.entries,remote.memory.entries,preferRemote).filter(x=>!merged.memory.deletedIds.includes(String(x.id)));
  merged.schemaVersion=VERSION;merged.updatedAtMs=Math.max(numeric(local.updatedAtMs)||0,numeric(remote.updatedAtMs)||0);
  return migrate(merged);
 }
 function migrate(input){
  if(!isObject(input))throw new Error('INVALID_DATA');
  if(Number(input.schemaVersion)>VERSION)throw new Error('FUTURE_SCHEMA');
  const s={...empty(),...input,schemaVersion:VERSION};
  const weight=x=>numeric(x.weight??x.bodyWeight??x.body_weight??x['체중']);
  s.profile=isObject(s.profile)?{...s.profile,name:String(s.profile.name||''),weight:weight(s.profile)}:null;
  if(s.profile)for(const k of ['bodyWeight','body_weight','체중'])delete s.profile[k];
  if(s.profile)for(const k of ['age','height','targetWeight','runningGoalKm'])s.profile[k]=numeric(s.profile[k]);
  for(const k of ['workouts','meals','runs','body','planner'])s[k]=rows(s[k]).map(row);
  const numbers=(x,keys)=>{const y={...x};for(const k of keys)y[k]=Math.max(0,numeric(x[k])||0);return y;};
  s.workouts=s.workouts.map(x=>({...numbers(x,['sets','reps','weight','rpe','duration','body','met','kcal','volume']),name:String(x.name||''),sessionId:String(x.sessionId||x.id)}));
  s.meals=s.meals.map(x=>({...numbers(x,['grams','kcal','protein','carbs','fat']),name:String(x.name||''),items:rows(x.items).map(i=>({...numbers(i,['grams','kcal','protein','carbs','fat']),name:String(i.name||'')}))}));
  s.runs=s.runs.map(x=>({...numbers(x,['distance','duration','kcal']),pace:String(numeric(x.pace)??'—'),coords:Array.isArray(x.coords)?x.coords.filter(c=>Array.isArray(c)&&c.length>=2&&c.every(v=>Number.isFinite(v))):[]}));
  s.body=s.body.map(x=>{const n={...x,weight:weight(x),muscle:numeric(x.muscle??x.skeletalMuscleMass),bodyFat:numeric(x.bodyFat??x.bodyFatPercent),fatMass:numeric(x.fatMass??x.bodyFatMass),bmi:numeric(x.bmi??x.BMI),bmr:numeric(x.bmr??x.BMR)};for(const k of ['bodyWeight','body_weight','체중','skeletalMuscleMass','bodyFatPercent','bodyFatMass','BMI','BMR'])delete n[k];return n;}).sort((a,b)=>a.date.localeCompare(b.date));
  s.planner=s.planner.map(x=>({...x,title:String(x.title||''),time:/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time)?x.time:'18:30',done:x.done===true,notify:x.notify!==false,type:String(x.type||'routine'),origin:String(x.origin||'user'),confirmed:x.confirmed!==false,revisionHistory:rows(x.revisionHistory)}));
  s.memory=isObject(s.memory)?{...s.memory}:{};
  for(const k of ['facts','preferences','goals','events','entries','deletedIds'])s.memory[k]=Array.isArray(s.memory[k])?s.memory[k]:[];
  s.memory.deletedIds=[...new Set(s.memory.deletedIds.map(String))];
  s.memory.events=s.memory.events.filter(x=>typeof x==='string'||isObject(x));
  s.memory.entries=rows(s.memory.entries).map(x=>{const category=String(x.category||x.type||'notes'),text=String(x.text??x.value??'');return {...x,id:String(x.id||id()),category,type:String(x.type||category),key:String(x.key||x.id||''),text,value:String(x.value??text),source:String(x.source||'user'),confidence:Math.max(0,Math.min(1,numeric(x.confidence)??1)),importance:Math.max(0,Math.min(1,numeric(x.importance)??.5)),userConfirmed:x.userConfirmed!==false,expiresAt:x.expiresAt?String(x.expiresAt):null,revisionHistory:rows(x.revisionHistory)};}).filter(x=>!s.memory.deletedIds.includes(x.id));
  if(!s.memory.legacyMigrated)for(const [bucket,category] of [['facts','notes'],['preferences','preferences'],['goals','goals']])s.memory[bucket].filter(x=>x!=null).forEach((x,i)=>{const id=`legacy-${bucket}-${i}`,text=typeof x==='string'?x:String(x.text||JSON.stringify(x));if(!s.memory.entries.some(e=>e.id===id)&&!s.memory.deletedIds.includes(id))s.memory.entries.push({id,category,type:category,key:id,text,value:text,source:'legacy',confidence:1,importance:.5,userConfirmed:true,expiresAt:null,revisionHistory:[]});});
  s.memory.legacyMigrated=true;
  s.aiChats=rows(s.aiChats).map(x=>({...x,id:String(x.id||id()),role:['user','assistant','system'].includes(x.role)?x.role:'system',text:String(x.text??x.content??''),plans:rows(x.plans).filter(p=>typeof p.title==='string')}));
  s.scoreHistory=rows(s.scoreHistory).filter(x=>validDate(x.date)).map(x=>{const y={date:x.date,formulaVersion:String(x.formulaVersion||'legacy')};for(const k of ['total','exercise','nutrition','recovery','activity','body'])y[k]=numeric(x[k])===null?null:Math.max(0,Math.min(100,numeric(x[k])));return y;});
  s.settings={notifications:true,...(isObject(s.settings)?s.settings:{})};
  s.language=s.language==='en'?'en':'ko';s.plan=s.plan==='PRO'?'PRO':'FREE';
  return s;
 }
 function validateImport(x){
  if(!isObject(x)||!['workouts','meals','runs','body','planner','profile','memory'].some(k=>k in x))throw new Error('INVALID_DATA');
  for(const k of ['workouts','meals','runs','body','planner','aiChats'])if(k in x&&(!Array.isArray(x[k])||x[k].some(y=>!isObject(y))))throw new Error('INVALID_DATA');
  return migrate(x);
 }
 root.GarangSchema={VERSION,SCORE_FORMULA_VERSION,BODY_ESTIMATE_VERSION,empty,migrate,validateImport,validDate,numeric,deriveBodyMetrics,id,date,hasUserData,accountBootstrap,mergeStates};
})(typeof window==='undefined'?globalThis:window);
