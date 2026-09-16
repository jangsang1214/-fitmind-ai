'use strict';

const CONTRACT='garang-wanted-judge-data-v1';
const MAX_BYTES=240000;
const rows=(value,max)=>Array.isArray(value)?value.slice(-max):[];
const text=(value,limit=160)=>String(value??'').trim().slice(0,limit);
const finite=value=>{const n=Number(value);return Number.isFinite(n)?n:null;};
const compact=(source,keys)=>{const out={};for(const key of keys){const value=source?.[key];if(value!==undefined&&value!==null&&value!=='')out[key]=typeof value==='string'?text(value,240):value;}return out;};
function invalid(code){return Object.assign(new Error(code),{code});}
function sanitizeWantedDemoEnvelope(envelope){
 if(!envelope||typeof envelope!=='object'||Array.isArray(envelope))throw invalid('WANTED_DEMO_INVALID');
 if(envelope.contractVersion!==CONTRACT||envelope.synthetic!==true)throw invalid('WANTED_DEMO_CONTRACT_INVALID');
 const source=envelope.state;if(!source||typeof source!=='object'||Array.isArray(source))throw invalid('WANTED_DEMO_STATE_INVALID');
 if(Buffer.byteLength(JSON.stringify(source),'utf8')>MAX_BYTES)throw invalid('WANTED_DEMO_STATE_TOO_LARGE');
 const judge=source?.meta?.judgeDataset||{};
 if(source.wantedDemo!==true||judge.contractVersion!==CONTRACT||judge.synthetic!==true||Number(judge.spanDays)!==14)throw invalid('WANTED_DEMO_STATE_CONTRACT_INVALID');
 const checkins=rows(source.checkins,14).map(row=>compact(row,['id','date','sleep','sleepHours','energy','energyLevel','stress','stressLevel','soreness','muscleSoreness','soreArea','availableMinutes','pain','painCaution','updatedAt']));
 const workouts=rows(source.workouts,40).map(row=>({...compact(row,['id','date','sessionName','name','exercise','primaryMuscle','sets','reps','weight','rpe','duration','volume','estimated1RM','kcal','createdAt','updatedAt']),source:'wanted_synthetic'}));
 const meals=rows(source.meals,50).map(row=>({...compact(row,['id','date','name','kcal','protein','carbs','fat','createdAt','updatedAt']),source:'wanted_synthetic'}));
 const runs=rows(source.runs,10).map(row=>({id:text(row?.id,100),date:text(row?.date,20),distance:finite(row?.distance??row?.distanceKm),duration:finite(row?.duration??row?.durationMin),pace:finite(row?.pace??row?.paceSecPerKm),rpe:finite(row?.rpe),source:'wanted_synthetic'}));
 const body=rows(source.body,10).map(row=>({id:text(row?.id,100),date:text(row?.date,20),weight:finite(row?.weight),fatPercent:finite(row?.fatPercent??row?.bodyFat),muscle:finite(row?.muscle??row?.muscleMass),source:'wanted_synthetic',userConfirmed:true}));
 const planner=rows(source.planner,20).map(row=>compact(row,['id','date','domain','type','title','status','completed','executionScore','createdAt','updatedAt']));
 const memoryEntries=rows(source?.memory?.entries,20).filter(row=>row?.userConfirmed!==false&&String(row?.type||'').toLowerCase()!=='identity').map(row=>compact(row,['id','type','key','value','confidence','importance','userConfirmed','createdAt','updatedAt','expiresAt']));
 const actionLog=rows(source.actionLog,30).map(row=>compact(row,['id','action','reason','at']));
 if(checkins.length<10||meals.length<20)throw invalid('WANTED_DEMO_STATE_INCOMPLETE');
 return {
  meta:{schemaVersion:5,createdAt:text(source?.meta?.createdAt,40),updatedAt:text(source?.meta?.updatedAt,40),judgeDataset:{contractVersion:CONTRACT,synthetic:true,spanDays:14,source:'wanted_public_runtime'}},
  profile:{goal:text(source?.profile?.goal||source?.onboarding?.goal,120),age:finite(source?.profile?.age),gender:text(source?.profile?.gender,20),height:finite(source?.profile?.height),weight:finite(source?.profile?.weight)},
  onboarding:{complete:true,skipped:false,goal:text(source?.onboarding?.goal||source?.profile?.goal,120),experience:text(source?.onboarding?.experience,40),weeklyFrequency:finite(source?.onboarding?.weeklyFrequency),availableMinutes:finite(source?.onboarding?.availableMinutes),preferences:text(source?.onboarding?.preferences,240)},
  preferences:{language:source?.preferences?.language==='en'?'en':'ko',unit:source?.preferences?.unit==='imperial'?'imperial':'metric'},
  checkins,dailyCheckins:[],planner,workouts,meals,runs,body,aiChat:[],memory:{entries:memoryEntries,facts:[],preferences:[],goals:[],events:[]},actionLog,analytics:{events:[]},errors:[],plan:'FREE',wantedDemo:true
 };
}
module.exports={CONTRACT,MAX_BYTES,sanitizeWantedDemoEnvelope};
