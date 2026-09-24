'use strict';
const assert=require('node:assert/strict');
const Boundary=require('../src/server-state-boundary.cjs');

const raw={
 meta:{schemaVersion:5,dailyPlanDrafts:{'2026-09-13':{status:'finalized',result:'completed'}}},
 onboarding:{goal:'퍼포먼스 향상',complete:true},
 preferences:{language:'ko',unit:'metric'},
 checkins:[{id:'c1',date:'2026-09-14',sleepHours:7,energy:4,stress:2,soreness:{}}],
 planner:[{id:'p1',date:'2026-09-14',time:'18:30',title:'Run',completed:false,source:'ai'}],
 workouts:[],meals:[],runs:[],body:[{id:'b1',date:'2026-09-14',weight:67,fatPercent:15}],physiologicalSignals:[{source:'Apple Health export',capturedAt:'2026-09-14T07:00:00Z',date:'2026-09-14',hrvMs:51,restingHeartRateBpm:58}],aiChat:[],memory:{entries:[]}
};

const canonical=Boundary.canonicalTransport(raw);
delete globalThis.GarangSchema;require('../../02_core/data-schema.js');const browserCanonical=globalThis.GarangSchema.toTransport(raw);
assert.deepEqual(canonical,browserCanonical,'Functions boundary must stay semantically identical to frozen browser transport for the parity fixture');
assert.equal(canonical.contractVersion,'garang-state-v1');
assert.equal(canonical.schemaVersion,9);
assert.equal(canonical.dailyCheckins.length,1);
assert.equal(canonical.planner[0].done,false);
assert.equal(canonical.planner[0].origin,'ai');
assert.equal(canonical.body[0].bodyFat,15);assert.equal(canonical.physiologicalSignals.length,1);assert.equal(canonical.physiologicalSignals[0].hrvMs,51);
assert.equal('meta' in canonical,false,'transport must not leak operational meta');

const normalized=Boundary.normalizeForServer(raw);
assert.equal(normalized.contractVersion,'garang-state-v1');
assert.equal(normalized.dailyCheckins.length,1);
assert.equal(normalized.checkins.length,1,'legacy server readers keep a canonical alias');
assert.equal(normalized.meta.dailyPlanDrafts['2026-09-13'].status,'finalized','outcome learning evidence must survive server normalization');
assert.equal(normalized.onboarding.goal,'퍼포먼스 향상');
assert.equal(normalized.preferences.unit,'metric');
assert.equal(normalized.body[0].fatPercent,15,'server intelligence compatibility alias must remain available');
assert.equal(normalized.planner[0].completed,false,'server intelligence compatibility alias must remain available');

console.log('server-state-boundary: PASS');
