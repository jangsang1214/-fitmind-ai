'use strict';
const assert=require('node:assert/strict');
const Learning=require('../02_core/personalized-intelligence-learning-v1.js');
const Personalization=require('../02_core/personalization-policy-v1.js');

function fixture(count=8){
 const state={planner:[],actionLog:[]},cycles=[];
 for(let i=0;i<count;i++){
  const short=i<Math.ceil(count/2),n=i+1,date=`2026-09-${String(n).padStart(2,'0')}`,recommendationId=`r-${n}`,planId=`p-${n}`,completed=short;
  state.planner.push({id:planId,date,type:'workout',domain:'training',duration:short?35:65,intensityScale:1,volumeScale:1,confirmed:true,decisionId:`d-${n}`,decisionMode:'maintain',recommendationId,policyVersion:'personalization-policy-v1.0.0',episodeId:`episode-${n}`,learningContext:{decisionConfidence:.8,decisionReasonCodes:['MODE_MAINTAIN'],stateFeatures:{readinessBand:'medium',fatigueBand:'medium',loadBand:'stable',goalBand:'aligned'}}});
  state.actionLog.push({id:`a-${n}`,event:'recommendation_accepted',recommendationId,at:`${date}T08:00:00Z`});
  cycles.push({date,decisionId:`d-${n}`,decisionMode:'maintain',recommendationId,planId,executionId:`x-${n}`,outcomeId:`o-${n}`,execution:{status:completed?'observed':'not_observed_finalized',score:completed?100:0},outcome:{classification:completed?'completed':'missed',score:completed?100:0},attribution:{complete:true}});
 }
 return {state,graph:{asOf:'2026-09-21',cycles}};
}

{
 const {state,graph}=fixture(),built=Learning.build(state,graph,{mode:'progress'},{asOf:'2026-09-21'});
 assert.equal(built.episodes.length,8);
 assert.ok(built.episodes.every(row=>row.learning.eligibleForLearning));
 assert.equal(built.responseModel.confidence,1);
 assert.equal(built.responseModel.training.observedBestDurationBand,'short');
 assert.equal(built.evaluation.active,true);
 assert.equal(built.evaluation.selectedCandidate.id,'simplified_duration');
 assert.equal(built.evaluation.constraints.durationScale,.8);
 assert.ok(built.evaluation.constraints.intensityCap<=1);
 assert.equal(built.evaluation.guardrails.noAutomaticProgressionIncrease,true);
 const policy=Personalization.build({}, {}, {personalizedLearning:built});
 assert.equal(policy.reasonCodes.includes('PERSONALIZATION_RESPONSE_MODEL'),true);
 assert.equal(policy.adjustments.durationScale,.8);
 assert.equal(policy.adjustments.volumeCap,.9);
 assert.equal(policy.guardrails.responseLearningConstrainOnly,true);
}

{
 const {state,graph}=fixture(1),built=Learning.build(state,graph,{mode:'maintain'},{asOf:'2026-09-21'});
 assert.ok(built.responseModel.confidence<.5);
 assert.equal(built.evaluation.active,false);
 assert.equal(built.evaluation.selectedCandidate.id,'baseline');
}

{
 const {state,graph}=fixture(),built=Learning.build(state,graph,{mode:'caution'},{asOf:'2026-09-21'});
 assert.equal(built.evaluation.active,false,'personalized policy must never override caution');
 assert.equal(built.evaluation.constraints.intensityCap,1);
}

console.log('personalized-intelligence-learning-v1: PASS');
