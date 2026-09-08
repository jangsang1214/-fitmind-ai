'use strict';
const assert=require('node:assert/strict');
const Action=require('../02_core/action-data-reliability-v1.js');
const Sync=require('../02_core/sync-durability.js');
const Memory=require('../02_core/memory-intelligence-v1.js');
let passed=0,seq=0;
const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
const clock=()=>new Date('2026-09-08T12:00:00.000Z');
const idFactory=prefix=>`${prefix}_${++seq}`;
const base=()=>({meta:{schemaVersion:5,updatedAt:'2026-09-08T11:00:00.000Z',syncOwnerUid:'u1',syncTombstones:[],actionReceipts:[]},profile:{goal:'performance'},onboarding:{goal:'performance'},preferences:{language:'ko',unit:'metric'},workouts:[],meals:[],runs:[],body:[],planner:[],checkins:[],aiChat:[],memory:{entries:[],deletedIds:[],facts:[],preferences:[],goals:[],events:[]},actionLog:[],errors:[],analytics:{events:[]}});
const opts={ownerUid:'u1',userConfirmed:true,clock,idFactory,sync:Sync,memory:Memory};
const code=expected=>error=>error?.code===expected;

test('all six data domains support create update delete through one boundary',()=>{
 let state=base();
 const samples={
  workouts:{record:{id:'w1',name:'Squat',sets:3,reps:5,weight:100},patch:{weight:105}},
  meals:{record:{id:'m1',name:'Lunch',kcal:650},patch:{kcal:700}},
  runs:{record:{id:'r1',distance:5,duration:28,kcal:320},patch:{duration:27}},
  body:{record:{id:'b1',weight:70,muscle:32},patch:{weight:69.8}},
  planner:{record:{id:'p1',title:'Lower body',duration:60},patch:{title:'Lower body light'}},
  memory:{record:{id:'mem1',type:'preference',key:'training_time',value:'evening'},patch:{value:'morning'}}
 };
 for(const [domain,sample] of Object.entries(samples)){
  let out=Action.applyMutation(state,{operation:'create',domain,record:sample.record,idempotencyKey:`create:${domain}`,userConfirmed:true},opts);state=out.state;assert.equal((domain==='memory'?state.memory.entries:state[domain]).some(x=>x.id===sample.record.id),true,domain);
  out=Action.applyMutation(state,{operation:'update',domain,id:sample.record.id,patch:sample.patch,expectedRevision:1,idempotencyKey:`update:${domain}`,userConfirmed:true},opts);state=out.state;assert.equal(out.result.revision,2,domain);
  out=Action.applyMutation(state,{operation:'delete',domain,id:sample.record.id,idempotencyKey:`delete:${domain}`,userConfirmed:true},opts);state=out.state;assert.equal((domain==='memory'?state.memory.entries:state[domain]).some(x=>x.id===sample.record.id),false,domain);assert.ok(state.meta.syncTombstones.some(x=>x.domain===domain&&x.id===sample.record.id&&x.explicit===true),domain);
 }
 assert.ok(state.memory.deletedIds.includes('mem1'));
});

test('create and update share the same numeric validation rules',()=>{
 let state=Action.applyMutation(base(),{operation:'create',domain:'workouts',record:{id:'w-valid',name:'Squat',weight:'100',rpe:'8'},userConfirmed:true},opts).state;
 assert.equal(state.workouts[0].weight,100);assert.equal(state.workouts[0].rpe,8);
 assert.throws(()=>Action.applyMutation(state,{operation:'update',domain:'workouts',id:'w-valid',patch:{weight:-1},userConfirmed:true},opts),code('INVALID_PATCH'));
 state=Action.applyMutation(state,{operation:'create',domain:'meals',record:{id:'m-valid',name:'Lunch',kcal:600},userConfirmed:true},opts).state;
 assert.throws(()=>Action.applyMutation(state,{operation:'update',domain:'meals',id:'m-valid',patch:{kcal:-20},userConfirmed:true},opts),code('INVALID_PATCH'));
 state=Action.applyMutation(state,{operation:'create',domain:'runs',record:{id:'r-valid',distance:5,duration:30},userConfirmed:true},opts).state;
 assert.throws(()=>Action.applyMutation(state,{operation:'update',domain:'runs',id:'r-valid',patch:{distance:-5},userConfirmed:true},opts),code('INVALID_PATCH'));
});

test('confirmed writes are idempotent by proposal/call id',()=>{
 const args={domain:'workouts',record:{id:'w-idem',name:'Bench',sets:3,reps:8,weight:80}};
 const first=Action.executeTool(base(),'createRecord',args,{...opts,idempotencyKey:'proposal-1'});
 const second=Action.executeTool(first.state,'createRecord',args,{...opts,idempotencyKey:'proposal-1'});
 assert.equal(second.duplicate,true);assert.equal(second.state.workouts.length,1);assert.equal(second.state.meta.actionReceipts.length,1);
 assert.throws(()=>Action.executeTool(first.state,'createRecord',{domain:'workouts',record:{id:'other',name:'Deadlift'}},{...opts,idempotencyKey:'proposal-1'}),code('IDEMPOTENCY_KEY_REUSE'));
});

test('revision conflicts block stale updates before mutation',()=>{
 const created=Action.applyMutation(base(),{operation:'create',domain:'planner',record:{id:'p-conflict',title:'Plan'},userConfirmed:true},opts);
 assert.throws(()=>Action.applyMutation(created.state,{operation:'update',domain:'planner',id:'p-conflict',patch:{title:'Stale'},expectedRevision:2,userConfirmed:true},opts),code('REVISION_CONFLICT'));
 assert.equal(created.state.planner[0].title,'Plan');
});

test('write core refuses unconfirmed execution',()=>{
 assert.throws(()=>Action.executeTool(base(),'createRecord',{domain:'workouts',record:{id:'w-no',name:'Nope'}},{ownerUid:'u1',clock,idFactory,sync:Sync,memory:Memory,userConfirmed:false}),code('CONFIRMATION_REQUIRED'));
});

test('owner mismatch is blocked before any record changes',()=>{
 assert.throws(()=>Action.applyMutation(base(),{operation:'create',domain:'meals',record:{id:'m-owner',name:'Meal'},userConfirmed:true},{...opts,ownerUid:'u2'}),code('ACTION_OWNER_MISMATCH'));
});

test('explicit history delete cannot be resurrected by a stale cloud record',()=>{
 const created=Action.applyMutation(base(),{operation:'create',domain:'workouts',record:{id:'w-delete',name:'Squat'},userConfirmed:true},opts);
 const deleted=Action.applyMutation(created.state,{operation:'delete',domain:'workouts',id:'w-delete',userConfirmed:true},opts);
 const remote=base();remote.workouts=[{id:'w-delete',name:'stale remote',updatedAt:'2026-09-08T11:30:00.000Z'}];
 const merged=Sync.mergeActiveStates(deleted.state,remote,{ownerUid:'u1',clock:Date.parse('2026-09-08T12:01:00Z')});assert.equal(merged.workouts.length,0);
});

test('memory save keeps semantic history while returning one active fact',()=>{
 let state=base();
 let out=Action.executeTool(state,'saveMemory',{type:'goal',key:'race_goal',value:'10K under 45 minutes',importance:5},{...opts,idempotencyKey:'mem-a'});state=out.state;
 out=Action.executeTool(state,'saveMemory',{type:'goal',key:'race_goal',value:'10K under 44 minutes',importance:5},{...opts,idempotencyKey:'mem-b'});state=out.state;
 const rows=state.memory.entries.filter(x=>x.type==='goal'&&x.key==='race_goal');assert.equal(rows.length,2);assert.ok(rows.some(x=>x.status==='active'&&x.value.includes('44')));assert.ok(rows.some(x=>x.status==='superseded'&&x.value.includes('45')));
});

test('goal update uses the same receipt and memory durability boundary',()=>{
 const out=Action.executeTool(base(),'updateGoal',{goal:'Run faster'},{...opts,idempotencyKey:'goal-1'});assert.equal(out.state.profile.goal,'Run faster');assert.equal(out.state.onboarding.goal,'Run faster');assert.ok(out.state.memory.entries.some(x=>x.key==='primary_goal'&&x.value==='Run faster'));assert.ok(out.state.meta.actionReceipts.some(x=>x.key==='goal-1'));
});

test('rollback restores an updated record without mutating the prior snapshot',()=>{
 const initial=base(),created=Action.applyMutation(initial,{operation:'create',domain:'body',record:{id:'b-roll',weight:70},userConfirmed:true},opts),updated=Action.applyMutation(created.state,{operation:'update',domain:'body',id:'b-roll',patch:{weight:69},userConfirmed:true},opts);
 const rolled=Action.rollback(updated.state,updated.inverse,{...opts,idempotencyKey:'rollback-1'});assert.equal(rolled.state.body[0].weight,70);assert.equal(initial.body.length,0);
});

test('diagnostics reports action receipts and explicit deletion evidence',()=>{
 const c=Action.applyMutation(base(),{operation:'create',domain:'runs',record:{id:'r-diag',distance:1,duration:6},idempotencyKey:'diag-c',userConfirmed:true},opts),d=Action.applyMutation(c.state,{operation:'delete',domain:'runs',id:'r-diag',idempotencyKey:'diag-d',userConfirmed:true},opts),report=Action.diagnostics(d.state);assert.equal(report.contractVersion,'garang-data-action-v1');assert.equal(report.counts.runs,0);assert.equal(report.receipts,2);assert.equal(report.tombstones,1);
});
console.log(`${passed} action/data reliability tests passed`);
