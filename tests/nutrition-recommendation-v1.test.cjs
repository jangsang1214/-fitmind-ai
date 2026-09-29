'use strict';
const assert=require('node:assert/strict');
const Core=require('../02_core/nutrition-recommendation-v1.js');

const foods=[
  {food_id:'F-CHICKEN',name:'닭가슴살',basis_g:100,kcal:109,protein:23,carbs:0,fat:1.2,fiber:0,sodium:45,nutrition_status:'approximate',aliases:[]},
  {food_id:'F-RICE',name:'현미밥',basis_g:100,kcal:157,protein:3.81,carbs:34.29,fat:.48,fiber:2,sodium:2,nutrition_status:'approximate',aliases:['현미']},
  {food_id:'F-SALMON',name:'연어스테이크',basis_g:100,kcal:154,protein:20,carbs:31,fat:15,nutrition_status:'estimated',aliases:[]},
  {food_id:'F-YOGURT',name:'그릭요거트',basis_g:100,kcal:100,protein:10,carbs:4,fat:4,nutrition_status:'approximate',aliases:[]},
  {food_id:'F-EGG',name:'삶은계란',basis_g:100,kcal:184,protein:12.5,carbs:54.4,fat:27.7,nutrition_status:'estimated',aliases:[]},
  {food_id:'F-BANANA',name:'바나나',basis_g:100,kcal:89,protein:1.1,carbs:22.8,fat:.3,nutrition_status:'approximate',aliases:[]}
];
const date='2026-09-10';
const base=()=>({profile:{age:29,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{weeklyFrequency:4},meals:[],workouts:[],runs:[],body:[]});

{
  const state=base(),before=JSON.stringify(state),result=Core.recommend(state,foods,{date});
  assert.equal(result.status,'ready');
  assert.equal(result.goal,'muscle_gain');
  assert.equal(result.target.proteinTarget,112);
  assert.equal(result.actual.meals,0);
  assert.equal(result.actual.observed.protein,false);
  assert.equal(result.remaining.protein,112);
  assert.equal(result.direction.code,'protein_first');
  assert.match(result.direction.headline,/단백질/);
  assert.equal(result.options.length,3);
  assert.ok(result.options[0].items.some(item=>item.foodId==='F-CHICKEN'));
  assert.ok(result.options[0].estimated.protein>0);
  assert.ok(result.options[0].estimated.fiber>=0);
  assert.ok(result.options[0].estimated.sodium>=0);
  assert.equal(result.actual.fiber,null);
  assert.equal(result.actual.coverage.fiber,0);
  assert.equal(JSON.stringify(state),before,'nutrition recommendation must remain read-only');
  console.log('PASS nutrition recommendation uses goal, target and Food DB without writing');
}

{
  const state=base();state.meals=[{id:'m1',date,kcal:0,protein:0,carbs:0,fat:0}];
  const result=Core.recommend(state,foods,{date});
  assert.equal(result.status,'ready');
  assert.equal(result.actual.meals,1);
  assert.equal(result.actual.observed.protein,true,'zero is an observed nutrition value');
  assert.equal(result.remaining.protein,112);
  console.log('PASS zero nutrition records stay distinguishable from missing data');
}

{
  const state=base();state.meals=[{id:'m1',date,items:[{name:'A',kcal:100,protein:10,carbs:10,fat:2,fiber:3,sodium:120},{name:'B',kcal:100,protein:10,carbs:10,fat:2,fiber:null,sodium:null}]}];
  const result=Core.recommend(state,foods,{date});
  assert.equal(result.actual.fiber,null,'partial fiber coverage must not be presented as a complete daily total');
  assert.equal(result.actual.sodium,null,'partial sodium coverage must not be presented as a complete daily total');
  assert.equal(result.actual.coverage.fiber,0,'meal-level fiber coverage is incomplete when the saved meal itself has no complete total');
  console.log('PASS secondary nutrient totals fail closed when coverage is incomplete');
}

{
  const state=base();delete state.profile.weight;
  const result=Core.recommend(state,foods,{date});
  assert.equal(result.status,'needs_profile');
  assert.deepEqual(result.options,[]);
  assert.ok(result.reasons.includes('PROTEIN_TARGET_REQUIRED'));
  console.log('PASS recommendation asks for a target instead of fabricating one');
}

{
  const state=base();const result=Core.recommend(state,[],{date});
  assert.equal(result.status,'unavailable');
  assert.deepEqual(result.options,[]);
  assert.ok(result.reasons.includes('FOOD_DB_UNAVAILABLE'));
  console.log('PASS Food DB failure is explicit and fail-closed');
}


{
  const state=base();
  state.meals=[
    {id:'m-follow-1',date,protein:55,kcal:500,recommendationContexts:[{recommendationId:'r-follow',source:'next_meal',version:Core.VERSION,date,optionId:'protein-rice',goal:'muscle_gain',basis:'goal_and_food_db',proteinTarget:112,proteinActualBefore:20,proteinRemainingBefore:92}]},
    {id:'m-follow-2',date,protein:60,kcal:550}
  ];
  const before=JSON.stringify(state),history=Core.recommendationFollowThrough(state,{asOf:'2026-09-11',days:28});
  assert.equal(history.sampleSize,1);
  assert.equal(history.targetEvaluated,1);
  assert.equal(history.targetReached,1);
  assert.equal(history.optionUse['protein-rice'],1);
  assert.equal(history.recent[0].proteinFinal,115);
  assert.equal(history.recent[0].proteinGapReduction,92);
  assert.equal(history.guardrails.noCausalClaim,true);
  assert.equal(JSON.stringify(state),before,'follow-through must remain read-only');
  console.log('PASS saved recommendation lineage becomes descriptive follow-through without changing ranking');
}

{
  const state=base();
  state.meals=[{id:'m-already-met',date,protein:130,kcal:600,recommendationContexts:[{recommendationId:'r-already-met',source:'next_meal',version:Core.VERSION,date,optionId:'protein-rice',proteinTarget:112,proteinActualBefore:120,proteinRemainingBefore:0}]}];
  const history=Core.recommendationFollowThrough(state,{asOf:'2026-09-11',days:28});
  assert.equal(history.targetEvaluated,1);
  assert.equal(history.targetReached,0,'a target already satisfied before the recommendation must not be credited as follow-through');
  assert.equal(history.recent[0].classification,'saved');
  console.log('PASS pre-satisfied targets are not credited to recommendation follow-through');
}


{
  const state=base();state.meals=[{id:'review-1',date,name:'점심',kcal:520,protein:32,carbs:58,fat:18,items:[{name:'닭가슴살',kcal:220,protein:32,carbs:0,fat:5,fiber:0,sodium:180},{name:'현미밥',kcal:300,protein:0,carbs:58,fat:13,fiber:4,sodium:10}]}];
  const before=JSON.stringify(state),review=Core.reviewLatestMeal(state,{date});
  assert.equal(review.status,'ready');
  assert.equal(review.meal.id,'review-1');
  assert.equal(review.proteinState,'more');
  assert.equal(review.details.kcal,520);
  assert.equal(review.details.fiber,4);
  assert.equal(review.guardrails.noInventedNutrients,true);
  assert.equal(JSON.stringify(state),before,'beginner meal review must remain read-only');
  console.log('PASS beginner meal review stays deterministic and read-only');
}

{
  const state=base();state.meals=[{id:'review-partial',date,kcal:400,protein:120,carbs:40,fat:10,items:[{name:'A',fiber:3,sodium:100},{name:'B',fiber:null,sodium:null}]}];
  const review=Core.reviewLatestMeal(state,{date});
  assert.equal(review.proteinState,'enough');
  assert.equal(review.details.fiber,null,'partial secondary nutrient coverage must stay hidden');
  assert.equal(review.details.sodium,null,'partial sodium coverage must stay hidden');
  console.log('PASS beginner review hides incomplete secondary nutrients');
}

{
  const state=base();state.meals=[{id:'enough-direction',date,protein:120,kcal:900,carbs:100,fat:25}];
  const result=Core.recommend(state,foods,{date});
  assert.equal(result.direction.code,'balanced');
  assert.doesNotMatch(result.direction.headline,/g|kcal|%/,'beginner direction must not expose technical numbers');
  console.log('PASS next-meal direction stays simple after protein signal is covered');
}

console.log('nutrition-recommendation-v1: PASS');
