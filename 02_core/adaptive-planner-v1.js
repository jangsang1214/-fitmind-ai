(function(root,factory){
 const deps=typeof module==='object'&&module.exports
  ? {Decision:require('./decision-intelligence-v1.js')}
  : {Decision:root.GarangDecisionIntelligence};
 const api=factory(deps);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GarangAdaptivePlanner=api;
})(typeof globalThis!=='undefined'?globalThis:this,function({Decision}){
'use strict';

const ENGINE_VERSION='adaptive-planner-v1';
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rows=v=>Array.isArray(v)?v.filter(object):[];
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const round=(v,d=2)=>{const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
const asDate=now=>{const d=now instanceof Date?now:new Date(now||Date.now());return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const shiftDate=(date,delta)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);};
const goalText=s=>String(s?.profile?.goal||s?.userModel?.goal||s?.onboarding?.goal||'').toLowerCase();
const goalClass=s=>{const g=goalText(s);if(/run|marathon|5k|10k|러닝|달리기|마라톤/.test(g))return 'running';if(/fat|cut|lose|다이어트|감량|체지방/.test(g))return 'fat_loss';if(/muscle|gain|bulk|strength|근육|증량|벌크|근력/.test(g))return 'muscle_gain';return 'maintenance';};
const weeklyFrequency=s=>clamp(Math.round(Number(s?.userModel?.weeklyFrequency||s?.onboarding?.weeklyFrequency||4)),1,7);
const availableMinutes=s=>{const date=asDate(new Date()),checkins=rows(s.dailyCheckins||s.checkins).filter(x=>String(x.date)===date).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))),v=Number(checkins[0]?.availableMinutes??s?.userModel?.availableMinutes??s?.onboarding?.availableMinutes);return Number.isFinite(v)?clamp(Math.round(v),5,240):null;};
const activeMemories=m=>rows(m?.entries).filter(x=>x.status!=='superseded'&&x.status!=='expired'&&x.userConfirmed!==false);

const LABELS=Object.freeze({
 upper:{ko:'상체 훈련',en:'Upper body'},lower:{ko:'하체 훈련',en:'Lower body'},full_body:{ko:'전신 훈련',en:'Full body'},strength:{ko:'근력 훈련',en:'Strength'},easy_run:{ko:'이지 러닝',en:'Easy run'},quality_run:{ko:'퀄리티 러닝',en:'Quality run'},cardio:{ko:'유산소',en:'Cardio'},recovery:{ko:'회복 세션',en:'Recovery'},rest:{ko:'휴식',en:'Rest'}
});
const TEMPLATES=Object.freeze({
 muscle_gain:{2:['full_body','full_body'],3:['upper','lower','full_body'],4:['upper','lower','upper','lower'],5:['upper','lower','strength','upper','lower'],6:['upper','lower','upper','lower','strength','full_body'],7:['upper','lower','upper','lower','strength','full_body','recovery']},
 fat_loss:{2:['full_body','cardio'],3:['full_body','cardio','full_body'],4:['full_body','cardio','full_body','cardio'],5:['full_body','cardio','full_body','cardio','full_body'],6:['full_body','cardio','full_body','cardio','full_body','recovery'],7:['full_body','cardio','full_body','cardio','full_body','cardio','recovery']},
 running:{2:['easy_run','quality_run'],3:['easy_run','quality_run','strength'],4:['easy_run','quality_run','strength','easy_run'],5:['easy_run','quality_run','strength','easy_run','recovery'],6:['easy_run','quality_run','strength','easy_run','quality_run','recovery'],7:['easy_run','quality_run','strength','easy_run','quality_run','strength','recovery']},
 maintenance:{2:['full_body','cardio'],3:['upper','lower','cardio'],4:['upper','lower','cardio','full_body'],5:['upper','lower','cardio','upper','lower'],6:['upper','lower','cardio','upper','lower','recovery'],7:['upper','lower','cardio','upper','lower','full_body','recovery']}
});

function constraints(state,memoryContext,now){
 const date=asDate(now),checkins=rows(state.dailyCheckins||state.checkins).filter(x=>String(x.date)===date).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))),latest=checkins[0]||{},mem=activeMemories(memoryContext),avoid=mem.filter(x=>String(x.type)==='avoidance'||String(x.key).includes('avoid')).map(x=>String(x.value||'')),pref=mem.filter(x=>String(x.type)==='preference'||String(x.memoryClass)==='preference').map(x=>String(x.value||''));
 const minutes=Number(latest.availableMinutes??state?.userModel?.availableMinutes??state?.onboarding?.availableMinutes);
 return {availableMinutes:Number.isFinite(minutes)?clamp(Math.round(minutes),5,240):null,painCaution:latest.painCaution===true,avoidances:avoid.slice(0,8),preferences:pref.slice(0,8),weeklyFrequency:weeklyFrequency(state),goal:goalClass(state)};
}
function plannedForDate(state,date){return rows(state.planner).filter(x=>String(x.date)===date).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||'')));}
function normalizeType(type){const x=String(type||'').toLowerCase();if(/upper|상체/.test(x))return 'upper';if(/lower|하체/.test(x))return 'lower';if(/full|전신/.test(x))return 'full_body';if(/run|러닝|달리기/.test(x))return 'easy_run';if(/cardio|유산소/.test(x))return 'cardio';if(/recover|회복/.test(x))return 'recovery';if(/rest|휴식/.test(x))return 'rest';if(/strength|근력/.test(x))return 'strength';return 'full_body';}
function scheduleTypes(goal,frequency){return TEMPLATES[goal]?.[frequency]||TEMPLATES.maintenance[frequency]||TEMPLATES.maintenance[4];}
function distribute(types){
 const slots=[0,2,4,6,1,3,5],out=[];for(let i=0;i<types.length;i++)out.push({offset:slots[i]??i,type:types[i]});return out.sort((a,b)=>a.offset-b.offset);
}
function baselineWeek(state,{now=new Date()}={}){
 const start=asDate(now),frequency=weeklyFrequency(state),types=scheduleTypes(goalClass(state),frequency),training=distribute(types),byOffset=new Map(training.map(x=>[x.offset,x.type])),week=[];
 for(let i=0;i<7;i++){const date=shiftDate(start,i),existing=plannedForDate(state,date),locked=existing.find(x=>x.done===true||x.completed===true||x.locked===true);if(locked){week.push({date,type:normalizeType(locked.type||locked.title),title:String(locked.title||''),source:'existing',locked:true,existingId:locked.id});continue;}const type=byOffset.get(i)||'rest';week.push({date,type,title:LABELS[type]||LABELS.rest,source:'adaptive',locked:false,existingId:existing[0]?.id||null});}
 return week;
}
function deriveMode(userState,decision,score,constraint){
 let mode=String(decision?.mode||'maintain');const recovery=score?.components?.recovery?.score;
 if(constraint.painCaution||mode==='caution')return 'caution';if(mode==='collect_data')return 'collect_data';if(Number.isFinite(Number(recovery))&&Number(recovery)<40&&['maintain','progress','goal_focus'].includes(mode))mode='recover';if(Number.isFinite(Number(recovery))&&Number(recovery)<55&&mode==='progress')mode='reduce';return mode;
}
function scaleForMode(mode){return {caution:{intensity:0,volume:0,duration:.45},collect_data:{intensity:null,volume:null,duration:.8},recover:{intensity:.45,volume:.5,duration:.55},reduce:{intensity:.7,volume:.7,duration:.75},maintain:{intensity:1,volume:1,duration:1},progress:{intensity:1.05,volume:1.05,duration:1},goal_focus:{intensity:.9,volume:.9,duration:1}}[mode]||{intensity:1,volume:1,duration:1};}
function supportActions(score){const out=[];if(score?.components?.nutrition?.score!=null&&score.components.nutrition.score<60)out.push({type:'nutrition',code:'SUPPORT_NUTRITION',message:{ko:'오늘 식단 기록과 단백질 섭취를 우선 확인하세요.',en:'Prioritize meal logging and protein coverage today.'}});if(score?.components?.recovery?.score!=null&&score.components.recovery.score<55)out.push({type:'recovery',code:'SUPPORT_RECOVERY',message:{ko:'수면과 회복 상태를 오늘 계획의 우선 제약으로 둡니다.',en:'Treat recovery and sleep as primary constraints today.'}});return out.slice(0,3);}
function recommendToday(stateInput,{now=new Date(),userState={},decision=null,score=null,memoryContext=null}={}){
 const state=object(stateInput)?stateInput:{},date=asDate(now),constraint=constraints(state,memoryContext,now),existing=plannedForDate(state,date),locked=existing.find(x=>x.done===true||x.completed===true||x.locked===true),mode=deriveMode(userState,decision,score,constraint),scale=scaleForMode(mode),week=baselineWeek(state,{now}),base=week[0]||{date,type:'rest',title:LABELS.rest},reasonCodes=[`MODE_${mode.toUpperCase()}`];
 if(constraint.painCaution)reasonCodes.push('PAIN_CAUTION');if(constraint.availableMinutes!=null)reasonCodes.push('TIME_CONSTRAINT');if(score?.components?.recovery?.score!=null&&score.components.recovery.score<55)reasonCodes.push('RECOVERY_SCORE_LOW');
 let type=base.type;if(mode==='caution'||mode==='recover')type='recovery';if(mode==='collect_data'&&existing[0])type=normalizeType(existing[0].type||existing[0].title);if(locked)type=normalizeType(locked.type||locked.title);
 const defaultDuration={recovery:25,rest:0,easy_run:35,quality_run:45,cardio:35,upper:55,lower:55,full_body:50,strength:50}[type]??45,available=constraint.availableMinutes,duration=type==='rest'?0:Math.max(10,Math.round(Math.min(available||defaultDuration,defaultDuration)*scale.duration)),title=LABELS[type]||LABELS.full_body;
 const proposal={date,type,title,duration,intensityScale:scale.intensity,volumeScale:scale.volume,mode,confidence:round(Math.min(Number(decision?.confidence)||0,Number(score?.confidence)||1),2),reasonCodes:[...new Set(reasonCodes.concat(decision?.reasonCodes||[]))].slice(0,10),constraints:constraint,locked:!!locked,existingId:locked?.id||existing[0]?.id||null};
 let actionProposal=null;if(!locked&&mode!=='collect_data'&&type!=='rest')actionProposal={tool:proposal.existingId?'updatePlan':'createPlan',requiresConfirmation:true,args:{...(proposal.existingId?{id:proposal.existingId}:{}),date,title:title.ko,type,duration,intensityScale:scale.intensity,volumeScale:scale.volume,decisionEngineVersion:String(decision?.engineVersion||Decision?.ENGINE_VERSION||''),decisionMode:mode,reasonCodes:proposal.reasonCodes}};
 return {engineVersion:ENGINE_VERSION,asOf:date,mode,confidence:proposal.confidence,today:proposal,supportActions:supportActions(score),actionProposal,guardrails:{requiresConfirmation:true,noSilentMutation:true,preserveCompletedPlans:true,painCautionBlocksIntensity:true,medicalDiagnosis:false}};
}
function adaptWeek(stateInput,{now=new Date(),userState={},decision=null,score=null,memoryContext=null}={}){
 const state=object(stateInput)?stateInput:{},today=recommendToday(state,{now,userState,decision,score,memoryContext}),week=baselineWeek(state,{now});
 week[0]={...week[0],...today.today,title:today.today.title};
 if(['recover','reduce','caution'].includes(today.mode))for(let i=1;i<Math.min(3,week.length);i++){if(week[i].locked)continue;if(today.mode==='caution'){week[i]={...week[i],type:i===1?'recovery':'rest',title:LABELS[i===1?'recovery':'rest'],reasonCodes:['CAUTION_BUFFER']};}else if(today.mode==='recover'&&week[i].type!=='rest'){week[i]={...week[i],type:i===1?'recovery':week[i].type,title:LABELS[i===1?'recovery':week[i].type]||week[i].title,reasonCodes:['RECOVERY_BUFFER']};}}
 return {...today,week,changes:week.filter(x=>x.source==='adaptive'&&!x.locked).map(x=>({kind:x.existingId?'update':'create',date:x.date,id:x.existingId||null,type:x.type,title:x.title})),diagnostics:{frequency:weeklyFrequency(state),goal:goalClass(state),existingToday:plannedForDate(state,asDate(now)).length}};
}
function compactForContext(x){if(!object(x))return null;return {engineVersion:x.engineVersion,asOf:x.asOf,mode:x.mode,confidence:x.confidence,today:x.today?{date:x.today.date,type:x.today.type,title:x.today.title,duration:x.today.duration,intensityScale:x.today.intensityScale,volumeScale:x.today.volumeScale,reasonCodes:x.today.reasonCodes}:null,supportActions:x.supportActions,actionProposal:x.actionProposal,guardrails:x.guardrails};}
function diagnostics(stateInput,options={}){const x=adaptWeek(stateInput,options);return {engineVersion:x.engineVersion,asOf:x.asOf,mode:x.mode,confidence:x.confidence,todayType:x.today.type,duration:x.today.duration,weekCount:x.week.length,changeCount:x.changes.length,hasActionProposal:!!x.actionProposal,guardrails:x.guardrails};}
return Object.freeze({ENGINE_VERSION,LABELS,TEMPLATES,constraints,baselineWeek,recommendToday,adaptWeek,compactForContext,diagnostics});
});