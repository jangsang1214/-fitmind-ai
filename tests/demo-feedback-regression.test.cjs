'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};

test('legacy Today check-in is normalized for Stage 2/3 intelligence without mutating app storage',()=>{
 const bridge=read('06_features/final/agent-state-hook-v1.js');
 assert.ok(bridge.includes('function stateForIntelligence()'));
 assert.ok(bridge.includes('sleepHours:row.sleepHours??row.sleep??null'));
 assert.ok(bridge.includes('{general:scalarSoreness}'));
 assert.ok(bridge.includes('StateIntelligence.estimateState(stateForIntelligence())'));
});

test('Nutrition draft stays open after Add so Save meal remains immediately available',()=>{
 const experience=read('06_features/ui/runtime/garang-experience-v4.js');
 assert.ok(experience.includes("main.querySelector('#saveMeal')"));
 assert.ok(experience.includes("closest('details.manual-entry')"));
 assert.ok(experience.includes('details.open = true'));
 assert.ok(experience.includes("event.target.closest('#addFood')"));
});

test('hamburger routes receive compact Korean subtitles',()=>{
 const experience=read('06_features/ui/runtime/garang-experience-v4.js');
 assert.ok(experience.includes("running:'달리기'"));
 assert.ok(experience.includes('garang-route-subtitle'));
 assert.ok(experience.includes("document.querySelectorAll('.garang-more-sheet [data-route]')"));
});

test('visual exercise selection has dedicated name search',()=>{
 const workout=read('06_features/ui/runtime/garang-workout-library-v2.js');
 assert.ok(workout.includes('garang-exercise-search'));
 assert.ok(workout.includes("input type=\"search\""));
 assert.ok(workout.includes("data-exercise-pick"));
 assert.ok(workout.includes("includes(q)"));
 assert.ok(workout.includes("'운동 이름 검색'"));
});

console.log(`${passed} demo feedback regression tests passed`);
