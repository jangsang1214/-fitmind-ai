'use strict';
const assert=require('node:assert/strict');
const Response=require('../functions/src/user-response-model-v1.cjs');
const Policy=require('../functions/src/recommendation-policy-eval-v1.cjs');
const Workout=require('../functions/src/workout-prescription-shadow-v1.cjs');
const Nutrition=require('../functions/src/adaptive-nutrition-learning-v1.cjs');
const DataQuality=require('../functions/src/intelligence-data-quality-v1.cjs');
const Quality=require('../functions/src/recommendation-quality-eval-v1.cjs');
const Food=require('../02_core/food-intelligence-v2.js');
const fs=require('node:fs'),path=require('node:path');

let cases=0,violations=0;
const check=(condition,msg)=>{cases++;if(!condition){violations++;throw new Error(msg);}};

for(const mode of ['maintain','caution','recover','reduce']){
 for(const confidence of [0,.2,.5,.8,1]){
  const response={version:'user-response-model-v1.2.0',sampleSize:Math.round(confidence*20),confidence,behavior:{executionRate:.7,acceptedExecutionRate:.7},training:{preferredDurationBand:'short',preferredIntensityBand:'low',preferredVolumeBand:'moderate',durationStats:{short:{sampleSize:5,executionRate:.8,outcomeScore:75,confidence}},intensityStats:{low:{sampleSize:5,executionRate:.8,outcomeScore:75,confidence}},volumeStats:{moderate:{sampleSize:5,executionRate:.8,outcomeScore:75,confidence}}}};
  const d={decisionId:'d',mode,recommendation:{duration:60,intensityScale:1,volumeScale:1}},p=Policy.build(d,response);
  check(!p.selected||p.selected.durationScale<=1,'duration escalation');
  check(!p.selected||p.selected.intensityScale<=1,'intensity escalation');
  check(!p.selected||p.selected.volumeScale<=1,'volume escalation');
 }
}

for(const rpe of [6,7,8,9,10])for(const rir of [0,1,2,3,4])for(const recovery of [false,true]){
 const checkin=recovery?{date:'2026-09-24',sleepHours:5,energy:2,stress:4,soreness:4}:{date:'2026-09-24',sleepHours:8,energy:5,stress:1,soreness:1};
 const sets=Array.from({length:3},()=>({weight:80,reps:8,rpe,rir,failure:rpe===10&&rir===0}));
 const state={workouts:[{date:'2026-09-01',name:'Bench',setDetails:sets},{date:'2026-09-08',name:'Bench',setDetails:sets},{date:'2026-09-15',name:'Bench',setDetails:sets}],dailyCheckins:[checkin]};
 const w=Workout.build(state,{asOf:'2026-09-24'}).exercises[0];
 check(w.prescription.action!=='review_progression'||w.prescription.requiresConfirmation===true,'progression without confirmation');
 check(recovery?w.prescription.action==='reduce':true,'recovery constraint did not reduce');
 check((rpe>=9||rir<=.5)?w.prescription.action!=='review_progression':true,'high effort progressed');
}

for(const goal of ['체지방 감량','근육 증가','유지'])for(const delta of [-1,-.5,0,.25,.6]){
 const meals=Array.from({length:28},(_,i)=>({date:'2026-09-'+String(i+1).padStart(2,'0'),kcal:2300}));
 const body=[0,7,14,21,24].map((day,i)=>({date:'2026-09-'+String(day+1).padStart(2,'0'),weight:70+(delta*i/4)}));
 const n=Nutrition.build({profile:{goal},meals,body},{asOf:'2026-09-24',days:28});
 check(Math.abs(n.recommendation.targetProposal.deltaKcal)<=100,'nutrition delta exceeded 100');
 check(n.guardrails.noAutomaticTargetMutation===true,'nutrition auto mutation guard missing');
}

const cleanEpisodes={asOf:'2026-09-24',episodes:Array.from({length:6},(_,i)=>({episodeId:'e'+i,date:'2026-09-'+String(18+i).padStart(2,'0'),recommendation:{recommendationId:'r'+i},execution:{executionId:'x'+i},outcome:{outcomeId:'o'+i,score:80},userResponse:{status:'accepted'},attribution:{confidence:.9}}))};
const dq=DataQuality.build(cleanEpisodes,{asOf:'2026-09-24'});
check(dq.status!=='invalid','clean longitudinal evidence invalid');
const bad=DataQuality.build({asOf:'2026-09-24',episodes:[...cleanEpisodes.episodes,{episodeId:'e0',date:'2026-10-01',outcome:{outcomeId:'future'}}]},{asOf:'2026-09-24'});
check(bad.status==='invalid','future/duplicate evidence not blocked');
const q=Quality.build({decision:{recommendation:{duration:45}},responseModel:Response.build(cleanEpisodes),policy:{selected:{id:'base',durationScale:1,intensityScale:1,volumeScale:1},candidates:[{id:'base',durationScale:1,intensityScale:1,volumeScale:1}],guardrails:{neverExceedsDeterministicDecision:true,confidenceCalibrated:true}},offlineEvaluation:{status:'diagnostic_ready',guardrailViolations:0,evaluatedEpisodes:3},workoutPrescription:{exercises:[],guardrails:{neverAutoIncrease:true}},adaptiveNutrition:{estimate:{eligible:false},guardrails:{noAutomaticTargetMutation:true}},dataQuality:dq});
check(q.status!=='blocked','clean recommendation quality blocked');

const foodCorpus=[
 {food_id:'a',name:'닭가슴살',aliases:['chicken breast'],basis_g:100,kcal:165,protein:31,carbs:0,fat:3.6,nutrition_status:'verified',provenance:{provider:'T',dataset:'D',recordId:'1'}},
 {food_id:'b',name:'닭가슴살 샐러드',aliases:['chicken salad'],basis_g:100,kcal:120,protein:15,carbs:8,fat:3,nutrition_status:'verified',provenance:{provider:'T',dataset:'D',recordId:'2'}}
];
check(Food.resolve(foodCorpus,'닭가슴살').canonical.foodId==='a','food exact identity lost');
check(Food.resolveVisionRow(foodCorpus,{name:'닭가슴살',confidence:.1}).status==='unmatched','low vision confidence accepted');

const app=fs.readFileSync(path.join(__dirname,'../01_app/app.js'),'utf8'),runtime=fs.readFileSync(path.join(__dirname,'../06_features/ui/runtime/garang-workout-execution-v2.js'),'utf8');
check(app.includes('function nextWorkoutGroupTarget(setIndex)'),'grouped target model absent');
check(runtime.includes('nextGroupedExecution?.(i)')&&runtime.includes('activateGroupedExercise?.(grouped.target.index)'),'grouped auto-advance absent');
check(runtime.includes('if(grouped.roundEnded)startRest')&&runtime.includes('else stopRest()'),'grouped round rest boundary absent');

assert.equal(violations,0);
assert.ok(cases>=150,`expected >=150 stress assertions, got ${cases}`);
console.log(JSON.stringify({status:'PASS',cases,violations},null,2));
console.log('intelligence-validation-harness-v2: PASS');
