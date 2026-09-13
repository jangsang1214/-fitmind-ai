(function(root,factory){
 const deps=typeof module==='object'&&module.exports?{PlanAdaptation:require('./plan-adaptation-v1.js')}:{PlanAdaptation:root.GarangPlanAdaptation};
 const api=factory(deps);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.GarangWeeklyReview=api;
})(typeof globalThis!=='undefined'?globalThis:this,function({PlanAdaptation}){
'use strict';
const VERSION='weekly-review-v1';
const list=v=>Array.isArray(v)?v:[];
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const dateKey=v=>String(v||'').slice(0,10);
function localDate(now=new Date()){const d=now instanceof Date?now:new Date(now);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function daysBetween(a,b){const x=new Date(`${a}T12:00:00`),y=new Date(`${b}T12:00:00`);return Math.round((y-x)/86400000);}
function inRange(row,end,days=7){const date=dateKey(row?.date||row?.day||row?.performedAt||row?.createdAt||row?.at);if(!date)return false;const diff=daysBetween(date,end);return diff>=0&&diff<days;}
function review(stateInput,{date=localDate(),days=7}={}){
 const state=object(stateInput)?stateInput:{},windowDays=Math.max(7,Math.min(14,Math.round(finite(days)??7))),adaptation=PlanAdaptation?.derive?.(state,{date,days:windowDays})||null;
 const workouts=list(state.workouts).filter(r=>inRange(r,date,windowDays)),runs=list(state.runs).filter(r=>inRange(r,date,windowDays)),meals=list(state.meals).filter(r=>inRange(r,date,windowDays)),checkins=[...list(state.dailyCheckins),...list(state.checkins)].filter(r=>inRange(r,date,windowDays));
 const domains=adaptation?.domains||{},measured=Object.values(domains).filter(row=>row&&row.classification!=='insufficient_evidence');
 const plannedDays=new Set(adaptation?.evidenceDays||[]).size,averageRate=measured.length?Math.round(measured.reduce((sum,row)=>sum+(finite(row.averageRate)??0),0)/measured.length):null;
 const primary=adaptation?.primaryDomain||null,primaryRow=primary?domains[primary]:null;
 let insightCode='WEEKLY_INSUFFICIENT_EVIDENCE',insight='이번 주는 해석보다 기록을 더 쌓는 것이 우선입니다.';
 if(adaptation?.classification==='recovery_constrained'){insightCode='WEEKLY_RECOVERY_CONSTRAINT';insight='실행 저하보다 회복 제약 신호가 더 강했습니다. 다음 주는 부담을 낮춰 연결성을 지키는 편이 좋습니다.';}
 else if(adaptation?.classification==='missed'){insightCode='WEEKLY_EXECUTION_GAP';insight='계획보다 실제 실행이 낮았습니다. 다음 주는 계획 수를 줄이고 완료 가능한 단위로 단순화하는 편이 좋습니다.';}
 else if(adaptation?.classification==='partial'){insightCode='WEEKLY_PARTIAL_EXECUTION';insight='일부 계획은 이어졌지만 완결성이 부족했습니다. 다음 주는 가장 중요한 행동 하나를 먼저 고정하는 편이 좋습니다.';}
 else if(adaptation?.classification==='completed'){insightCode='WEEKLY_COMPLETED';insight='계획과 실제 실행의 연결성이 안정적이었습니다. 다음 주도 같은 구조를 유지하고 자동 증량은 하지 않습니다.';}
 const nextAdjustment=adaptation?.adjustments?.[0]||{domain:primary,kind:'hold',scale:1,classification:adaptation?.classification||'insufficient_evidence',cause:primaryRow?.cause||'insufficient_evidence',reasonCodes:primaryRow?.reasonCodes||['OUTCOME_INSUFFICIENT_EVIDENCE']};
 return {version:VERSION,period:{end:date,days:windowDays},plannedEvidenceDays:plannedDays,averageExecutionRate:averageRate,records:{workouts:workouts.length,runs:runs.length,meals:meals.length,checkins:checkins.length},classification:adaptation?.classification||'insufficient_evidence',primaryDomain:primary,insight:{code:insightCode,text:insight},nextAdjustment:{...nextAdjustment,requiresApproval:(nextAdjustment?.scale??1)!==1},evidence:{domains,dates:adaptation?.evidenceDays||[]},guardrails:{readOnly:true,noSilentMutation:true,noAutomaticProgressionIncrease:true,coachApprovalForBehaviorChange:true}};
}
function compact(value){if(!object(value))return null;return {version:value.version,period:value.period,classification:value.classification,primaryDomain:value.primaryDomain,averageExecutionRate:value.averageExecutionRate,records:value.records,insight:value.insight,nextAdjustment:value.nextAdjustment,guardrails:value.guardrails};}
return Object.freeze({VERSION,review,compact});
});