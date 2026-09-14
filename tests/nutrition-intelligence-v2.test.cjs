'use strict';
const assert=require('node:assert/strict');
const Nutrition=require('../02_core/nutrition-intelligence-v2.js');

const date='2026-09-15';

{
  const result=Nutrition.interpret({profile:{goal:'근육 증가'}},{date});
  assert.equal(result.mode,'collect_data');
  assert.ok(result.reasonCodes.includes('INSUFFICIENT_NUTRITION_EVIDENCE'));
  assert.equal(result.evidence.proteinTarget.value,null);
}

{
  const state={
    profile:{goal:'근육 증가',weight:70},
    meals:[{date,kcal:450,protein:25,carbs:55,fat:12}],
    dailyCheckins:[{date,sleepHours:4.8,soreness:8,energy:2}],
    workouts:[{date:'2026-09-14',id:'w1'}]
  };
  const result=Nutrition.interpret(state,{date});
  assert.equal(result.mode,'recovery_support');
  assert.ok(result.reasonCodes.includes('SHORT_SLEEP'));
  assert.ok(result.reasonCodes.includes('HIGH_SORENESS'));
  assert.equal(result.evidence.proteinTarget.value,126);
}

{
  const state={
    profile:{goal:'러닝 퍼포먼스',weight:70},
    meals:[{date,kcal:500,protein:30,carbs:60,fat:15}],
    workouts:[],runs:[],
    planner:[{date,type:'running',done:false}]
  };
  const result=Nutrition.interpret(state,{date});
  assert.equal(result.mode,'performance_fuel');
  assert.ok(result.reasonCodes.includes('LOW_LOGGED_CARBS_FOR_TRAINING_DAY'));
  assert.equal(result.evidence.training.today,true);
}

{
  const state={profile:{goal:'근육 증가',weight:80},meals:[{date,kcal:700,protein:40,carbs:80,fat:20}]};
  const result=Nutrition.interpret(state,{date});
  assert.equal(result.mode,'protein_support');
  assert.ok(result.reasonCodes.includes('PROTEIN_GAP'));
  assert.equal(result.evidence.proteinTarget.value,144);
}

{
  const state={profile:{goal:'유지',weight:65},meals:[{date,kcal:900,protein:90,carbs:110,fat:25}]};
  const result=Nutrition.interpret(state,{date});
  assert.equal(result.mode,'balanced');
  assert.ok(result.reasonCodes.includes('NO_STRONG_NUTRITION_EXCEPTION'));
}

{
  const rows=[
    {date:'2026-09-13',protein:70,carbs:180,kcal:1600,fat:50},
    {date:'2026-09-14',protein:80,carbs:200,kcal:1700,fat:55},
    {date:'2026-09-15',protein:90,carbs:220,kcal:1800,fat:60}
  ];
  const recent=Nutrition.recentNutrition({meals:rows},date,7);
  assert.equal(recent.loggedDays,3);
  assert.equal(recent.averages.protein,80);
  assert.equal(recent.averages.carbs,200);
}

console.log('nutrition-intelligence-v2: PASS');