(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GarangWorkoutIntelligence=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const ENGINE_VERSION='workout-intelligence-v1';
const DAY_MS=86400000;
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rows=v=>Array.isArray(v)?v.filter(object):[];
const num=(v,f=0)=>Number.isFinite(Number(v))?Number(v):f;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)));
const round=(v,d=1)=>{if(!Number.isFinite(v))return null;const p=10**d;return Math.round((v+Number.EPSILON)*p)/p;};
const dateOnly=v=>{if(typeof v!=='string')return null;const m=v.match(/^\d{4}-\d{2}-\d{2}/);return m?m[0]:null;};
function localDate(now=new Date()){const d=now instanceof Date?now:new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function dateMs(v){const d=dateOnly(v);return d?Date.parse(`${d}T12:00:00Z`):NaN;}
function shiftDate(date,delta){return new Date(dateMs(date)+delta*DAY_MS).toISOString().slice(0,10);}
function inRange(date,start,end){const t=dateMs(date);return Number.isFinite(t)&&t>=dateMs(start)&&t<=dateMs(end);}
function muscleKey(label){
 const x=String(label||'').toLowerCase();
 if(/가슴|흉근|pector|chest/.test(x))return 'chest';
 if(/등|광배|승모|back|lat/.test(x))return 'back';
 if(/어깨|삼각근|shoulder|delt/.test(x))return 'shoulders';
 if(/이두|biceps/.test(x))return 'biceps';
 if(/삼두|triceps/.test(x))return 'triceps';
 if(/복근|복부|코어|core|abs/.test(x))return 'core';
 if(/하체|대퇴|햄스트링|둔근|엉덩|종아리|leg|quad|hamstring|glute|calf/.test(x))return 'legs';
 if(/전신|컨디셔닝|full/.test(x))return 'full';
 return 'full';
}
function muscleLabel(key,language='ko'){
 const ko={chest:'가슴',back:'등',shoulders:'어깨',biceps:'이두',triceps:'삼두',core:'코어',legs:'하체',full:'전신',arms:'팔'};
 const en={chest:'Chest',back:'Back',shoulders:'Shoulders',biceps:'Biceps',triceps:'Triceps',core:'Core',legs:'Legs',full:'Full body',arms:'Arms'};
 return (language==='en'?en:ko)[key]||(language==='en'?'Full body':'전신');
}
function exerciseLookup(exerciseDb=[]){return new Map(rows(exerciseDb).map(x=>[String(x.exercise_name||'').trim().toLowerCase(),x]));}
function normalizedCheckin(state,now=new Date()){
 const today=localDate(now),all=[...rows(state?.dailyCheckins),...rows(state?.checkins)].filter(x=>dateOnly(x.date)===today).sort((a,b)=>String(a.updatedAt||'').localeCompare(String(b.updatedAt||'')));
 const c=all.at(-1);if(!c)return null;
 const sorenessValues=object(c.soreness)?Object.values(c.soreness).map(v=>num(v,NaN)).filter(Number.isFinite):[];
 return {
  ...c,
  sleepHours:num(c.sleepHours??c.sleep,NaN),
  energy:num(c.energy,NaN),
  stress:num(c.stress,NaN),
  sorenessMax:sorenessValues.length?Math.max(...sorenessValues):num(c.soreness,NaN),
  soreArea:String(c.soreArea||''),
  availableMinutes:num(c.availableMinutes??state?.onboarding?.availableMinutes,60)
 };
}
function readiness(state,{now=new Date()}={}){
 const c=normalizedCheckin(state,now);
 if(!c)return {score:null,band:'unknown',targetRPE:7,volumeScale:.9,checkin:null,reasons:['NO_TODAY_CHECKIN']};
 const parts=[],reasons=[];
 if(Number.isFinite(c.sleepHours)){parts.push(clamp(c.sleepHours/8*100,0,100));if(c.sleepHours<6)reasons.push('SHORT_SLEEP');}
 if(Number.isFinite(c.energy)){parts.push(clamp((c.energy-1)/4*100,0,100));if(c.energy<=2)reasons.push('LOW_ENERGY');}
 if(Number.isFinite(c.stress)){parts.push(clamp((5-c.stress)/4*100,0,100));if(c.stress>=4)reasons.push('HIGH_STRESS');}
 if(Number.isFinite(c.sorenessMax)){parts.push(clamp((5-c.sorenessMax)/5*100,0,100));if(c.sorenessMax>=4)reasons.push('HIGH_SORENESS');}
 const score=parts.length?round(parts.reduce((a,b)=>a+b,0)/parts.length,0):null;
 if(score===null)return {score:null,band:'unknown',targetRPE:7,volumeScale:.9,checkin:c,reasons:['INSUFFICIENT_CHECKIN']};
 if(score<45)return {score,band:'low',targetRPE:5.5,volumeScale:.6,checkin:c,reasons};
 if(score<65)return {score,band:'guarded',targetRPE:6.5,volumeScale:.8,checkin:c,reasons};
 if(score<80)return {score,band:'ready',targetRPE:7.5,volumeScale:.95,checkin:c,reasons};
 return {score,band:'high',targetRPE:8,volumeScale:1,checkin:c,reasons};
}
function setDetailVolume(record){
 const details=rows(record?.setDetails||record?.setsDetail);
 if(!details.length)return null;
 return details.reduce((sum,s)=>sum+Math.max(0,num(s.weight))*Math.max(0,num(s.reps)),0);
}
function recordVolume(record){const stored=num(record?.volume,NaN);if(Number.isFinite(stored)&&stored>=0)return stored;const detail=setDetailVolume(record);if(detail!==null)return detail;return Math.max(0,num(record?.weight))*Math.max(0,num(record?.reps))*Math.max(1,num(record?.sets,1));}
function analyzeMuscleLoad(state,exerciseDb=[],{now=new Date(),days=7}={}){
 const asOf=localDate(now),start=shiftDate(asOf,-Math.max(0,days-1)),lookup=exerciseLookup(exerciseDb),groups=new Map();
 rows(state?.workouts).forEach((w,index)=>{
  const date=dateOnly(w.date);if(!date||!inRange(date,start,asOf))return;
  const ref=lookup.get(String(w.name||'').trim().toLowerCase()),key=muscleKey(w.primaryMuscle||ref?.primary_muscle),label=String(w.primaryMuscle||ref?.primary_muscle||muscleLabel(key));
  if(!groups.has(key))groups.set(key,{key,label,records:0,sets:0,volume:0,rpeWeighted:0,rpeWeight:0,sessions:new Set(),latestDate:'',effort:0});
  const g=groups.get(key),sets=Math.max(1,num(w.sets,1)),rpe=clamp(num(w.rpe,7),1,10),volume=recordVolume(w);
  g.records++;g.sets+=sets;g.volume+=volume;g.rpeWeighted+=rpe*sets;g.rpeWeight+=sets;g.effort+=sets*rpe;g.sessions.add(w.sessionId||w.id||`${date}:${index}`);if(date>g.latestDate)g.latestDate=date;
 });
 return [...groups.values()].map(g=>{const avgRPE=round(g.rpeWeighted/Math.max(1,g.rpeWeight),1);return {key:g.key,label:g.label,records:g.records,sets:g.sets,volume:Math.round(g.volume),avgRPE,sessionCount:g.sessions.size,latestDate:g.latestDate,effort:round(g.effort,1),intensity:avgRPE>=8.5?'high':avgRPE>=7.5?'moderate_high':avgRPE>=6?'moderate':'light'};}).sort((a,b)=>b.effort-a.effort||b.latestDate.localeCompare(a.latestDate));
}
function exerciseFamily(name){const x=String(name||'').toLowerCase();if(/스쿼트|squat/.test(x))return 'squat';if(/벤치|체스트프레스|chest press|bench/.test(x))return 'chest_press';if(/플라이|fly|pec deck|펙덱/.test(x))return 'fly';if(/푸시업|push.?up/.test(x))return 'pushup';if(/딥|dip/.test(x))return 'dip';if(/로우|row/.test(x))return 'row';if(/풀업|친업|랫풀|pulldown|pull.?up|chin.?up/.test(x))return 'vertical_pull';if(/데드리프트|deadlift/.test(x))return 'hinge';if(/런지|lunge|스플릿/.test(x))return 'lunge';if(/레그프레스|leg press/.test(x))return 'leg_press';if(/레그컬|hamstring curl|leg curl/.test(x))return 'leg_curl';if(/레그익스텐션|leg extension/.test(x))return 'leg_extension';if(/숄더프레스|오버헤드|shoulder press|overhead/.test(x))return 'shoulder_press';if(/레터럴|lateral/.test(x))return 'lateral_raise';if(/컬|curl/.test(x))return 'curl';if(/트라이셉|푸시다운|extension|익스텐션/.test(x))return 'triceps';if(/플랭크|plank/.test(x))return 'plank';if(/크런치|crunch/.test(x))return 'crunch';return x.split(/\s+/).slice(0,2).join('_')||'other';}
function recentByName(state){const map=new Map();rows(state?.workouts).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).forEach(w=>{const k=String(w.name||'').trim().toLowerCase();if(k&&!map.has(k))map.set(k,w);});return map;}
function candidatesFor(exerciseDb,key){const all=rows(exerciseDb).filter(x=>String(x.exercise_name||'').trim());if(key==='arms')return all.filter(x=>['biceps','triceps'].includes(muscleKey(x.primary_muscle)));if(key==='full')return all;return all.filter(x=>muscleKey(x.primary_muscle)===key);}
function pickDiverse(candidates,count,state){
 const recent=recentByName(state),sorted=candidates.map((ex,index)=>{const name=String(ex.exercise_name||'').trim(),last=recent.get(name.toLowerCase()),penalty=last?Math.max(0,4-(Math.max(0,(Date.now()-dateMs(last.date))/DAY_MS))):0;return {ex,index,penalty,family:exerciseFamily(name)};}).sort((a,b)=>a.penalty-b.penalty||a.index-b.index);
 const out=[],families=new Set();for(const item of sorted){if(families.has(item.family))continue;out.push(item.ex);families.add(item.family);if(out.length>=count)break;}for(const item of sorted){if(out.includes(item.ex))continue;out.push(item.ex);if(out.length>=count)break;}return out;
}
function repsFor(name,intensity){const compound=/스쿼트|벤치|프레스|로우|풀업|친업|랫풀|데드리프트|dip|딥|squat|bench|press|row|deadlift/i.test(String(name||''));if(compound)return intensity==='hard'?6:intensity==='recovery'?10:8;return intensity==='hard'?10:intensity==='recovery'?15:12;}
function defaultIntensity(state,{now=new Date()}={}){const r=readiness(state,{now});if(r.score===null)return {key:'moderate',label:'보통',rpe:7,sets:3,restSec:90,volumeScale:.9,readiness:r};if(r.score<45)return {key:'recovery',label:'회복',rpe:5.5,sets:2,restSec:60,volumeScale:.6,readiness:r};if(r.score<65)return {key:'light',label:'가볍게',rpe:6.5,sets:2,restSec:75,volumeScale:.8,readiness:r};if(r.score<80)return {key:'moderate',label:'보통',rpe:7.5,sets:3,restSec:90,volumeScale:.95,readiness:r};return {key:'hard',label:'강하게',rpe:8.5,sets:4,restSec:120,volumeScale:1,readiness:r};}
function intensitySpec(key,state,now){const presets={recovery:{key:'recovery',label:'회복',rpe:5.5,sets:2,restSec:60,volumeScale:.6},light:{key:'light',label:'가볍게',rpe:6.5,sets:2,restSec:75,volumeScale:.8},moderate:{key:'moderate',label:'보통',rpe:7.5,sets:3,restSec:90,volumeScale:.95},hard:{key:'hard',label:'강하게',rpe:8.5,sets:4,restSec:120,volumeScale:1}};return key&&key!=='auto'&&presets[key]?{...presets[key],readiness:readiness(state,{now})}:defaultIntensity(state,{now});}
function autoTarget(state,exerciseDb,now){const loads=analyzeMuscleLoad(state,exerciseDb,{now,days:7}),map=new Map(loads.map(x=>[x.key,x.effort])),r=readiness(state,{now}),soreKey=r.checkin?.soreArea?muscleKey(r.checkin.soreArea):null,keys=['chest','back','legs','shoulders','core'];return keys.slice().sort((a,b)=>{const ap=(soreKey===a&&num(r.checkin?.sorenessMax)<4)?0:(soreKey===a?999:0),bp=(soreKey===b&&num(r.checkin?.sorenessMax)<4)?0:(soreKey===b?999:0);return (map.get(a)||0)+ap-(map.get(b)||0)-bp;})[0]||'full';}
function generateWorkoutPlan(state,exerciseDb=[],spec={},options={}){
 const now=options.now||new Date(),minutes=clamp(Math.round(num(spec.minutes,state?.onboarding?.availableMinutes||60)),15,120),target=spec.target&&spec.target!=='auto'?spec.target:autoTarget(state,exerciseDb,now),requested=String(spec.intensity||'auto'),base=intensitySpec(requested,state,now),r=base.readiness||readiness(state,{now});let adjusted=false,adjustReason='',rpe=base.rpe,sets=base.sets,restSec=base.restSec,volumeScale=base.volumeScale,intensity=base.key;
 const targetKeys=target==='arms'?['biceps','triceps']:[target];const soreKey=r.checkin?.soreArea?muscleKey(r.checkin.soreArea):null,soreness=num(r.checkin?.sorenessMax,0);
 if(r.score!==null&&r.score<50&&rpe>6.5){adjusted=true;adjustReason='LOW_READINESS';rpe=6.5;sets=Math.min(sets,3);restSec=Math.max(restSec,90);volumeScale=Math.min(volumeScale,.75);intensity='light';}
 if(soreKey&&targetKeys.includes(soreKey)&&soreness>=4&&rpe>6){adjusted=true;adjustReason='TARGET_SORENESS';rpe=6;sets=Math.min(sets,2);volumeScale=Math.min(volumeScale,.65);intensity='recovery';}
 const count=clamp(Math.round(minutes/12),2,6),latest=recentByName(state),items=[];
 if(target==='full'){
  const order=['legs','chest','back','shoulders','core'];for(let i=0;i<count;i++){const key=order[i%order.length],candidate=pickDiverse(candidatesFor(exerciseDb,key),1,state)[0];if(candidate&&!items.some(x=>x.name===candidate.exercise_name))items.push({candidate,key});}
 }else{
  const picked=pickDiverse(candidatesFor(exerciseDb,target),count,state);picked.forEach(candidate=>items.push({candidate,key:muscleKey(candidate.primary_muscle)}));
 }
 const perExercise=Math.max(5,Math.floor(minutes/Math.max(1,items.length)));
 const exercises=items.map(({candidate,key})=>{const name=String(candidate.exercise_name||''),last=latest.get(name.toLowerCase()),lastWeight=Math.max(0,num(last?.weight,0)),weightFactor=intensity==='recovery'?.75:intensity==='light'?.9:1,suggestedWeight=lastWeight?Math.max(0,round(lastWeight*weightFactor,1)):null;return {name,muscle:key||target,sets,reps:repsFor(name,intensity),targetRPE:round(rpe,1),restSec,duration:perExercise,suggestedWeight,lastWeight:lastWeight||null};});
 const loads=analyzeMuscleLoad(state,exerciseDb,{now,days:7}),targetLoad=loads.filter(x=>target==='arms'?['biceps','triceps'].includes(x.key):target==='full'?true:x.key===target),highest=loads[0]||null;
 return {engineVersion:ENGINE_VERSION,target,minutes,intensity,requestedIntensity:requested,targetRPE:round(rpe,1),sets,restSec,volumeScale:round(volumeScale,2),adjusted,adjustReason,readiness:r,exercises,recentTargetLoad:targetLoad,highestRecentLoad:highest};
}
function classifyCoachIntent(q){const x=String(q||'').toLowerCase();if(/식단|단백질|영양|먹|nutrition|protein|meal/.test(x))return 'nutrition';if(/계획|루틴|프로그램|짜줘|짜 줘|만들어줘|만들어 줘|create a plan|workout plan|routine/.test(x))return 'plan';if((/최근|기록|분석|recent|record|analy/.test(x)&&/운동|workout|training|exercise/.test(x)))return 'recent_workout';if(/회복|수면|피로|컨디션|상태|recovery|readiness|fatigue|sleep/.test(x))return 'recovery';if(/운동 강도|강도|오늘 운동|training intensity|intensity/.test(x))return 'training_intensity';return 'other';}
function fmtLoad(x,language){return language==='en'?`${muscleLabel(x.key,'en')}: ${x.sessionCount} session(s) · ${x.sets} sets · avg RPE ${x.avgRPE} · latest ${x.latestDate}`:`${muscleLabel(x.key,'ko')}: ${x.sessionCount}회 · ${x.sets}세트 · 평균 RPE ${x.avgRPE} · 최근 ${x.latestDate}`;}
function answerCoach(state,exerciseDb,q,{now=new Date(),language='ko'}={}){
 const intent=classifyCoachIntent(q),r=readiness(state,{now}),loads=analyzeMuscleLoad(state,exerciseDb,{now,days:7});
 if(intent==='training_intensity'){
  const rec=defaultIntensity(state,{now}),high=loads[0];
  if(language==='en')return `Today's recommended training intensity is RPE ${rec.rpe} with about ${Math.round(rec.volumeScale*100)}% of normal volume.${r.score===null?' No check-in is available, so this is based mainly on recent training records.':` Readiness is ${r.score}/100.`}${high?` Your highest recent load is ${muscleLabel(high.key,'en')} (${high.sets} sets, avg RPE ${high.avgRPE}), so avoid adding unnecessary volume there.`:''}`;
  return `오늘 권장 운동 강도는 RPE ${rec.rpe} 전후, 평소 볼륨의 약 ${Math.round(rec.volumeScale*100)}%야.${r.score===null?' 오늘 체크인이 없어 최근 훈련 기록을 중심으로 잡았어.':` 오늘 회복 점수는 ${r.score}/100이야.`}${high?` 최근 부하가 가장 큰 부위는 ${muscleLabel(high.key)}이고 ${high.sets}세트 · 평균 RPE ${high.avgRPE}였어. 이 부위는 불필요한 추가 볼륨을 줄이는 편이 좋아.`:''}`;
 }
 if(intent==='recovery'){
  const c=r.checkin;if(!c)return language==='en'?'There is no check-in for today, so I cannot give a reliable recovery score yet. Save sleep, energy, stress and soreness; recent training load can then be combined with it.':'오늘 체크인이 없어 회복 점수를 확정해서 말하긴 어려워. 수면·에너지·스트레스·근육통을 저장하면 최근 훈련 부하와 함께 회복 상태를 따로 판단할 수 있어.';
  const sleep=Number.isFinite(c.sleepHours)?`${c.sleepHours.toFixed(1)}h`:'—',energy=Number.isFinite(c.energy)?`${c.energy}/5`:'—',stress=Number.isFinite(c.stress)?`${c.stress}/5`:'—',sore=Number.isFinite(c.sorenessMax)?`${c.sorenessMax}/5`:'—';
  if(language==='en')return `Recovery readiness is ${r.score}/100 (${r.band}). Sleep ${sleep} · Energy ${energy} · Stress ${stress} · Soreness ${sore}. ${r.score<50?'Prioritize recovery and keep training at RPE 6 or below.':r.score<70?'Train conservatively and leave extra reps in reserve.':'Your current check-in supports a normal session, while still respecting the most recently loaded muscles.'}`;
  return `오늘 회복 상태는 ${r.score}/100 (${r.band})이야. 수면 ${sleep} · 에너지 ${energy} · 스트레스 ${stress} · 근육통 ${sore}를 반영했어. ${r.score<50?'오늘은 회복 우선으로 두고 운동한다면 RPE 6 이하가 좋아.':r.score<70?'평소보다 보수적으로 하고 여유 반복을 남기는 편이 좋아.':'현재 체크인만 보면 정상 훈련이 가능한 범위야. 다만 최근 많이 쓴 부위의 추가 볼륨은 따로 조절하는 게 좋아.'}`;
 }
 if(intent==='recent_workout'){
  if(!loads.length)return language==='en'?'There are no workout records in the last 7 days to analyze by body part yet.':'최근 7일 운동 기록이 없어 부위별 부하를 분석할 데이터가 아직 없어.';
  const lines=loads.slice(0,5).map(x=>fmtLoad(x,language));const top=loads[0];
  if(language==='en')return `Recent 7-day workload by body part:\n${lines.map(x=>`• ${x}`).join('\n')}\n\nThe highest recent load is ${muscleLabel(top.key,'en')}. I am prioritizing body-part load, set count and RPE rather than simply naming the last exercise.`;
  return `최근 7일을 운동 이름이 아니라 부위별 부하로 보면:\n${lines.map(x=>`• ${x}`).join('\n')}\n\n가장 많이 누적된 부위는 ${muscleLabel(top.key)}이야. 이제 최근 운동 분석은 마지막 종목명이 아니라 부위·세트 수·평균 RPE를 중심으로 판단해.`;
 }
 if(intent==='plan'){
  const minutes=Math.round(num(r.checkin?.availableMinutes,state?.onboarding?.availableMinutes||60)),plan=generateWorkoutPlan(state,exerciseDb,{target:'auto',minutes,intensity:'auto'},{now});
  const body=plan.exercises.map((x,i)=>`${i+1}. ${x.name} · ${x.sets}×${x.reps} · RPE ${x.targetRPE} · 휴식 ${x.restSec}초`).join('\n');
  if(language==='en')return `I built a ${plan.minutes}-minute ${muscleLabel(plan.target,'en')} session from today's recovery and recent body-part load. Target RPE: ${plan.targetRPE}.\n${plan.exercises.map((x,i)=>`${i+1}. ${x.name} · ${x.sets}×${x.reps} · RPE ${x.targetRPE} · rest ${x.restSec}s`).join('\n')}\n\nUse the Daily Workout card on Today if you want to choose the body part, duration and intensity yourself.`;
  return `오늘 회복 상태와 최근 부위별 부하를 반영해서 ${plan.minutes}분 ${muscleLabel(plan.target)} 루틴을 만들었어. 목표 강도는 RPE ${plan.targetRPE}야.\n${body||'추천 가능한 운동 데이터가 부족해.'}\n\n홈의 데일리 운동 추천에서 부위·시간·강도를 직접 고르면 같은 기준으로 다시 짤 수 있어.`;
 }
 return '';
}
return Object.freeze({ENGINE_VERSION,muscleKey,muscleLabel,normalizedCheckin,readiness,analyzeMuscleLoad,generateWorkoutPlan,classifyCoachIntent,answerCoach});
});
