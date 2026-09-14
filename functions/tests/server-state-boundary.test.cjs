'use strict';
const assert=require('node:assert/strict');
const Boundary=require('../src/server-state-boundary.cjs');

const raw={
 meta:{schemaVersion:5,dailyPlanDrafts:{'2026-09-13':{status:'finalized',result:'completed'}}},
 onboarding:{goal:'퍼포먼스 향상',complete:true},
 preferences:{language:'ko',unit:'metric'},
 checkins:[{id:'c1',date:'2026-09-14',sleepHours:7,energy:4,stress:2,soreness:{}}],
 planner:[{id:'p1',date:'2026-09-14',time:'18:30',title:'Run',completed:false,source:'ai'}],
 workouts:[],meals:[],runs:[],body:[],aiChat:[],memory:{entries:[]}
};

const canonical=Boundary.canonicalTransport(raw);
assert.equal(canonical.contractVersion,'garang-state-v1');
assert.equal(canonical.schemaVersion,8);
assert.equal(canonical.dailyCheckins.length,1);
assert.equal(canonical.planner[0].done,false);
assert.equal(canonical.planner[0].origin,'ai');
assert.equal('meta' in canonical,false,'transport must not leak operational meta');

const normalized=Boundary.normalizeForServer(raw);
assert.equal(normalized.contractVersion,'garang-state-v1');
assert.equal(normalized.dailyCheckins.length,1);
assert.equal(normalized.checkins.length,1,'legacy server readers keep a canonical alias');
assert.equal(normalized.meta.dailyPlanDrafts['2026-09-13'].status,'finalized','outcome learning evidence must survive server normalization');
assert.equal(normalized.onboarding.goal,'퍼포먼스 향상');
assert.equal(normalized.preferences.unit,'metric');

console.log('server-state-boundary: PASS');
