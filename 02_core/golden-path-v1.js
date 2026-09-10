(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangGoldenPath=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='golden-path-v1';
const STEP_ORDER=Object.freeze(['onboarding','first_record','coach','plan','execute','accumulation']);
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const list=value=>Array.isArray(value)?value:[];
const clean=value=>String(value??'').trim();
const clone=value=>value===undefined?undefined:JSON.parse(JSON.stringify(value));
const dateOnly=value=>{
  const raw=clean(value),candidate=raw.slice(0,10);
  return DATE_RE.test(candidate)?candidate:null;
};
const localDate=()=>{
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const dateOfRow=row=>[row?.date,row?.day,row?.performedAt,row?.performed_on,row?.createdAt,row?.created_at].map(dateOnly).find(Boolean)||null;
const eventDate=event=>dateOnly(event?.props?.date)||dateOnly(event?.date)||dateOnly(event?.at);
const goalLabel=state=>clean(state?.profile?.goal||state?.onboarding?.goal)||'퍼포먼스 향상';
const shiftDate=(date,offset)=>{const [year,month,day]=date.split('-').map(Number),value=new Date(Date.UTC(year,month-1,day+offset));return `${value.getUTCFullYear()}-${String(value.getUTCMonth()+1).padStart(2,'0')}-${String(value.getUTCDate()).padStart(2,'0')}`;};
function latestRecoveryDate(state,today){
  return [...list(state?.dailyCheckins),...list(state?.checkins)].map(dateOfRow).filter(date=>date&&date<=today).sort().at(-1)||null;
}
const meaningfulDomains=Object.freeze([
  ['workouts','workout'],
  ['meals','nutrition'],
  ['runs','running'],
  ['body','body']
]);

function meaningfulRecords(state){
  const domains=Object.fromEntries(meaningfulDomains.map(([key,id])=>[id,list(state?.[key]).length>0]));
  const count=meaningfulDomains.reduce((total,[key])=>total+list(state?.[key]).length,0);
  return {count,hasMeaningful:count>0,domains};
}

function coachEvidence(state){
  const events=list(state?.analytics?.events);
  const chats=list(state?.aiChat);
  const userMessage=chats.some(row=>String(row?.role||'').toLowerCase()==='user'&&clean(row?.text||row?.content));
  const evidenceNames=new Set(['ai_chat_started','ai_chat_answered','ai_plan_applied','coach_action_requested']);
  const eventEvidence=events.some(row=>evidenceNames.has(clean(row?.name))||(
    clean(row?.name)==='screen_viewed'&&clean(row?.props?.screen||row?.props?.route)==='coach'
  ));
  return {used:userMessage||eventEvidence,userMessage,eventEvidence};
}

function planType(value){
  const raw=clean(value).toLowerCase();
  if(/run|running|러닝/.test(raw))return 'running';
  if(/meal|nutrition|식단|영양/.test(raw))return 'nutrition';
  if(/recover|recovery|sleep|회복|수면/.test(raw))return 'recovery';
  if(/body|inbody|체성분|체중/.test(raw))return 'body';
  if(/rest|휴식/.test(raw))return 'rest';
  if(/workout|strength|exercise|운동|근력/.test(raw))return 'workout';
  return 'other';
}

function stampOf(value){
  const raw=value?.createdAt||value?.created_at||value?.updatedAt||value?.updated_at||value?.performedAt||value?.performed_at;
  const stamp=Date.parse(raw||'');return Number.isFinite(stamp)?stamp:null;
}
function afterPlan(candidate,plan){
  const planStamp=stampOf(plan),rows=Array.isArray(candidate?.rows)?candidate.rows:[candidate];
  if(planStamp===null||!rows.length)return true;
  const observed=rows.map(stampOf).filter(stamp=>stamp!==null);
  return !observed.length||observed.some(stamp=>stamp>=planStamp);
}
function recordCandidates(state,date,type){
  const rows=key=>list(state?.[key]).filter(row=>dateOfRow(row)===date);
  if(type==='workout'){
    const source=rows('workouts'),groups=new Map();
    source.forEach((row,index)=>{const id=clean(row?.sessionId||row?.session_id||row?.workoutId||row?.workout_id)||`row-${index}`;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(row);});
    return [...groups].map(([id,items])=>({token:`workout:${id}`,rows:items}));
  }
  if(type==='running')return rows('runs').map((row,index)=>({token:`running:${clean(row?.id)||index}`,rows:[row]}));
  if(type==='nutrition')return rows('meals').map((row,index)=>({token:`nutrition:${clean(row?.id)||index}`,rows:[row]}));
  if(type==='body')return rows('body').map((row,index)=>({token:`body:${clean(row?.id)||index}`,rows:[row]}));
  if(type==='recovery')return [...list(state?.dailyCheckins),...list(state?.checkins)].filter(row=>dateOfRow(row)===date).map((row,index)=>({token:`recovery:${clean(row?.id)||index}`,rows:[row]}));
  return [];
}

function execution(state,today){
  const rows=list(state?.planner).map((row,index)=>({row,index,date:dateOfRow(row)||today})).filter(item=>item.date&&item.date<=today).sort((a,b)=>`${a.date}|${clean(a.row?.time)||'99:99'}|${clean(a.row?.id)||a.index}`.localeCompare(`${b.date}|${clean(b.row?.time)||'99:99'}|${clean(b.row?.id)||b.index}`));
  const used=new Set(),candidates=new Map();
  const claim=(date,type,plan)=>{
    const key=`${date}|${type}`;if(!candidates.has(key))candidates.set(key,recordCandidates(state,date,type));
    const row=candidates.get(key).find(item=>!used.has(item.token)&&afterPlan(item,plan));if(!row)return false;used.add(row.token);return true;
  };
  const items=rows.map(({row,date})=>{
    const type=planType(row?.type||row?.category),explicit=row?.completed===true||row?.done===true||String(row?.status||'').toLowerCase()==='completed';
    const derived=!explicit&&type!=='rest'&&type!=='other'&&claim(date,type,row);
    return {id:clean(row?.id),date,type,title:clean(row?.title||row?.name)||'계획',goalLabel:clean(row?.goalLabel||row?.goal),executed:explicit||derived,explicitCompleted:explicit,derivedCompleted:derived,evidence:explicit?'PLANNER_COMPLETED':(derived?'ACTUAL_RECORD_MATCH':'NONE')};
  });
  const executed=items.filter(row=>row.executed).length;
  return {planned:items.length,executed,allExecuted:items.length>0&&executed===items.length,hasExecution:executed>0,items,nextPlan:items.find(row=>!row.executed)||items[0]||null};
}

function latestProgressVisit(state,today){
  const dates=list(state?.analytics?.events).filter(event=>{
    const name=clean(event?.name),screen=clean(event?.props?.screen||event?.props?.route);
    return name==='screen_viewed'&&(screen==='progress'||screen==='accumulation');
  }).map(eventDate).filter(date=>date&&date<=today).sort();
  return dates.at(-1)||null;
}

function derive(state,options={}){
  const safe=state&&typeof state==='object'?state:{},today=dateOnly(options.today)||localDate(),records=meaningfulRecords(safe),coach=coachEvidence(safe),plans=execution(safe,today),progressDate=latestProgressVisit(safe,today),onboardingComplete=safe.onboarding?.complete===true||safe.onboarding?.skipped===true,recoveryDate=latestRecoveryDate(safe,today),recoveryReady=!!recoveryDate&&recoveryDate>=shiftDate(today,-2);
  const completed={
    onboarding:onboardingComplete,
    first_record:records.hasMeaningful,
    coach:coach.used,
    plan:plans.planned>0,
    execute:plans.allExecuted,
    accumulation:!!progressDate
  };
  const firstUnmet=STEP_ORDER.find(step=>!completed[step]);
  const step=firstUnmet||'complete';
  return {
    version:VERSION,
    today,
    goalLabel:goalLabel(safe),
    recoveryDate,
    recoveryReady,
    step,
    completed:step==='complete',
    steps:STEP_ORDER.map(id=>({id,complete:!!completed[id]})),
    records,
    coachUsed:coach.used,
    planCount:plans.planned,
    execution:{planned:plans.planned,executed:plans.executed,allExecuted:plans.allExecuted,hasExecution:plans.hasExecution},
    nextPlan:clone(plans.nextPlan),
    accumulationViewed:!!progressDate,
    progressDate,
    revisitAvailable:!!progressDate&&progressDate<today
  };
}

return Object.freeze({VERSION,STEP_ORDER,localDate,dateOfRow,eventDate,meaningfulRecords,coachEvidence,execution,derive});
});
