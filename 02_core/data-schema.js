/* GARANG production data boundary.
   Active UI state may keep legacy/local aliases, but every server/AI boundary must pass through
   migrate() / toTransport() so external services see one stable contract.
*/
(function(root){
 'use strict';
 const VERSION=8;
 const CONTRACT_VERSION='garang-state-v1';
 const SCORE_FORMULA_VERSION='recording-v2';
 const BODY_ESTIMATE_VERSION='body-estimate-v1';
 const isObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const date=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const id=()=>root.crypto?.randomUUID?.()||`g_${Date.now()}_${Math.random().toString(36).slice(2)}`;
 const numeric=(x)=>x==null||(typeof x==='string'&&!x.trim())?null:Number.isFinite(Number(x))?Number(x):null;
 const rounded=(value,digits=1)=>{const scale=10**digits;return Math.round((value+Number.EPSILON)*scale)/scale;};
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const rows=x=>Array.isArray(x)?x.filter(isObject):[];
 const clone=x=>x==null?x:JSON.parse(JSON.stringify(x));
 const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(new Date(x+'T12:00:00Z').getTime())&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x;
 const validTime=x=>typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
 const row=x=>({...x,id:String(x.id||id()),date:validDate(x.date)?x.date:date()});
 const canonicalTopLevel=Object.freeze(['contractVersion','schemaVersion','profile','userModel','workouts','meals','runs','body','planner','dailyCheckins','memory','aiChats','scoreHistory','plan','language','settings','updatedAtMs']);
 const collectionDomains=Object.freeze(['workouts','meals','runs','body','planner','dailyCheckins','aiChats','scoreHistory']);
 const CONTRACT=Object.freeze({
  id:CONTRACT_VERSION,
  schemaVersion:VERSION,
  units:Object.freeze({weight:'kg',length:'cm',distance:'km',duration:'min',pace:'min/km',energy:'kcal',date:'YYYY-MM-DD',timestamp:'ISO-8601'}),
  topLevel:canonicalTopLevel,
  domains:Object.freeze(['profile','userModel','workouts','meals','runs','body','planner','dailyCheckins','memory','aiChats','scoreHistory','settings']),
  compatibility:Object.freeze({
   checkins:'dailyCheckins',aiChat:'aiChats',onboarding:'userModel',
   plannerCompleted:'done',plannerSource:'origin',bodyFatPercent:'bodyFat'
  })
 });

 function deriveBodyMetrics(input={},profile={}){
  const weight=numeric(input.weight),bodyFat=numeric(input.bodyFat),muscle=numeric(input.muscle),height=numeric(profile?.height),result={weight,bodyFat,muscle,fatMass:null,bmi:null,bmr:null,estimatedMetrics:[],calculationVersion:BODY_ESTIMATE_VERSION};
  if(weight>0&&bodyFat!==null&&bodyFat>=0&&bodyFat<=100){result.fatMass=rounded(weight*bodyFat/100);result.estimatedMetrics.push('fatMass');const leanMass=weight-result.fatMass;if(leanMass>0){result.bmr=Math.round(370+21.6*leanMass);result.estimatedMetrics.push('bmr');}}
  if(weight>0&&height!==null&&height>=50&&height<=300){result.bmi=rounded(weight/(height/100)**2);result.estimatedMetrics.push('bmi');result.heightAtMeasurement=height;}
  return result;
 }

 function empty(){return {
  contractVersion:CONTRACT_VERSION,schemaVersion:VERSION,
  profile:null,userModel:null,
  workouts:[],meals:[],runs:[],body:[],planner:[],dailyCheckins:[],
  memory:{facts:[],preferences:[],goals:[],events:[],entries:[],deletedIds:[],legacyMigrated:true},
  aiChats:[],scoreHistory:[],plan:'FREE',language:'ko',settings:{notifications:true,unit:'metric'},updatedAtMs:0
 };}

 function hasUserData(s){return !!s&&(!!s.profile||!!s.userModel||['workouts','meals','runs','body','planner','dailyCheckins','aiChats'].some(k=>Array.isArray(s[k])&&s[k].length>0)||['facts','preferences','goals','events','entries'].some(k=>Array.isArray(s.memory?.[k])&&s.memory[k].length>0));}
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
  for(const k of ['workouts','meals','runs','body','planner','dailyCheckins','aiChats'])merged[k]=mergeRows(local[k],remote[k],preferRemote);
  merged.scoreHistory=mergeRows(local.scoreHistory,remote.scoreHistory,preferRemote,'date').sort((a,b)=>a.date.localeCompare(b.date));
  merged.memory={...(preferRemote?local.memory:remote.memory),...(preferRemote?remote.memory:local.memory)};
  for(const k of ['facts','preferences','goals','events'])merged.memory[k]=[...new Map([...(local.memory[k]||[]),...(remote.memory[k]||[])].map(x=>[typeof x==='string'?x:JSON.stringify(x),x])).values()];
  merged.memory.deletedIds=[...new Set([...(local.memory.deletedIds||[]),...(remote.memory.deletedIds||[])].map(String))];
  merged.memory.entries=mergeRows(local.memory.entries,remote.memory.entries,preferRemote).filter(x=>!merged.memory.deletedIds.includes(String(x.id)));
  merged.contractVersion=CONTRACT_VERSION;merged.schemaVersion=VERSION;merged.updatedAtMs=Math.max(numeric(local.updatedAtMs)||0,numeric(remote.updatedAtMs)||0);
  return migrate(merged);
 }

 function normalizeUserModel(input){
  if(!isObject(input))return null;
  const frequency=numeric(input.weeklyFrequency),minutes=numeric(input.availableMinutes);
  return {...input,
   goal:String(input.goal||''),experience:String(input.experience||''),
   weeklyFrequency:frequency===null?null:clamp(Math.round(frequency),1,7),
   availableMinutes:minutes===null?null:clamp(Math.round(minutes),5,1440),
   preferences:String(input.preferences||''),complete:input.complete===true,skipped:input.skipped===true
  };
 }

 function migrate(input){
  if(!isObject(input))throw new Error('INVALID_DATA');
  if(Number(input.schemaVersion)>VERSION)throw new Error('FUTURE_SCHEMA');
  if(input.contractVersion&&String(input.contractVersion)!==CONTRACT_VERSION)throw new Error('FOREIGN_CONTRACT');

  const originalSchema=numeric(input.schemaVersion)||0;
  const activeStateAliases=!('schemaVersion' in input)&&('meta' in input||'checkins' in input||'aiChat' in input||'onboarding' in input);
  const s={...empty(),...input,contractVersion:CONTRACT_VERSION,schemaVersion:VERSION};

  if(!Array.isArray(input.dailyCheckins)&&Array.isArray(input.checkins))s.dailyCheckins=input.checkins;
  if(!Array.isArray(input.aiChats)&&Array.isArray(input.aiChat))s.aiChats=input.aiChat;
  if(!isObject(input.userModel)&&isObject(input.onboarding))s.userModel=input.onboarding;
  if(!('language' in input)&&isObject(input.preferences)&&input.preferences.language)s.language=input.preferences.language;
  s.settings={notifications:true,unit:'metric',...(isObject(input.settings)?input.settings:{})};
  if(isObject(input.preferences)&&['metric','imperial'].includes(input.preferences.unit))s.settings.unit=input.preferences.unit;

  const weight=x=>numeric(x.weight??x.bodyWeight??x.body_weight??x['체중']);
  s.profile=isObject(s.profile)?{...s.profile,name:String(s.profile.name||''),weight:weight(s.profile)}:null;
  if(s.profile){
   for(const k of ['bodyWeight','body_weight','체중'])delete s.profile[k];
   for(const k of ['age','height','targetWeight','runningGoalKm'])s.profile[k]=numeric(s.profile[k]);
   if('gender' in s.profile)s.profile.gender=['male','female'].includes(s.profile.gender)?s.profile.gender:null;
   if('goal' in s.profile)s.profile.goal=String(s.profile.goal||'');
  }
  s.userModel=normalizeUserModel(s.userModel);

  for(const k of ['workouts','meals','runs','body','planner'])s[k]=rows(s[k]).map(row);
  s.dailyCheckins=rows(s.dailyCheckins).map(x=>{const normalized=root.GarangToday?.normalizeCheckin?root.GarangToday.normalizeCheckin(x,{...x,revision:Math.max(0,(numeric(x.revision)||1)-1),createdAt:x.createdAt},new Date(x.updatedAt||x.createdAt||Date.now())):{...row(x),timezone:String(x.timezone||'UTC'),sleepHours:numeric(x.sleepHours),energy:numeric(x.energy),stress:numeric(x.stress),availableMinutes:numeric(x.availableMinutes),soreness:isObject(x.soreness)?x.soreness:{},notes:String(x.notes||''),painCaution:x.painCaution===true,schemaVersion:1,revision:Math.max(1,numeric(x.revision)||1)};return normalized;});

  const numbers=(x,keys)=>{const y={...x};for(const k of keys)y[k]=Math.max(0,numeric(x[k])||0);return y;};
  s.workouts=s.workouts.map(x=>({...numbers(x,['sets','reps','weight','rpe','duration','body','met','kcal','volume']),name:String(x.name||''),sessionId:String(x.sessionId||x.id)}));
  s.meals=s.meals.map(x=>({...numbers(x,['grams','kcal','protein','carbs','fat']),name:String(x.name||''),items:rows(x.items).map(i=>({...numbers(i,['grams','kcal','protein','carbs','fat']),id:String(i.id||id()),name:String(i.name||'')}))}));
  s.runs=s.runs.map(x=>({...numbers(x,['distance','duration','kcal']),pace:String(numeric(x.pace)??'—'),coords:Array.isArray(x.coords)?x.coords.filter(c=>Array.isArray(c)&&c.length>=2&&Number.isFinite(Number(c[0]))&&Number.isFinite(Number(c[1]))).map(c=>[Number(c[0]),Number(c[1]),...(c.length>2&&Number.isFinite(Number(c[2]))?[Number(c[2])]:[])]):[]}));
  s.body=s.body.map(x=>{const n={...x,
   weight:weight(x),muscle:numeric(x.muscle??x.skeletalMuscleMass),bodyFat:numeric(x.bodyFat??x.fatPercent??x.bodyFatPercent),fatMass:numeric(x.fatMass??x.bodyFatMass),leanMass:numeric(x.leanMass),bmi:numeric(x.bmi??x.BMI),bmr:numeric(x.bmr??x.BMR)
  };for(const k of ['bodyWeight','body_weight','체중','skeletalMuscleMass','fatPercent','bodyFatPercent','bodyFatMass','BMI','BMR'])delete n[k];return n;}).sort((a,b)=>a.date.localeCompare(b.date));
  s.planner=s.planner.map(x=>{const n={...x,title:String(x.title||''),time:validTime(x.time)?x.time:'18:30',done:x.done===true||x.completed===true,notify:x.notify!==false,type:String(x.type||'routine'),origin:String(x.origin||x.source||'user'),confirmed:x.confirmed!==false,revisionHistory:rows(x.revisionHistory)};delete n.completed;delete n.source;return n;});

  s.memory=isObject(s.memory)?{...s.memory}:{};
  for(const k of ['facts','preferences','goals','events','entries','deletedIds'])s.memory[k]=Array.isArray(s.memory[k])?s.memory[k]:[];
  s.memory.deletedIds=[...new Set(s.memory.deletedIds.map(String))];
  s.memory.events=s.memory.events.filter(x=>typeof x==='string'||isObject(x));
  const oldNormalizedImportance=!activeStateAliases&&originalSchema>0&&originalSchema<VERSION;
  s.memory.entries=rows(s.memory.entries).map(x=>{
   const category=String(x.category||x.type||'notes'),text=String(x.text??x.value??''),rawImportance=numeric(x.importance);
   const importance=rawImportance===null?3:oldNormalizedImportance&&rawImportance>=0&&rawImportance<=1?clamp(Math.round(1+rawImportance*4),1,5):clamp(Math.round(rawImportance),1,5);
   return {...x,id:String(x.id||id()),category,type:String(x.type||category),key:String(x.key||x.id||''),text,value:String(x.value??text),source:String(x.source||'user'),confidence:clamp(numeric(x.confidence)??1,0,1),importance,userConfirmed:x.userConfirmed!==false,expiresAt:x.expiresAt?String(x.expiresAt):null,revisionHistory:rows(x.revisionHistory)};
  }).filter(x=>!s.memory.deletedIds.includes(x.id));
  if(!s.memory.legacyMigrated)for(const [bucket,category] of [['facts','notes'],['preferences','preferences'],['goals','goals']])s.memory[bucket].filter(x=>x!=null).forEach((x,i)=>{const legacyId=`legacy-${bucket}-${i}`,text=typeof x==='string'?x:String(x.text||JSON.stringify(x));if(!s.memory.entries.some(e=>e.id===legacyId)&&!s.memory.deletedIds.includes(legacyId))s.memory.entries.push({id:legacyId,category,type:category,key:legacyId,text,value:text,source:'legacy',confidence:1,importance:3,userConfirmed:true,expiresAt:null,revisionHistory:[]});});
  s.memory.legacyMigrated=true;

  s.aiChats=rows(s.aiChats).map(x=>({...x,id:String(x.id||id()),role:['user','assistant','system'].includes(x.role)?x.role:'system',text:String(x.text??x.content??''),plans:rows(x.plans).filter(p=>typeof p.title==='string')}));
  s.scoreHistory=rows(s.scoreHistory).filter(x=>validDate(x.date)).map(x=>{const y={date:x.date,formulaVersion:String(x.formulaVersion||'legacy')};for(const k of ['total','exercise','nutrition','recovery','activity','body'])y[k]=numeric(x[k])===null?null:clamp(numeric(x[k]),0,100);return y;});
  s.settings.notifications=s.settings.notifications!==false;
  s.settings.unit=s.settings.unit==='imperial'?'imperial':'metric';
  s.language=s.language==='en'?'en':'ko';s.plan=s.plan==='PRO'?'PRO':'FREE';
  s.updatedAtMs=Math.max(0,numeric(s.updatedAtMs)||Date.parse(s.meta?.updatedAt||0)||0);
  return s;
 }

 function validateContract(state){
  const errors=[];
  if(!isObject(state))return ['state must be an object'];
  if(state.contractVersion!==CONTRACT_VERSION)errors.push('contractVersion');
  if(state.schemaVersion!==VERSION)errors.push('schemaVersion');
  for(const key of canonicalTopLevel)if(!(key in state))errors.push(`missing:${key}`);
  for(const key of collectionDomains)if(!Array.isArray(state[key]))errors.push(`array:${key}`);
  if(state.profile!==null&&!isObject(state.profile))errors.push('profile');
  if(state.userModel!==null&&!isObject(state.userModel))errors.push('userModel');
  if(!isObject(state.memory))errors.push('memory');
  if(!isObject(state.settings))errors.push('settings');
  if(!['ko','en'].includes(state.language))errors.push('language');
  if(!['FREE','PRO'].includes(state.plan))errors.push('plan');
  if(!['metric','imperial'].includes(state.settings?.unit))errors.push('settings.unit');

  for(const domain of ['workouts','meals','runs','body','planner','dailyCheckins'])for(const item of state[domain]||[]){
   if(typeof item.id!=='string'||!item.id)errors.push(`${domain}.id`);
   if(!validDate(item.date))errors.push(`${domain}.date`);
  }
  for(const item of state.planner||[]){if(!validTime(item.time))errors.push('planner.time');if(typeof item.done!=='boolean')errors.push('planner.done');if(typeof item.origin!=='string')errors.push('planner.origin');}
  for(const item of state.body||[]){if(item.bodyFat!==null&&item.bodyFat!==undefined&&(numeric(item.bodyFat)<0||numeric(item.bodyFat)>100))errors.push('body.bodyFat');}
  for(const item of state.memory?.entries||[]){if(typeof item.id!=='string'||!item.id)errors.push('memory.id');if(numeric(item.confidence)===null||item.confidence<0||item.confidence>1)errors.push('memory.confidence');if(numeric(item.importance)===null||item.importance<1||item.importance>5)errors.push('memory.importance');}
  for(const item of state.aiChats||[]){if(typeof item.id!=='string'||!item.id)errors.push('aiChats.id');if(!['user','assistant','system'].includes(item.role))errors.push('aiChats.role');if(typeof item.text!=='string')errors.push('aiChats.text');}
  return [...new Set(errors)];
 }

 function assertContract(state){const errors=validateContract(state);if(errors.length){const e=new Error('INVALID_CONTRACT');e.code='INVALID_CONTRACT';e.details=errors;throw e;}return state;}
 function toTransport(input){const s=migrate(input),out={};for(const key of canonicalTopLevel)out[key]=clone(s[key]);out.contractVersion=CONTRACT_VERSION;out.schemaVersion=VERSION;return assertContract(out);}

 function validateImport(x){
  if(!isObject(x)||!['workouts','meals','runs','body','planner','dailyCheckins','checkins','profile','userModel','onboarding','memory'].some(k=>k in x))throw new Error('INVALID_DATA');
  for(const k of ['workouts','meals','runs','body','planner','dailyCheckins','checkins','aiChats','aiChat'])if(k in x&&(!Array.isArray(x[k])||x[k].some(y=>!isObject(y))))throw new Error('INVALID_DATA');
  return migrate(x);
 }

 root.GarangSchema={VERSION,CONTRACT_VERSION,CONTRACT,SCORE_FORMULA_VERSION,BODY_ESTIMATE_VERSION,empty,migrate,toTransport,validateContract,assertContract,validateImport,validDate,numeric,deriveBodyMetrics,id,date,hasUserData,accountBootstrap,mergeStates};
})(typeof window==='undefined'?globalThis:window);
