'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const TODAY=new Date().toISOString().slice(0,10);
const YESTERDAY=new Date(Date.now()-86400000).toISOString().slice(0,10);
let currentState={
 meta:{schemaVersion:5,updatedAt:`${TODAY}T01:00:00.000Z`},
 profile:{goal:'근육 증가'},onboarding:{goal:'근육 증가'},preferences:{language:'ko',unit:'metric'},
 planner:[],workouts:[],meals:[],runs:[],body:[],memory:{entries:[]},
 dailyCheckins:[{id:'legacy-old',date:YESTERDAY,sleepHours:5,energy:2,stress:4,soreness:{general:4},updatedAt:`${YESTERDAY}T08:00:00.000Z`}],
 checkins:[{id:'today-live',date:TODAY,sleep:8,energy:4,stress:2,soreness:2,updatedAt:`${TODAY}T00:30:00.000Z`}]
};
const main={querySelector(){return null;},querySelectorAll(){return[];},appendChild(){}};
const head={appendChild(){}};
const document={
 documentElement:{lang:'ko'},head,
 getElementById(id){return id==='main'?main:null;},
 addEventListener(){},
 createElement(){return {style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},appendChild(){},querySelector(){return null;},querySelectorAll(){return[];}};}
};
const context={
 console,document,structuredClone,requestAnimationFrame:fn=>{fn();return 1;},
 MutationObserver:class{constructor(fn){this.fn=fn;}observe(){}disconnect(){}},
 CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}},
 addEventListener(){},dispatchEvent(){},setTimeout,clearTimeout
};
context.window=context;context.globalThis=context;
context.GarangAgentStateBridge={
 ready:()=>true,
 getState:()=>structuredClone(currentState),
 getMemoryContext:()=>({entries:[]}),
 applyWrite(){throw new Error('not used');}
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'02_core/state-intelligence-v1.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'02_core/decision-intelligence-v1.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-coach-profile-stability-v1.js'),'utf8'),context);

let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
test('current app check-in is not masked by a non-empty legacy dailyCheckins array',()=>{
 const rows=context.GarangCoachProfileStability.canonicalCheckins(currentState);
 assert.equal(rows.length,2);
 const today=rows.find(x=>x.date===TODAY);
 assert.ok(today);
 assert.equal(today.sleepHours,8);
 assert.equal(today.soreness.general,2);
 const user=context.GarangAgentStateBridge.getUserState();
 assert.notEqual(user.readiness.band,'unknown');
 assert.notEqual(user.fatigue.band,'unknown');
});
test('same-day legacy/current aliases resolve to the newer/current app check-in',()=>{
 currentState={...currentState,
  dailyCheckins:[{id:'legacy-today',date:TODAY,sleepHours:4,energy:1,stress:5,soreness:{general:5},updatedAt:`${TODAY}T00:10:00.000Z`}],
  checkins:[{id:'app-today',date:TODAY,sleep:8,energy:4,stress:2,soreness:1,updatedAt:`${TODAY}T00:40:00.000Z`}]
 };
 const rows=context.GarangCoachProfileStability.canonicalCheckins(currentState);
 assert.equal(rows.length,1);
 assert.equal(rows[0].id,'app-today');
 assert.equal(rows[0].sleepHours,8);
 const decision=context.GarangAgentStateBridge.getDecisionContext();
 assert.notEqual(decision.signals.readinessBand,'unknown');
 assert.notEqual(decision.signals.fatigueBand,'unknown');
});
test('Coach profile runtime is read-only and exposes the intended profile interaction',()=>{
 const source=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-coach-profile-stability-v1.js'),'utf8');
 assert.ok(source.includes('gcp-profile-trigger'));
 assert.ok(source.includes('GARANG이 나를 이해하는 방식'));
 assert.ok(source.includes('g2-chat-head'));
 assert.ok(source.includes("window.GarangAgentStateBridge=StableBridge"));
 assert.equal(/localStorage\.setItem\s*\(/.test(source),false);
 assert.equal(/applyWrite\s*\(/.test(source),false);
});
console.log(`${passed} Coach profile/stability tests passed`);
