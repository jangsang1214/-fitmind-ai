'use strict';
const assert=require('node:assert/strict');
const Running=require('../02_core/running-performance-v1.js');

const state={runs:[
 {id:'p1',date:'2026-08-04',distance:5,duration:31,splits:[{km:1,paceMinPerKm:6.1}]},
 {id:'p2',date:'2026-08-10',distance:5,duration:30.5,splits:[{km:1,paceMinPerKm:6.0}]},
 {id:'p3',date:'2026-08-16',distance:6,duration:36,splits:[{km:1,paceMinPerKm:5.9}]},
 {id:'p4',date:'2026-08-22',distance:5,duration:30,splits:[{km:1,paceMinPerKm:5.8}]},
 {id:'r1',date:'2026-09-03',distance:5,duration:27,splits:[{km:1,paceMinPerKm:5.2}]},
 {id:'r2',date:'2026-09-10',distance:6,duration:31.8,splits:[{km:1,paceMinPerKm:5.0}]},
 {id:'r3',date:'2026-09-18',distance:5,duration:26,splits:[{km:1,paceMinPerKm:4.9}]},
 {id:'r4',date:'2026-09-23',distance:10,duration:52,splits:[{km:1,paceMinPerKm:4.8},{km:2,paceMinPerKm:5.0}]},
 {id:'future',date:'2026-10-01',distance:50,duration:100}
]};
const result=Running.build(state,{asOf:new Date('2026-09-24T12:00:00Z')});
assert.equal(result.evidence.validRuns,8,'future run must be excluded');
assert.equal(result.trend.status,'measured');
assert.equal(result.trend.direction,'improving','lower pace is improvement');
assert.ok(result.bestEfforts.oneKm.paceMinPerKm<=4.9);
assert.equal(result.bestEfforts.fiveKm.distanceKm,5);
assert.equal(result.bestEfforts.tenKm.distanceKm,10);
assert.ok(result.recent.days28.distanceKm>=26);
assert.ok(['stable','spike','drop'].includes(result.load.band));
assert.equal(result.guardrails.noAutomaticProgression,true);
assert.equal(result.guardrails.averagePaceIsNotSegmentPR,true);
assert.equal(result.analysis.split.status,'measured');
assert.equal(result.analysis.split.pattern,'positive_split');
assert.equal(result.analysis.paceGuide.status,'measured');
assert.ok(result.analysis.paceGuide.zones.easy.lowMinPerKm>result.analysis.paceGuide.anchorPaceMinPerKm);
assert.equal(result.analysis.distribution.status,'measured');
assert.equal(result.analysis.distribution.sessions,4);
assert.equal(result.analysis.progression.fiveKm.status,'measured');
assert.ok(result.analysis.progression.fiveKm.improvementPct>0);
assert.equal(result.analysis.projection.status,'estimated');
assert.ok(result.analysis.projection.halfMarathonMin>result.analysis.projection.tenKmMin);
assert.equal(result.guardrails.paceGuideIsHeuristic,true);
assert.equal(result.guardrails.noHeartRateZoneClaim,true);
assert.equal(result.guardrails.raceProjectionEstimateOnly,true);

const sparse=Running.build({runs:[{id:'x',date:'2026-09-23',distance:3,duration:18}]},{asOf:new Date('2026-09-24T12:00:00Z')});
assert.equal(sparse.recommendation.status,'collect_more_data');
assert.equal(sparse.analysis.paceGuide.status,'insufficient');
assert.equal(sparse.analysis.split.status,'insufficient');
console.log('running-performance-v1: PASS');

const negative=Running.latestSplitAnalysis(Running.validRuns({runs:[{id:'n1',date:'2026-09-24',distance:4,duration:20,splits:[{km:1,paceMinPerKm:5.3},{km:2,paceMinPerKm:5.2},{km:3,paceMinPerKm:4.9},{km:4,paceMinPerKm:4.8}]}]},new Date('2026-09-24T12:00:00Z')));
assert.equal(negative.pattern,'negative_split');
assert.ok(negative.changePct<0);
