'use strict';
const assert=require('node:assert/strict');
const Browser=require('../../02_core/personalized-intelligence-learning-v1.js');
const Server=require('../src/personalized-intelligence-learning-v1.cjs');
const state={planner:[
 {id:'p1',date:'2026-09-10',type:'workout',duration:35,intensityScale:1,volumeScale:1,confirmed:true,decisionId:'d1',decisionMode:'maintain',recommendationId:'r1',episodeId:'e1'},
 {id:'p2',date:'2026-09-11',type:'workout',duration:65,intensityScale:1,volumeScale:1,confirmed:true,decisionId:'d2',decisionMode:'maintain',recommendationId:'r2',episodeId:'e2'}
],actionLog:[
 {id:'a1',event:'recommendation_accepted',recommendationId:'r1',at:'2026-09-10T08:00:00Z'},
 {id:'a2',event:'recommendation_accepted',recommendationId:'r2',at:'2026-09-11T08:00:00Z'}
]};
const graph={asOf:'2026-09-21',cycles:[
 {date:'2026-09-10',decisionId:'d1',decisionMode:'maintain',recommendationId:'r1',planId:'p1',executionId:'x1',outcomeId:'o1',execution:{status:'observed',score:100},outcome:{classification:'completed',score:100},attribution:{complete:true}},
 {date:'2026-09-11',decisionId:'d2',decisionMode:'maintain',recommendationId:'r2',planId:'p2',executionId:'x2',outcomeId:'o2',execution:{status:'not_observed_finalized',score:0},outcome:{classification:'missed',score:0},attribution:{complete:true}}
]};
const options={asOf:'2026-09-21'};
assert.deepEqual(Server.build(state,graph,{mode:'maintain'},options),Browser.build(state,graph,{mode:'maintain'},options));
assert.deepEqual(Server.compactForContext(Server.build(state,graph,{mode:'maintain'},options)),Browser.compactForContext(Browser.build(state,graph,{mode:'maintain'},options)));
console.log('functions personalized-intelligence-learning-v1: PASS');
