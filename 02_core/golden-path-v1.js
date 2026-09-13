(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangGoldenPath=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='golden-path-v1.1';
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
const goalClass=state=>{const raw=goalLabel(state).toLowerCase();if(/근육|muscle|bulk|hypertrophy/.test(raw))return'muscle_gain';if(/체지방|체중 감소|감량|fat.?loss|weight.?loss|cut/.test(raw))return'fat_loss';if(/러닝|running|run/.test(raw))return'running_performance';if(/퍼포먼스|performance|strength|기록 향상/.test(raw))return'performance';return'maintenance';};
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
  const assistantMessage=chats.some(row=>['assistant','ai','coach'].includes(String(row?.role||'').toLowerCase())&&clean(row?.text||row?.content));
  const meaningfulEventNames=new Set(['coach_recommendation_shown','ai_chat_answered','daily_plan_applied','ai_plan_applied','agent_proposal_confirmed']);
  const eventEvidence=events.some(row=>meaningfulEventNames.has(clean(row?.name)));
  return {used:assistantMessage||eventEvidence,assistantMessage,eventEvidence};
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

function parseStamp(raw){const stamp=Date.parse(raw||'');return Number.isFinite(stamp)?stamp:null;}
function stampOf(value){
  const raw=value?.performedAt||value?.performed_at||value?.completedAt||value?.completed_at||value?.updatedAt||value?.updated_at||value?.createdAt||value?.created_at;
  return parseStamp(raw);
}
function explicitExecutionStamp(value){return parseStamp(value?.completedAt||value?.completed_at||value?.updatedAt||value?.updated_at);}
function eventStamp(event){return parseStamp(event?.at||event?.createdAt||event?.created_at||event?.props?.at||event?.props?.timestamp);}
function candidateStamp(candidate){const stamps=list(candidate?.rows).map(stampOf).filter(stamp=>stamp!==null);return stamps.length?Math.max(...stamps):null;}
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
  const rows=list(state?.planner).map((row,index)=>({row,index,date:dateOfRow(row)||today})).filter(item=>item.date&&item.date<=today).sort((a,b)=>a.date.localeCompare(b.date)||((Number.isFinite(Number(a.row?.order))?Number(a.row.order):Number.POSITIVE_INFINITY)-(Number.isFinite(Number(b.row?.order))?Number(b.row.order):Number.POSITIVE_INFINITY))||(clean(a.row?.time)||'99:99').localeCompare(clean(b.row?.time)||'99:99')||(clean(a.row?.id)||String(a.index)).localeCompare(clean(b.row?.id)||String(b.index)));
  const used=new Set(),candidates=new Map();
  const claim=(date,type,plan)=>{
    const key=`${date}|${type}`;if(!candidates.has(key))candidates.set(key,recordCandidates(state,date,type));
    const matched=candidates.get(key).find(item=>!used.has(item.token)&&afterPlan(item,plan));if(!matched)return null;used.add(matched.token);return matched;
  };
  const items=rows.map(({row,date})=>{
    const type=planType(row?.type||row?.category),explicit=row?.completed===true||row?.done===true||String(row?.status||'').toLowerCase()==='completed';
    const matched=!explicit&&type!=='rest'&&type!=='other'?claim(date,type,row):null,derived=!!matched,executionStamp=explicit?explicitExecutionStamp(row):candidateStamp(matched);
    return {id:clean(row?.id),date,type,title:clean(row?.title||row?.name)||'계획',goalClass:clean(row?.goalClass)||goalClass(state),goalLabel:clean(row?.goalLabel||row?.goal),recommendationId:clean(row?.recommendationId)||null,executed:explicit||derived,executionAt:executionStamp===null?null:new Date(executionStamp).toISOString(),explicitCompleted:explicit,derivedCompleted:derived,evidence:explicit?'PLANNER_COMPLETED':(derived?'ACTUAL_RECORD_MATCH':'NONE')};
  });
  const executed=items.filter(row=>row.executed).length;
  return {planned:items.length,executed,allExecuted:items.length>0&&executed===items.length,hasExecution:executed>0,items,nextPlan:items.find(row=>!row.executed)||items[0]||null};
}

function latestProgressEvidence(state,today){
  const evidence=list(state?.analytics?.events).filter(event=>{
    const name=clean(event?.name),screen=clean(event?.props?.screen||event?.props?.route);
    return name==='accumulation_viewed'||(name==='screen_viewed'&&(screen==='progress'||screen==='accumulation'));
  }).map(event=>({date:eventDate(event),stamp:eventStamp(event)})).filter(row=>row.date&&row.date<=today).sort((a,b)=>a.date.localeCompare(b.date)||((a.stamp??Number.NEGATIVE_INFINITY)-(b.stamp??Number.NEGATIVE_INFINITY)));
  return evidence.at(-1)||null;
}
function latestProgressVisit(state,today){return latestProgressEvidence(state,today)?.date||null;}
function accumulationEvidence(state,today,plans){
  const progress=latestProgressEvidence(state,today),executed=list(plans?.items).filter(row=>row?.executed&&row?.date).map(row=>({date:row.date,stamp:parseStamp(row.executionAt)})).sort((a,b)=>a.date.localeCompare(b.date)||((a.stamp??Number.NEGATIVE_INFINITY)-(b.stamp??Number.NEGATIVE_INFINITY))),latestExecution=executed.at(-1)||null;
  let meaningful=false;
  if(progress&&latestExecution){
    if(progress.date>latestExecution.date)meaningful=true;
    else if(progress.date===latestExecution.date)meaningful=progress.stamp===null||latestExecution.stamp===null?true:progress.stamp>=latestExecution.stamp;
  }
  return {meaningful,date:meaningful?progress?.date||null:null,viewedDate:progress?.date||null,viewedAt:progress?.stamp===null||progress?.stamp===undefined?null:new Date(progress.stamp).toISOString(),latestExecutionDate:latestExecution?.date||null,latestExecutionAt:latestExecution?.stamp===null||latestExecution?.stamp===undefined?null:new Date(latestExecution.stamp).toISOString()};
}
function evidenceEntry(type,value,label){return {type,value:value??null,label:label||null};}
function canonicalNextAction({step,recoveryReady,records,coach,plans,accumulation,today}){
  const next=plans?.nextPlan||null;
  if(step==='onboarding')return {id:`gp:${today}:onboarding`,action:'onboarding',route:'onboarding',reason:'Complete your goal and baseline so GARANG can interpret later records.',evidence:[evidenceEntry('onboarding','incomplete','ONBOARDING_INCOMPLETE')],source:VERSION,confidence:1,expectedOutcome:'A usable goal and baseline for the first recommendation.'};
  if(step==='first_record')return {id:`gp:${today}:first_record`,action:'record',route:'log',reason:'GARANG needs one real behavior record before it can interpret your pattern.',evidence:[evidenceEntry('meaningful_records',records?.count||0,'NO_MEANINGFUL_RECORD')],source:VERSION,confidence:1,expectedOutcome:'Create the first evidence point for personalized interpretation.'};
  if(step==='coach')return {id:`gp:${today}:coach`,action:'coach',route:'coach',reason:'A saved record exists but no evidence-backed Coach interpretation has been observed yet.',evidence:[evidenceEntry('meaningful_records',records?.count||0,'RECORD_AVAILABLE'),evidenceEntry('coach_interpretation',coach?.used===true,'COACH_INTERPRETATION_MISSING')],source:VERSION,confidence:.9,expectedOutcome:'Turn the saved record into an explicit recommendation before planning.'};
  if(step==='plan'&&!recoveryReady)return {id:`gp:${today}:collect_data`,action:'collect_data',route:'today',intent:'checkin',reason:'Recent recovery evidence is missing, so GARANG should not over-personalize the plan.',evidence:[evidenceEntry('recovery_ready',false,'RECOVERY_SIGNAL_MISSING')],source:VERSION,confidence:1,expectedOutcome:'Collect a current recovery signal so the next plan can use the right intensity.'};
  if(step==='plan')return {id:`gp:${today}:plan`,action:'plan',route:'coach',reason:'An interpretation exists and recovery evidence is recent enough to turn it into an executable plan.',evidence:[evidenceEntry('recovery_ready',true,'RECOVERY_SIGNAL_READY'),evidenceEntry('planned_actions',plans?.planned||0,'PLAN_NOT_CREATED')],source:VERSION,confidence:.9,expectedOutcome:'Create one concrete action that can later be matched to a real record.'};
  if(step==='execute')return {id:`gp:${today}:execute:${clean(next?.id)||clean(next?.type)||'next'}`,action:'execute',route:next?.type==='running'?'running':next?.type==='nutrition'?'nutrition':next?.type==='recovery'?'today':'workout',actionType:next?.type||'workout',planId:next?.id||null,reason:next?.title?`The next unexecuted plan is ${next.title}.`:'The plan needs a real execution record before GARANG can evaluate the outcome.',evidence:[evidenceEntry('planned_actions',plans?.planned||0,'PLAN_AVAILABLE'),evidenceEntry('executed_actions',plans?.executed||0,'EXECUTION_PENDING')],source:VERSION,confidence:1,expectedOutcome:'Create real execution evidence that can be compared with the recommendation.'};
  if(step==='accumulation')return {id:`gp:${today}:accumulation`,action:'review_accumulation',route:'progress',reason:'At least one planned action has real execution evidence and is ready to be interpreted in accumulation.',evidence:[evidenceEntry('executed_actions',plans?.executed||0,'EXECUTION_EVIDENCE_READY'),evidenceEntry('meaningful_accumulation_review',accumulation?.meaningful===true,'ACCUMULATION_REVIEW_PENDING')],source:VERSION,confidence:.95,expectedOutcome:'Review what accumulated, what changed, and the next action without overstating weak trends.'};
  return {id:`gp:${today}:continue`,action:'continue',route:'today',reason:'The activation loop has meaningful evidence through accumulation review.',evidence:[evidenceEntry('accumulation_review_date',accumulation?.date||null,'ACCUMULATION_REVIEWED')],source:VERSION,confidence:1,expectedOutcome:'Start the next daily loop from accumulated evidence.'};
}

function derive(state,options={}){
  const safe=state&&typeof state==='object'?state:{},today=dateOnly(options.today)||localDate(),records=meaningfulRecords(safe),coach=coachEvidence(safe),plans=execution(safe,today),onboardingComplete=safe.onboarding?.complete===true||safe.onboarding?.skipped===true,recoveryDate=latestRecoveryDate(safe,today),recoveryReady=!!recoveryDate&&recoveryDate>=shiftDate(today,-2),accumulation=accumulationEvidence(safe,today,plans),progressDate=accumulation.date;
  const completed={
    onboarding:onboardingComplete,
    first_record:records.hasMeaningful,
    coach:coach.used,
    plan:plans.planned>0,
    execute:plans.hasExecution,
    accumulation:accumulation.meaningful
  };
  const firstUnmet=STEP_ORDER.find(step=>!completed[step]);
  const step=firstUnmet||'complete',nextAction=canonicalNextAction({step,recoveryReady,records,coach,plans,accumulation,today});
  return {
    version:VERSION,
    today,
    goalClass:goalClass(safe),
    goalLabel:goalLabel(safe),
    recoveryDate,
    recoveryReady,
    step,
    completed:step==='complete',
    steps:STEP_ORDER.map(id=>({id,complete:!!completed[id]})),
    records,
    coachUsed:coach.used,
    coachEvidence:clone(coach),
    planCount:plans.planned,
    execution:{planned:plans.planned,executed:plans.executed,allExecuted:plans.allExecuted,hasExecution:plans.hasExecution},
    nextPlan:clone(plans.nextPlan),
    nextAction:clone(nextAction),
    accumulationViewed:!!accumulation.viewedDate,
    accumulationEvidence:clone(accumulation),
    progressDate,
    revisitAvailable:!!progressDate&&progressDate<today
  };
}

return Object.freeze({VERSION,STEP_ORDER,localDate,dateOfRow,eventDate,goalClass,meaningfulRecords,coachEvidence,execution,latestProgressEvidence,latestProgressVisit,accumulationEvidence,canonicalNextAction,derive});
});