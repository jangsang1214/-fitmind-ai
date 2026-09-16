'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const file=path.resolve(__dirname,'../04_data/wanted/wanted-14day-synthetic-v1.json');
const data=JSON.parse(fs.readFileSync(file,'utf8'));

assert.equal(data.synthetic,true,'Wanted judging dataset must be explicitly synthetic');
assert.equal(data.contractVersion,'garang-wanted-judge-data-v1');
assert.equal(data.spanDays,14);
assert.equal(data.profile?.name,'GARANG Demo');
assert.equal(Array.isArray(data.days),true);
assert.equal(data.days.length,14,'dataset must contain exactly 14 relative days');

const offsets=data.days.map(day=>Number(day.dayOffset)).sort((a,b)=>a-b);
assert.deepEqual(offsets,[-13,-12,-11,-10,-9,-8,-7,-6,-5,-4,-3,-2,-1,0]);

const checkins=data.days.map(day=>day.checkin).filter(Boolean);
const meals=data.days.flatMap(day=>Array.isArray(day.meals)?day.meals:[]);
const workoutDays=data.days.filter(day=>day.workoutKey);
const runDays=data.days.filter(day=>day.runKey);
assert.equal(checkins.length,14,'every judging day needs recovery context');
assert.equal(meals.length,42,'three meal records per day are required for the 14-day story');
assert.ok(workoutDays.length>=8,'two weeks should show repeated training exposure');
assert.ok(runDays.length>=3,'two weeks should include enough running evidence for accumulation');
assert.ok(Array.isArray(data.bodyTrend)&&data.bodyTrend.length>=3,'body trend needs multiple points');
assert.ok(Array.isArray(data.actionLog)&&data.actionLog.length>=4,'decision/action history must be visible');

for(const meal of meals){
  assert.ok(Number(meal.kcal)>=300&&Number(meal.kcal)<=900,`implausible meal kcal: ${meal.id}`);
  assert.ok(Number(meal.protein)>=20&&Number(meal.protein)<=80,`implausible protein: ${meal.id}`);
}
for(const day of data.days){
  assert.ok(Number(day.checkin.sleep)>=5&&Number(day.checkin.sleep)<=9,'sleep must remain plausible');
  assert.ok(Number(day.checkin.energy)>=1&&Number(day.checkin.energy)<=5,'energy scale must remain 1-5');
  assert.ok(Number(day.checkin.stress)>=1&&Number(day.checkin.stress)<=5,'stress scale must remain 1-5');
  assert.ok(Number(day.checkin.soreness)>=1&&Number(day.checkin.soreness)<=5,'soreness scale must remain 1-5');
}

const today=data.days.find(day=>Number(day.dayOffset)===0);
const yesterday=data.days.find(day=>Number(day.dayOffset)===-1);
assert.ok(today?.checkin?.soreness>=4&&today?.checkin?.stress>=4,'today must create a clear recovery tradeoff');
assert.equal(yesterday?.workoutKey,'lower_heavy','yesterday must explain today’s fatigue-aware decision');
assert.match(data.actionLog.at(-1)?.action||'',/reduce|replace/,'latest action should demonstrate adaptive next-action logic');

console.log('Wanted 14-day synthetic dataset contract: PASS');
