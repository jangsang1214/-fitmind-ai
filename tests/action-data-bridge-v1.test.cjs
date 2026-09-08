'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
class MockStorage{
 constructor(){this.map=new Map();this.failNext=false;}
 get length(){return this.map.size;}
 key(i){return [...this.map.keys()][i]??null;}
 getItem(k){return this.map.has(String(k))?this.map.get(String(k)):null;}
 setItem(k,v){if(this.failNext){this.failNext=false;throw new Error('quota');}this.map.set(String(k),String(v));}
 removeItem(k){this.map.delete(String(k));}
}
const localStorage=new MockStorage();
const context={console,setTimeout,clearTimeout,Storage:MockStorage,localStorage,CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}},document:{getElementById(){return null;}},crypto:{randomUUID:()=>`id_${Math.random().toString(36).slice(2)}`},dispatchEvent(){}};
context.window=context;context.globalThis=context;vm.createContext(context);
for(const file of ['02_core/sync-durability.js','02_core/memory-intelligence-v1.js','02_core/action-data-reliability-v1.js','06_features/final/agent-state-hook-v1.js','06_features/final/action-data-bridge-v1.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
const state={meta:{schemaVersion:5,updatedAt:'2026-09-08T00:00:00.000Z'},profile:{goal:'performance'},onboarding:{goal:'performance'},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[],meals:[],runs:[],body:[],memory:{entries:[],deletedIds:[]},actionLog:[]};
context.state=state;vm.runInContext("localStorage.setItem('garang_demo_state_v3',JSON.stringify(state));",context);
const bridge=context.GarangActionDataBridge,compat=context.GarangAgentStateBridge;
assert.equal(bridge.ready(),true);
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
const code=expected=>error=>error?.code===expected;

test('confirmed create/update/delete persist through the live bridge',()=>{
 bridge.applyWrite('createRecord',{domain:'workouts',record:{id:'w1',name:'Squat',sets:3,reps:5,weight:100}},{userConfirmed:true,callId:'c1'});
 assert.equal(state.workouts.length,1);assert.equal(JSON.parse(localStorage.getItem('garang_demo_state_v3')).workouts.length,1);
 bridge.applyWrite('updateRecord',{domain:'workouts',id:'w1',patch:{weight:105},expectedRevision:1},{userConfirmed:true,callId:'u1'});assert.equal(state.workouts[0].weight,105);assert.equal(state.workouts[0].revision,2);
 bridge.applyWrite('deleteRecord',{domain:'workouts',id:'w1'},{userConfirmed:true,callId:'d1'});assert.equal(state.workouts.length,0);assert.ok(state.meta.syncTombstones.some(x=>x.domain==='workouts'&&x.id==='w1'&&x.explicit===true));
});

test('same confirmed call id cannot create a duplicate',()=>{
 const args={domain:'meals',record:{id:'meal-1',name:'Lunch',kcal:600}};bridge.applyWrite('createRecord',args,{userConfirmed:true,callId:'meal-create'});bridge.applyWrite('createRecord',args,{userConfirmed:true,callId:'meal-create'});assert.equal(state.meals.filter(x=>x.id==='meal-1').length,1);
});

test('unconfirmed bridge writes are rejected',()=>{assert.throws(()=>bridge.applyWrite('createRecord',{domain:'runs',record:{id:'r-no',distance:1,duration:6}},{callId:'no-confirm'}),code('CONFIRMATION_REQUIRED'));assert.equal(state.runs.length,0);});

test('legacy Agent State Bridge facade routes writes into the new reliability core',()=>{compat.applyWrite('createPlan',{title:'Recovery',duration:30},{userConfirmed:true,callId:'legacy-plan'});assert.equal(state.planner.length,1);assert.ok(state.meta.actionReceipts.some(x=>x.key==='legacy-plan'));});

test('legacy two-argument callbacks can consume only a live confirmation scope',()=>{context.__GARANG_AGENT_CONFIRMED_WRITE_V2__={userConfirmed:true,callId:'scoped-plan',idempotencyKey:'scoped-plan'};try{compat.applyWrite('createPlan',{title:'Scoped recovery',duration:25});}finally{delete context.__GARANG_AGENT_CONFIRMED_WRITE_V2__;}assert.equal(state.planner.some(x=>x.title==='Scoped recovery'),true);assert.ok(state.meta.actionReceipts.some(x=>x.key==='scoped-plan'));assert.throws(()=>compat.applyWrite('createPlan',{title:'No scope',duration:25}),code('CONFIRMATION_REQUIRED'));});

test('local persistence failure rolls the live object back atomically',()=>{const before=JSON.stringify(state);localStorage.failNext=true;assert.throws(()=>bridge.applyWrite('createRecord',{domain:'body',record:{id:'b-fail',weight:70}},{userConfirmed:true,callId:'body-fail'}),/quota/);assert.equal(JSON.stringify(state),before);assert.equal(JSON.parse(localStorage.getItem('garang_demo_state_v3')).body.some(x=>x.id==='b-fail'),false);});

test('bridge diagnostics expose durable receipts and tombstones',()=>{const report=bridge.getDiagnostics();assert.equal(report.contractVersion,'garang-data-action-v1');assert.ok(report.receipts>=5);assert.ok(report.tombstones>=1);});
console.log(`${passed} action data bridge tests passed`);
