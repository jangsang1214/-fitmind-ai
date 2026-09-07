(function(root,factory){
 const deps=typeof module==='object'&&module.exports
  ? {State:require('./state-intelligence-v1.js')}
  : {State:root.GarangStateIntelligence};
 const api=factory(deps);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GarangPerformanceScore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function({State}){
'use strict';

const ENGINE_VERSION='performance-score-v1';
const FORMULA_VERSION='garang-performance-v1';
const WEIGHTS=Object.freeze({workout:.25,recovery:.25,nutrition:.20,activity:.15,body:.15});
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rows=v=>Array.isArray(v)?v.filter(object):[];
const clamp=(v,min=0,max=100)=>Math.max(min,Math.min(max,Number(v)||0));
const round=(v,d=0)=>{if(v==null||!Number.isFinite(Number(v)))return null;const p=10**d;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const dateOf=v=>String(v||'').slice(0,10);
const shiftDate=(date,delta)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);};
const asDate=now=>{const d=now instanceof Date?now:new Date(now||Date.now());return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const asNow=date=>new Date(`${date}T23:59:59`);
const inWindow=(row,end,days)=>{const d=dateOf(row?.date);return /^\d{4}-\d{2}-\d{2}$/.test(d)&&d<=end&&d>=shiftDate(end,-(days-1));};
const goalText=s=>String(s?.profile?.goal||s?.userModel?.goal||s?.onboarding?.goal||'').toLowerCase();
const weeklyFrequency=s=>clamp(Number(s?.userModel?.weeklyFrequency||s?.onboarding?.weeklyFrequency||4),1,7);
const latestWeight=s=>{const body=rows(s.body).filter(x=>Number(x.weight)>0).sort((a,b)=>dateOf(b.date).localeCompare(dateOf(a.date)));return Number(body[0]?.weight||s?.profile?.weight)||null;};

function component(score,confidence,evidence,reasons=[]){
 if(score==null||!Number.isFinite(Number(score)))return {score:null,confidence:0,evidence,reasons};
 return {score:round(clamp(score),0),confidence:round(clamp(confidence,0,1),2),evidence,reasons};
}
function workoutComponent(s,userState,end){
 const recent=rows(s.workouts).filter(x=>inWindow(x,end,28)),sessions=new Set(recent.map(x=>x.sessionId||x.id)).size,expected=Math.max(4,weeklyFrequency(s)*4),adherence=clamp(sessions/expected*100);
 const loadBand=String(userState?.load?.band||'unknown'),loadQuality={stable:92,drop:62,spike:48,unknown:null}[loadBand];
 const values=[adherence];if(loadQuality!=null)values.push(loadQuality);
 const score=mean(values),confidence=clamp((Math.min(1,sessions/8)*.65)+(Number(userState?.load?.confidence)||0)*.35,0,1);
 const reasons=[];if(sessions<expected*.65)reasons.push('WORKOUT_CONSISTENCY_LOW');if(loadBand==='spike')reasons.push('TRAINING_LOAD_SPIKE');if(loadBand==='stable'&&sessions>=expected*.75)reasons.push('WORKOUT_LOAD_STABLE');
 return component(score,confidence,{sessions28:sessions,expectedSessions28:expected,loadBand},reasons);
}
function recoveryComponent(s,userState,end){
 const checkins=rows(s.dailyCheckins||s.checkins).filter(x=>inWindow(x,end,7)),readiness=Number(userState?.readiness?.value),fatigue=Number(userState?.fatigue?.score),parts=[];
 if(Number.isFinite(readiness))parts.push({v:clamp(readiness),w:.6});if(Number.isFinite(fatigue))parts.push({v:clamp(100-fatigue),w:.4});
 if(!parts.length)return component(null,0,{checkins7:checkins.length},['RECOVERY_DATA_MISSING']);
 const score=parts.reduce((sum,p)=>sum+p.v*p.w,0)/parts.reduce((sum,p)=>sum+p.w,0),signalConfidence=Math.max(Number(userState?.readiness?.confidence)||0,Number(userState?.fatigue?.confidence)||0),confidence=clamp(signalConfidence*.7+Math.min(1,checkins.length/4)*.3,0,1);
 const reasons=[];if(readiness<55)reasons.push('READINESS_LOW');if(fatigue>=60)reasons.push('FATIGUE_HIGH');if(readiness>=75&&fatigue<40)reasons.push('RECOVERY_STRONG');
 return component(score,confidence,{checkins7:checkins.length,readiness:Number.isFinite(readiness)?round(readiness):null,fatigue:Number.isFinite(fatigue)?round(fatigue):null},reasons);
}
function nutritionComponent(s,end){
 const meals=rows(s.meals).filter(x=>inWindow(x,end,14)),byDay=new Map();for(const meal of meals){const d=dateOf(meal.date);if(!byDay.has(d))byDay.set(d,{protein:0,kcal:0});const row=byDay.get(d);row.protein+=Math.max(0,Number(meal.protein)||0);row.kcal+=Math.max(0,Number(meal.kcal)||0);}
 if(!byDay.size)return component(null,0,{loggedDays14:0},['NUTRITION_DATA_MISSING']);
 const loggedDays=byDay.size,logging=clamp(loggedDays/10*100),weight=latestWeight(s),proteinTarget=weight?weight*1.6:null,proteinScore=proteinTarget?mean([...byDay.values()].map(x=>clamp(x.protein/proteinTarget*100))):null;
 const score=proteinScore==null?logging:logging*.55+proteinScore*.45,confidence=clamp(Math.min(1,loggedDays/10)*(proteinTarget?.7:.5),0,1),reasons=[];
 if(loggedDays<7)reasons.push('NUTRITION_LOGGING_GAPS');if(proteinScore!=null&&proteinScore<70)reasons.push('PROTEIN_CONSISTENCY_LOW');if(proteinScore!=null&&proteinScore>=90&&loggedDays>=7)reasons.push('NUTRITION_CONSISTENT');
 return component(score,confidence,{loggedDays14:loggedDays,proteinTarget:round(proteinTarget,1),averageProtein:round(mean([...byDay.values()].map(x=>x.protein)),1)},reasons);
}
function activityComponent(s,userState,end){
 const workouts=rows(s.workouts).filter(x=>inWindow(x,end,14)),runs=rows(s.runs).filter(x=>inWindow(x,end,14)),activeDays=new Set([...workouts,...runs].map(x=>dateOf(x.date))).size,expected=Math.max(4,weeklyFrequency(s)*2),consistency=clamp(activeDays/expected*100),trend=userState?.trends?.consistency?.direction||'stable',trendAdj=trend==='up'?6:trend==='down'?-8:0,score=clamp(consistency+trendAdj),confidence=clamp(Math.min(1,activeDays/6)*.8+(activeDays>0?.2:0),0,1),reasons=[];
 if(activeDays<expected*.65)reasons.push('ACTIVITY_CONSISTENCY_LOW');if(trend==='up')reasons.push('ACTIVITY_TREND_UP');if(trend==='down')reasons.push('ACTIVITY_TREND_DOWN');
 return component(score,confidence,{activeDays14:activeDays,expectedActiveDays14:expected,trend},reasons);
}
function bodyComponent(s,userState,end){
 const body=rows(s.body).filter(x=>inWindow(x,end,28)&&Number(x.weight)>0),count=body.length;if(!count)return component(null,0,{measurements28:0},['BODY_DATA_MISSING']);
 const goal=goalText(s),trend=String(userState?.trends?.bodyWeight?.direction||'unknown'),goalScore=Number(userState?.goalAlignment?.score),goalConfidence=Number(userState?.goalAlignment?.confidence)||0;
 let score=65;if(Number.isFinite(goalScore)&&goalConfidence>=.25)score=clamp(55+(goalScore-50)*.7);else if(/fat|cut|lose|체지방|감량|다이어트/.test(goal)&&trend==='down')score=82;else if(/muscle|gain|bulk|strength|근육|증량|벌크|근력/.test(goal)&&(trend==='up'||trend==='stable'))score=80;
 const confidence=clamp(Math.min(1,count/4)*.65+goalConfidence*.35,0,1),reasons=[];if(count<2)reasons.push('BODY_TREND_LOW_CONFIDENCE');if(trend!=='unknown')reasons.push(`BODY_WEIGHT_${trend.toUpperCase()}`);
 return component(score,confidence,{measurements28:count,weightTrend:trend,goalAlignment:Number.isFinite(goalScore)?round(goalScore):null},reasons);
}
function snapshot(stateInput,{now=new Date(),userState=null}={}){
 const s=object(stateInput)?stateInput:{},end=asDate(now),stateResult=userState||(State?.estimateState?State.estimateState(s,{now}):{}),components={
  workout:workoutComponent(s,stateResult,end),recovery:recoveryComponent(s,stateResult,end),nutrition:nutritionComponent(s,end),activity:activityComponent(s,stateResult,end),body:bodyComponent(s,stateResult,end)
 };
 let weight=0,total=0,confidenceWeight=0,confidenceTotal=0;for(const [key,c] of Object.entries(components)){if(c.score==null)continue;const w=WEIGHTS[key];weight+=w;total+=c.score*w;confidenceWeight+=w;confidenceTotal+=c.confidence*w;}
 const score=weight?round(total/weight):null,coverage=round(weight/Object.values(WEIGHTS).reduce((a,b)=>a+b,0),2),confidence=weight?round((confidenceTotal/confidenceWeight)*(coverage*.35+.65),2):0,missing=Object.entries(components).filter(([,v])=>v.score==null).map(([k])=>k);
 return {engineVersion:ENGINE_VERSION,formulaVersion:FORMULA_VERSION,asOf:end,score,confidence,band:score==null?'unknown':score<50?'low':score<70?'building':score<85?'strong':'excellent',components,missingData:{domains:missing,coverage,scoreImpact:0,confidenceImpact:round(-(1-coverage)*.35,2),policy:'missing-data-reduces-confidence-not-performance'},stateConfidence:round(Number(stateResult?.confidence)||0,2)};
}
function deltaReason(key,delta){const abs=Math.abs(delta),dir=delta>0?'UP':'DOWN';return {code:`${key.toUpperCase()}_${dir}`,component:key,delta:round(delta),impact:abs>=8?'high':abs>=4?'medium':'low',message:{ko:`${key} 점수가 ${abs}점 ${delta>0?'상승':'하락'}했습니다.`,en:`${key} score ${delta>0?'increased':'decreased'} by ${abs} points.`}};}
function compute(stateInput,{now=new Date(),userState=null,includeHistory=true}={}){
 const current=snapshot(stateInput,{now,userState}),result={...current,deltas:{yesterday:null,weekly:null},trend:{direction:'unknown',delta7:null},changeReasons:[]};
 if(!includeHistory||current.score==null)return result;
 const yesterday=snapshot(stateInput,{now:asNow(shiftDate(current.asOf,-1))}),weekAgo=snapshot(stateInput,{now:asNow(shiftDate(current.asOf,-7))});
 result.deltas.yesterday=yesterday.score==null?null:round(current.score-yesterday.score);result.deltas.weekly=weekAgo.score==null?null:round(current.score-weekAgo.score);result.trend={direction:result.deltas.weekly==null?'unknown':result.deltas.weekly>=3?'up':result.deltas.weekly<=-3?'down':'stable',delta7:result.deltas.weekly};
 const reasons=[];for(const key of Object.keys(current.components)){const a=current.components[key]?.score,b=yesterday.components[key]?.score;if(a!=null&&b!=null&&Math.abs(a-b)>=2)reasons.push(deltaReason(key,a-b));}
 if(!reasons.length){for(const code of Object.values(current.components).flatMap(x=>x.reasons||[]).slice(0,3))reasons.push({code,component:null,delta:0,impact:'info',message:{ko:code,en:code}});}
 result.changeReasons=reasons.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta)).slice(0,5);return result;
}
function compactForContext(x){if(!object(x))return null;return {engineVersion:x.engineVersion,formulaVersion:x.formulaVersion,asOf:x.asOf,score:x.score,confidence:x.confidence,band:x.band,components:Object.fromEntries(Object.entries(x.components||{}).map(([k,v])=>[k,{score:v.score,confidence:v.confidence,reasons:v.reasons}])),deltas:x.deltas,trend:x.trend,changeReasons:rows(x.changeReasons).slice(0,5),missingData:x.missingData};}
function diagnostics(stateInput,{now=new Date()}={}){const x=compute(stateInput,{now});return {engineVersion:x.engineVersion,formulaVersion:x.formulaVersion,asOf:x.asOf,score:x.score,confidence:x.confidence,coverage:x.missingData.coverage,missingDomains:x.missingData.domains,trend:x.trend};}
return Object.freeze({ENGINE_VERSION,FORMULA_VERSION,WEIGHTS,snapshot,compute,compactForContext,diagnostics});
});