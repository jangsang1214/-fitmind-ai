'use strict';
const assert=require('node:assert/strict');
const Decision=require('../functions/src/decision-intelligence.cjs');
const base=()=>({engineVersion:'state-intelligence-v1',asOf:'2026-09-06',confidence:.75,readiness:{value:72,band:'ready',confidence:.8,reasons:['CHECKIN_STABLE']},fatigue:{score:30,band:'low',confidence:.7,reasons:[]},load:{ratio:1,band:'stable',confidence:.7},patterns:[],goalAlignment:{score:82,band:'aligned',confidence:.7}});
const cases=[
 ['collect_data',{...base(),confidence:.1,readiness:{value:null,band:'unknown',reasons:['NO_RECENT_CHECKIN']},fatigue:{score:null,band:'unknown',reasons:[]}},'collect_data'],
 ['pain_caution',{...base(),readiness:{value:90,band:'high',reasons:['PAIN_CAUTION']}},'caution'],
 ['recover_spike',{...base(),readiness:{value:50,band:'guarded',reasons:['SHORT_SLEEP']},load:{ratio:1.8,band:'spike',confidence:.9}},'recover'],
 ['reduce_fatigue',{...base(),fatigue:{score:72,band:'high',confidence:.8,reasons:['SLEEP_DEBT']}},'reduce'],
 ['goal_focus',{...base(),goalAlignment:{score:50,band:'mixed',confidence:.8}},'goal_focus'],
 ['progress',{...base(),confidence:.85,readiness:{value:90,band:'high',confidence:.9,reasons:['CHECKIN_STABLE']},fatigue:{score:15,band:'low',confidence:.8,reasons:[]},load:{ratio:1.05,band:'stable',confidence:.8}},'progress'],
 ['maintain',base(),'maintain']
];
let hits=0;for(const [name,input,expected] of cases){const actual=Decision.decide(input).mode,ok=actual===expected;console.log(ok?'PASS':'FAIL',name,{expected,actual});if(ok)hits++;}
const accuracy=hits/cases.length;console.log('DECISION_STAGE3_BENCHMARK',JSON.stringify({engineVersion:Decision.ENGINE_VERSION,cases:cases.length,hits,classificationAccuracy:accuracy}));assert.ok(accuracy>=.95,`classificationAccuracy ${accuracy}`);
