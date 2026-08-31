/* Canonical persisted schema. Legacy aliases are accepted only at this boundary. */
(function(root){
 'use strict';
 const VERSION=3, isObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const date=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const id=()=>root.crypto?.randomUUID?.()||`g_${Date.now()}_${Math.random().toString(36).slice(2)}`;
 const numeric=(x)=>x===''||x==null?null:Number.isFinite(Number(x))?Number(x):null;
 const rows=x=>Array.isArray(x)?x.filter(isObject):[];
 const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(new Date(x+'T12:00:00Z').getTime())&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
 const row=x=>({...x,id:String(x.id||id()),date:validDate(x.date)?x.date:date()});
 function empty(){return {schemaVersion:VERSION,profile:null,workouts:[],meals:[],runs:[],body:[],planner:[],memory:{facts:[],preferences:[],goals:[],events:[],entries:[]},aiChats:[],scoreHistory:[],plan:'FREE',language:'ko',settings:{notifications:true}};}
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
  s.planner=s.planner.map(x=>({...x,title:String(x.title||''),time:/^([01]\d|2[0-3]):[0-5]\d$/.test(x.time)?x.time:'18:30',done:x.done===true,notify:x.notify!==false,type:String(x.type||'routine')}));
  s.memory=isObject(s.memory)?{...s.memory}:{};
  for(const k of ['facts','preferences','goals','events','entries'])s.memory[k]=Array.isArray(s.memory[k])?s.memory[k]:[];
  s.memory.events=s.memory.events.filter(x=>typeof x==='string'||isObject(x));
  s.memory.entries=rows(s.memory.entries).map(x=>({...x,id:String(x.id||id()),category:String(x.category||'notes'),text:String(x.text||'')}));
  if(!s.memory.legacyMigrated)for(const [bucket,category] of [['facts','notes'],['preferences','preferences'],['goals','goals']])s.memory[bucket].filter(x=>x!=null).forEach((x,i)=>{const key=`legacy-${bucket}-${i}`;if(!s.memory.entries.some(e=>e.id===key))s.memory.entries.push({id:key,category,text:typeof x==='string'?x:String(x.text||JSON.stringify(x)),source:'legacy'});});
  s.memory.legacyMigrated=true;
  s.aiChats=rows(s.aiChats).map(x=>({...x,id:String(x.id||id()),role:['user','assistant','system'].includes(x.role)?x.role:'system',text:String(x.text??x.content??''),plans:rows(x.plans).filter(p=>typeof p.title==='string')}));
  s.scoreHistory=rows(s.scoreHistory).sort((a,b)=>String(a.date).localeCompare(String(b.date))).filter(x=>validDate(x.date)).map(x=>{const y={date:x.date};for(const k of ['total','exercise','nutrition','recovery','activity','body'])y[k]=numeric(x[k])===null?null:Math.max(0,Math.min(100,numeric(x[k])));return y;});
  s.settings={notifications:true,...(isObject(s.settings)?s.settings:{})};
  s.language=s.language==='en'?'en':'ko';s.plan=s.plan==='PRO'?'PRO':'FREE';
  return s;
 }
 function validateImport(x){
  if(!isObject(x)||!['workouts','meals','runs','body','planner','profile','memory'].some(k=>k in x))throw new Error('INVALID_DATA');
  for(const k of ['workouts','meals','runs','body','planner','aiChats'])if(k in x&&(!Array.isArray(x[k])||x[k].some(y=>!isObject(y))))throw new Error('INVALID_DATA');
  return migrate(x);
 }
 root.GarangSchema={VERSION,empty,migrate,validateImport,validDate,numeric,id,date};
})(typeof window==='undefined'?globalThis:window);
