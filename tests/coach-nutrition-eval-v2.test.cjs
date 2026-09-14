'use strict';
const assert=require('node:assert/strict');
const Decision=require('../functions/src/decision-intelligence.cjs');
const Nutrition=require('../02_core/nutrition-recommendation-v1.js');
const foods=require('../04_data/knowledge/food-db.json');
const evals=require('../04_data/knowledge/coach-nutrition-eval-v2.json');

for(const scenario of evals.coach){
  const before=JSON.stringify(scenario.userState),decision=Decision.decide(scenario.userState,{outcomeContext:scenario.outcomeContext||null});
  assert.equal(decision.mode,scenario.expectedMode,`${scenario.id}: expected ${scenario.expectedMode}, got ${decision.mode}`);
  assert.equal(decision.guardrails.noSilentMutation,true,`${scenario.id}: silent mutation guardrail missing`);
  assert.equal(decision.guardrails.requiresConfirmation,true,`${scenario.id}: confirmation guardrail missing`);
  if(decision.actionProposal)assert.equal(decision.actionProposal.requiresConfirmation,true,`${scenario.id}: action proposal must require confirmation`);
  assert.equal(JSON.stringify(scenario.userState),before,`${scenario.id}: decision eval mutated input`);
}

for(const scenario of evals.nutrition){
  const state=JSON.parse(JSON.stringify(scenario.state)),before=JSON.stringify(state),result=Nutrition.recommend(state,foods,{date:'2026-09-15'});
  assert.equal(result.status,scenario.expectedStatus,`${scenario.id}: expected ${scenario.expectedStatus}, got ${result.status}`);
  assert.equal(result.basis,'saved_meals_only',`${scenario.id}: recommendation must be grounded in saved meals`);
  assert.equal(JSON.stringify(state),before,`${scenario.id}: nutrition recommendation mutated input`);
  if(result.status==='ready'){
    assert.ok(result.options.length>0,`${scenario.id}: ready recommendation requires options`);
    for(const option of result.options)for(const item of option.items)assert.ok(item.nutritionStatus,`${scenario.id}: every recommended food must surface nutrition quality`);
  }
}

console.log(JSON.stringify({status:'PASS',coachScenarios:evals.coach.length,nutritionScenarios:evals.nutrition.length},null,2));
console.log('coach-nutrition-eval-v2: PASS');
