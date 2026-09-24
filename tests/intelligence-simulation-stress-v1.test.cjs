'use strict';
const assert=require('node:assert/strict');
const Policy=require('../functions/src/recommendation-policy-eval-v1.cjs');
const Workout=require('../functions/src/workout-prescription-shadow-v1.cjs');
const Nutrition=require('../functions/src/adaptive-nutrition-learning-v1.cjs');
const DataQuality=require('../functions/src/intelligence-data-quality-v1.cjs');
const Calibration=require('../functions/src/confidence-calibration-v1.cjs');
const Observability=require('../functions/src/intelligence-observability-v1.cjs');
const Food=require('../02_core/food-intelligence-v2.js');

let cases=0;const check=(condition,message)=>{cases++;assert.ok(condition,message);};

// Policy stress: confidence, adherence, mode and preference combinations may constrain but never exceed deterministic decision.
for(const mode of ['maintain','caution','recover','reduce']){
 for(const confidence of [0,.1,.25,.4,.6,.8,1]){
  for(const executionRate of [.1,.35,.6,.8,1]){
   const stat=band=>({sampleSize:8,acceptanceRate:executionRate,editRate:.1,executionRate,outcomeScore:55+executionRate*35,recoveryDelta:0,confidence});
   const response={confidence,behavior:{executionRate,acceptedExecutionRate:executionRate},training:{preferredDurationBand:'short',preferredIntensityBand:'low',preferredVolumeBand:'moderate',durationStats:{short:stat('short'),medium:stat('medium'),long:stat('long')},intensityStats:{low:stat('low'),moderate:stat('moderate'),full:stat('full')},volumeStats:{low:stat('low'),moderate:stat('moderate'),full:stat('full')}}};
   const p=Policy.build({decisionId:'stress',mode,recommendation:{duration:60,intensityScale:1,volumeScale:1}},response);
   check(!p.selected||p.selected.durationScale<=1,'policy duration escalation');
   check(!p.selected||p.selected.intensityScale<=1,'policy intensity escalation');
   check(!p.selected||p.selected.volumeScale<=1,'policy volume escalation');
   check(p.guardrails.neverExceedsDeterministicDecision===true,'policy guardrail missing');
  }
 }
}

// Workout stress: progression is confirmation-gated and recovery/high-effort signals never silently progress.
for(const rpe of [6,7,8,9,10]){
 for(const rir of [0,1,2,3,4]){
  for(const recovery of [false,true]){
   for(const trend of [0,.025,.05]){
    const sessions=[0,1,2].map((i)=>({date:`2026-09-${String(1+i*7).padStart(2,'0')}`,name:'Bench',setDetails:Array.from({length:3},()=>({weight:80*(1+trend*i),reps:8,rpe,rir,failure:rpe===10&&rir===0}))}));
    const checkin=recovery?{date:'2026-09-24',sleepHours:5,energy:2,stress:4,soreness:4}:{date:'2026-09-24',sleepHours:8,energy:5,stress:1,soreness:1};
    const w=Workout.build({workouts:sessions,dailyCheckins:[checkin]},{asOf:'2026-09-24'}).exercises[0];
    check(w.prescription.action!=='review_progression'||w.prescription.requiresConfirmation===true,'workout progression without confirmation');
    check(w.guardrails.neverAutoIncrease===true,'workout auto-increase guard missing');
    if(recovery)check(w.prescription.action==='reduce','recovery stress did not reduce workout');
    if(rpe>=9||rir===0)check(w.prescription.action!=='review_progression','high-effort workout progressed');
   }
  }
 }
}

// Nutrition stress: proposals remain bounded and never mutate targets.
for(const goal of ['체지방 감량','근육 증가','유지']){
 for(const startWeight of [55,70,90]){
  for(const weeklyDelta of [-1.2,-.6,-.2,0,.2,.6,1.2]){
   for(const intake of [1600,2100,2600,3200]){
    const meals=Array.from({length:28},(_,i)=>({date:`2026-09-${String(i+1).padStart(2,'0')}`,kcal:intake+(i%9===0?200:0)}));
    const body=[0,7,14,21,27].map(day=>({date:`2026-09-${String(day+1).padStart(2,'0')}`,weight:startWeight+(weeklyDelta*day/7)}));
    const n=Nutrition.build({profile:{goal},meals,body},{asOf:'2026-09-28',days:28});
    check(Math.abs(Number(n.recommendation?.targetProposal?.deltaKcal)||0)<=100,'nutrition proposal exceeded 100 kcal');
    check(n.guardrails.noAutomaticTargetMutation===true,'nutrition mutation guard missing');
   }
  }
 }
}

// Data-quality corruption stress.
for(let i=0;i<80;i++){
 const good={episodeId:`e${i}`,date:'2026-09-20',recommendation:{recommendationId:`r${i}`},execution:{executionId:`x${i}`,completionRatio:1},outcome:{outcomeId:`o${i}`,score:70+(i%20)},userResponse:{status:'accepted'},attribution:{confidence:.8}};
 const variant=i%4===0?{...good,date:'2026-10-01'}:i%4===1?{...good,execution:{...good.execution,completionRatio:1.5}}:i%4===2?{...good,outcome:{...good.outcome,score:140}}:{...good,attribution:{confidence:1.4}};
 const q=DataQuality.build({episodes:[good,variant],asOf:'2026-09-24'},{asOf:'2026-09-24'});
 check(q.status==='invalid','corrupt longitudinal evidence not invalidated');
}

// Calibration stress: calibrated synthetic probabilities remain usable/strong, systematic overconfidence is caught.
for(const p of [.1,.2,.3,.7,.8,.9]){
 const samples=Array.from({length:100},(_,i)=>({id:`${p}-${i}`,prediction:p,actual:i<Math.round(p*100)}));
 const c=Calibration.evaluate(samples,{bins:10,minSamples:20});
 check(c.ece<=.02,'matched calibration ECE too high');
 check(c.status==='strong'||c.status==='usable','matched calibration unexpectedly weak');
}
for(const p of [.75,.85,.95]){
 const samples=Array.from({length:80},(_,i)=>({id:`over-${p}-${i}`,prediction:p,actual:i%2===0}));
 const c=Calibration.evaluate(samples,{bins:8,minSamples:20});
 check(c.status==='weak','overconfident calibration not weak');
 check(c.alerts.includes('SYSTEMATIC_OVERCONFIDENCE'),'overconfidence alert missing');
}

// Observability stress: any guardrail violation must be critical and broad degradation must surface drift.
for(let offset=0;offset<20;offset++){
 const baseline=Array.from({length:10},(_,i)=>({date:`2026-08-${String(1+i).padStart(2,'0')}`,qualityOverall:.9,calibrationEce:.05,calibrationBrier:.14,executionRate:.82,responseConfidence:.8,dataQualityScore:.92,guardrailViolations:0}));
 const recent=Array.from({length:5},(_,i)=>({date:`2026-09-${String(1+i).padStart(2,'0')}`,qualityOverall:.68-offset*.001,calibrationEce:.16,calibrationBrier:.26,executionRate:.58,responseConfidence:.62,dataQualityScore:.7,guardrailViolations:offset===0&&i===4?1:0}));
 const o=Observability.build([...baseline,...recent],{baselineWindow:10,recentWindow:5});
 check(offset===0?o.status==='critical':o.status==='drift','observability failed to classify degradation');
 if(offset>0)check(o.alerts.includes('RECOMMENDATION_QUALITY_DRIFT'),'quality drift missing');
}

// Food retrieval stress: exact identities win, broad/ambiguous queries fail closed, low vision confidence is rejected.
const foods=[
 {food_id:'rice',name:'현미밥',aliases:['현미 밥','brown rice'],basis_g:100,kcal:170,protein:3.5,carbs:36,fat:1,nutrition_status:'verified',provenance:{provider:'T',dataset:'D',recordId:'1'}},
 {food_id:'yogurt-a',name:'그릭요거트',aliases:['greek yogurt'],basis_g:100,kcal:90,protein:10,carbs:5,fat:3,nutrition_status:'verified',provenance:{provider:'T',dataset:'D',recordId:'2'}},
 {food_id:'yogurt-b',name:'플레인요거트',aliases:['plain yogurt'],basis_g:100,kcal:70,protein:5,carbs:8,fat:2,nutrition_status:'verified',provenance:{provider:'T',dataset:'D',recordId:'3'}}
];
for(let i=0;i<100;i++){
 check(Food.resolve(foods,i%2?'현미 밥':'brown rice').canonical.foodId==='rice','food alias identity drift');
 check(Food.resolve(foods,'yogurt').status!=='matched','ambiguous food query matched silently');
 check(Food.resolveVisionRow(foods,{name:'현미밥',confidence:.2,portionConfidence:.9}).status==='unmatched','low-confidence vision accepted');
}

assert.ok(cases>=1500,`expected >=1500 deterministic stress assertions, got ${cases}`);
console.log(JSON.stringify({status:'PASS',cases,domains:['policy','workout','nutrition','longitudinal-data','calibration','observability','food-retrieval']},null,2));
console.log('intelligence-simulation-stress-v1: PASS');
