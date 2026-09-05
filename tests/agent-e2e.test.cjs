'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Agent=require('../06_features/final/agent-contract-v1.js');
const root=path.resolve(__dirname,'..');

class MockStorage{
 constructor(){this.map=new Map();}
 get length(){return this.map.size;}
 key(i){return [...this.map.keys()][i]??null;}
 getItem(k){return this.map.has(String(k))?this.map.get(String(k)):null;}
 setItem(k,v){this.map.set(String(k),String(v));}
 removeItem(k){this.map.delete(String(k));}
}
const localStorage=new MockStorage();
const context={console,setTimeout,clearTimeout,Storage:MockStorage,localStorage,CustomEvent:class{constructor(type,init={}){this.type=type;this.detail=init.detail;}},document:{getElementById(){return null;}},crypto:{randomUUID:()=>`id_${Math.random().toString(36).slice(2)}`},dispatchEvent(){}};
context.window=context;context.globalThis=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'06_features/final/agent-state-hook-v1.js'),'utf8'),context);

const state={meta:{schemaVersion:5,updatedAt:'2026-09-05T00:00:00.000Z'},profile:{goal:'퍼포먼스 향상'},onboarding:{goal:'퍼포먼스 향상'},preferences:{language:'en',unit:'metric'},planner:[],workouts:[{id:'w1',name:'바벨 벤치프레스'}],meals:[],runs:[],body:[],memory:{entries:[]},actionLog:[]};
context.state=state;
vm.runInContext("localStorage.setItem('garang_demo_state_v3',JSON.stringify(state));",context);
const bridge=context.GarangAgentStateBridge;
assert.equal(bridge.ready(),true);

(async()=>{
 let passed=0;const test=async(name,fn)=>{await fn();passed++;console.log(`PASS ${name}`);};
 await test('mock question creates proposal without mutating state',async()=>{
  const session=Agent.createSession({getState:()=>bridge.getState(),applyWrite:(tool,args)=>bridge.applyWrite(tool,args)});
  const result=await session.run({message:'Create a plan for today.',context:{profile:state.profile},language:'en'},{adapter:Agent.createMockAdapter()});
  assert.equal(state.planner.length,0);
  assert.equal(result.proposals.length,1);
  assert.equal(result.proposals[0].tool,'createPlan');
  const confirmed=session.confirm(result.proposals[0].id,true);
  assert.equal(confirmed.proposal.status,'confirmed');
  assert.equal(state.planner.length,1);
  assert.equal(state.planner[0].source,'agent');
  assert.equal(state.planner[0].status,'confirmed');
 });

 await test('rejected write changes nothing',async()=>{
  const before=state.planner.length;
  const session=Agent.createSession({getState:()=>bridge.getState(),applyWrite:(tool,args)=>bridge.applyWrite(tool,args)});
  const result=await session.run({message:'Create a plan',context:{},language:'en'},{adapter:Agent.createMockAdapter()});
  session.confirm(result.proposals[0].id,false);
  assert.equal(state.planner.length,before);
 });

 await test('approved goal write changes live GARANG state and persisted state',async()=>{
  const session=Agent.createSession({getState:()=>bridge.getState(),applyWrite:(tool,args)=>bridge.applyWrite(tool,args)});
  const result=await session.run({message:'Change my goal',context:{},language:'en'},{adapter:Agent.createMockAdapter()});
  session.confirm(result.proposals[0].id,true);
  assert.equal(state.profile.goal,'Improve performance');
  assert.equal(state.onboarding.goal,'Improve performance');
  const persisted=JSON.parse(localStorage.getItem('garang_demo_state_v3'));
  assert.equal(persisted.profile.goal,'Improve performance');
  assert.ok(persisted.actionLog.some(x=>x.action==='agent_updateGoal'&&x.userConfirmed===true));
 });

 await test('memory write deduplicates by type and key',()=>{
  bridge.applyWrite('saveMemory',{type:'goal',key:'race_goal',value:'10K under 45 minutes',importance:5});
  bridge.applyWrite('saveMemory',{type:'goal',key:'race_goal',value:'10K under 44 minutes',importance:5});
  const rows=state.memory.entries.filter(x=>x.type==='goal'&&x.key==='race_goal');
  assert.equal(rows.length,1);assert.equal(rows[0].value,'10K under 44 minutes');assert.equal(rows[0].userConfirmed,true);
 });

 await test('Coach v4 keeps full-English prompts persistent above composer',()=>{
  const source=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-coach-agent-v4.js'),'utf8');
  for(const text of ["Set today's training intensity based on my records.",'Analyze my recent workout records.',"Analyze today's nutrition based on my saved meals.",'How is my recovery today?','Create a plan for today.'])assert.ok(source.includes(text),text);
  assert.ok(source.includes("composerWrap.insertBefore(strip,composer)"));
  assert.ok(source.includes("session.confirm(entry.proposal.id,approved)"));
  assert.ok(source.includes("root.querySelector('.g2-empty-chat .g2-prompts')?.remove()"));
 });

 console.log(`${passed} Agent E2E tests passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
