'use strict';
const assert=require('node:assert/strict');
const Core=require('../02_core/nutrition-recommendation-v1.js');

const foods=[
  {food_id:'F-CHICKEN',name:'닭가슴살',basis_g:100,kcal:109,protein:23,carbs:0,fat:1.2,nutrition_status:'approximate',aliases:[]},
  {food_id:'F-RICE',name:'현미밥',basis_g:100,kcal:157,protein:3.81,carbs:34.29,fat:.48,nutrition_status:'approximate',aliases:['현미']},
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
  assert.equal(result.options.length,3);
  assert.ok(result.options[0].items.some(item=>item.foodId==='F-CHICKEN'));
  assert.ok(result.options[0].estimated.protein>0);
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

console.log('nutrition-recommendation-v1: PASS');
