'use strict';
const assert=require('node:assert/strict');
const Core=require('../02_core/conversational-intelligence-v1.js');
const kb=require('../04_data/knowledge/coach-followup-kb-v1.json');

assert.equal(Core.VERSION,'garang-conversational-intelligence-v1.0.0');

const state={onboarding:{experience:'intermediate',goal:'근육 증가'}};
const date='2026-09-11';

let d=Core.decide('나 오늘 운동했어',state,null,kb,{language:'ko',date,messageId:'u1'});
assert.equal(d.type,'ask');
assert.equal(d.domain,'workout');
assert.equal(d.slot,'activity');
assert.match(d.question,/어떤 운동/);
assert.equal(d.pending.questionCount,1);

d=Core.decide('등 했어. 랫풀다운이랑 시티드로우',state,d.pending,kb,{language:'ko',date,messageId:'u2'});
assert.equal(d.type,'ask');
assert.equal(d.slot,'volume');
assert.match(d.question,/세트/);
assert.deepEqual(d.pending.slots.exercises.sort(),['랫풀다운','시티드로우'].sort());

d=Core.decide('각각 4세트',state,d.pending,kb,{language:'ko',date,messageId:'u3'});
assert.equal(d.type,'record');
assert.equal(d.write.domain,'workouts');
assert.equal(d.write.record.sets,8);
assert.equal(d.write.record.date,date);
assert.equal(d.write.record.source,'coach-conversation');
assert.deepEqual(d.write.record.exercises.map(x=>x.name).sort(),['랫풀다운','시티드로우'].sort());
assert.match(d.write.record.name,/랫풀다운|시티드로우/,'specific exercises should stay visible in the canonical workout name');

let n=Core.decide('밥 먹었어',state,null,kb,{language:'ko',date,messageId:'n1'});
assert.equal(n.type,'ask');assert.equal(n.slot,'foods');
n=Core.decide('닭가슴살이랑 샐러드 먹었어',state,n.pending,kb,{language:'ko',date,messageId:'n2'});
assert.equal(n.type,'record');assert.equal(n.write.domain,'meals');assert.match(n.write.record.name,/닭가슴살/);assert.match(n.write.record.name,/샐러드/);

let r=Core.decide('오늘 뛰었어',state,null,kb,{language:'ko',date,messageId:'r1'});
assert.equal(r.type,'ask');assert.equal(r.slot,'distance');
r=Core.decide('5km',state,r.pending,kb,{language:'ko',date,messageId:'r2'});
assert.equal(r.type,'ask');assert.equal(r.slot,'duration');
r=Core.decide('28분 걸렸어',state,r.pending,kb,{language:'ko',date,messageId:'r3'});
assert.equal(r.type,'record');assert.equal(r.write.domain,'runs');assert.equal(r.write.record.distance,5);assert.equal(r.write.record.duration,28);

let recovery=Core.decide('오늘 너무 피곤해',state,null,kb,{language:'ko',date,messageId:'c1'});
assert.equal(recovery.type,'ask');assert.equal(recovery.slot,'sleepHours');
recovery=Core.decide('6시간 잤어',state,recovery.pending,kb,{language:'ko',date,messageId:'c2'});
assert.equal(recovery.type,'record');assert.equal(recovery.write.domain,'memory');assert.equal(recovery.write.record.type,'recovery_observation');

let action=Core.decide('스트레칭 15분 했어',state,null,kb,{language:'ko',date,messageId:'c3'});
assert.equal(action.type,'record');assert.equal(action.write.kind,'recovery-action');assert.match(action.summary,/스트레칭/);

const cancel=Core.decide('아니야 기록하지마',state,{domain:'nutrition',slots:{},questionCount:1,expected:'foods'},kb,{language:'ko',date,messageId:'x'});
assert.equal(cancel.type,'cancel');

assert.equal(kb.policy.maxQuestionsPerLog,2);
assert.ok(kb.sources.every(source=>source.tier==='A'));
assert.ok(kb.sources.every(source=>source.copyrightMode==='metadata-and-paraphrased-principles-only'));

console.log('conversational-intelligence-v1: PASS');
