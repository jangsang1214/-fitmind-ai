'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const Agent=require('../06_features/final/agent-contract-v1.js');
const Memory=require('../02_core/memory-intelligence-v1.js');
class TestStorage{constructor(){this.map=new Map();}getItem(k){return this.map.has(k)?this.map.get(k):null;}setItem(k,v){this.map.set(k,String(v));}removeItem(k){this.map.delete(k);}key(i){return [...this.map.keys()][i]??null;}get length(){return this.map.size;}}
const localStorage=new TestStorage(),sessionStorage=new TestStorage(),events=[];
global.Storage=TestStorage;global.window={localStorage,sessionStorage,dispatchEvent:event=>events.push(event),crypto:{randomUUID:()=>`id_${Math.random().toString(36).slice(2)}`},firebase:null,GarangMemoryIntelligence:Memory};global.localStorage=localStorage;global.sessionStorage=sessionStorage;global.CustomEvent=class{constructor(type,init){this.type=type;this.detail=init?.detail;}};
require('../06_features/final/agent-state-hook-v1.js');
const APP=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');
const state={profile:{goal:'General fitness'},onboarding:{goal:'General fitness',complete:true},planner:[],workouts:[],meals:[],runs:[],body:[],preferences:{language:'en'},memory:{entries:[],deletedIds:[],nextRevision:1}};
localStorage.setItem('garang_demo_state_v3',JSON.stringify(state));
const bridge=window.GarangAgentStateBridge;assert.ok(bridge?.ready?.(),'live Agent state bridge must bind to the seeded browser storage state');
const tests=[];const test=async(name,fn)=>{await fn();tests.push(name);console.log(`PASS ${name}`);};
(async()=>{
 await test('mock question creates proposal without mutating state',async()=>{const session=Agent.createSession({getState:()=>bridge.getState(),applyWrite:(tool,args)=>bridge.applyWrite(tool,args)});const before=JSON.stringify(state);const result=await session.run({message:'Create a plan for today.',context:{},language:'en'},{adapter:Agent.createMockAdapter()});assert.ok(result.proposals.length>0);assert.equal(JSON.stringify(state),before);});
 await test('rejected write changes nothing',async()=>{const session=Agent.createSession({getState:()=>bridge.getState(),applyWrite:(tool,args)=>bridge.applyWrite(tool,args)});const result=await session.run({message:'Change my goal',context:{},language:'en'},{adapter:Agent.createMockAdapter()});const before=JSON.stringify(state);session.confirm(result.proposals[0].id,false);assert.equal(JSON.stringify(state),before);});
 await test('approved goal write changes live GARANG state and persists current semantic goal',async()=>{const session=Agent.createSession({getState:()=>bridge.getState(),applyWrite:(tool,args)=>bridge.applyWrite(tool,args)});const result=await session.run({message:'Change my goal',context:{},language:'en'},{adapter:Agent.createMockAdapter()});session.confirm(result.proposals[0].id,true);assert.equal(state.profile.goal,'Improve performance');assert.equal(state.onboarding.goal,'Improve performance');const persisted=JSON.parse(localStorage.getItem('garang_demo_state_v3'));assert.equal(persisted.profile.goal,'Improve performance');assert.ok(persisted.actionLog.some(x=>x.action==='agent_updateGoal'&&x.userConfirmed===true));assert.ok(state.memory.entries.some(x=>x.key==='primary_goal'&&x.value==='Improve performance'&&x.status==='active'));});
 await test('memory write preserves changed values as temporal history',()=>{bridge.applyWrite('saveMemory',{type:'goal',key:'race_goal',value:'10K under 45 minutes',importance:5});bridge.applyWrite('saveMemory',{type:'goal',key:'race_goal',value:'10K under 44 minutes',importance:5});const rows=state.memory.entries.filter(x=>x.type==='goal'&&x.key==='race_goal');assert.equal(rows.length,2);const active=rows.find(x=>x.status==='active'),history=rows.find(x=>x.status==='superseded');assert.equal(active.value,'10K under 44 minutes');assert.equal(history.value,'10K under 45 minutes');assert.equal(history.supersededBy,active.id);assert.equal(active.userConfirmed,true);});
 await test('memory bridge returns only active relevant context and diagnostics',()=>{const contextOut=bridge.getMemoryContext('44 minutes',{limit:5});assert.ok(contextOut.entries.some(x=>x.value.includes('44 minutes')));assert.ok(!contextOut.entries.some(x=>x.value.includes('45 minutes')));const report=bridge.getMemoryDiagnostics();assert.ok(report.active>=1);assert.ok(report.superseded>=1);});
 await test('memory deletion records deleted ID to prevent resurrection',()=>{const target=state.memory.entries.find(x=>x.key==='race_goal'&&x.status==='active');bridge.applyWrite('deleteRecord',{domain:'memory',id:target.id});assert.ok(state.memory.deletedIds.includes(target.id));assert.ok(!state.memory.entries.some(x=>x.id===target.id));});
 await test('canonical Coach Agent owns bilingual persistent prompts above composer',()=>{
  const source=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-coach-agent-v4.js'),'utf8');
  for(const text of ["Set today's training intensity based on my records.",'Analyze my recent workout records.',"Analyze today's nutrition based on my saved meals.",'How is my recovery today?','Create a plan for today.'])assert.ok(source.includes(text),text);
  for(const text of ['오늘 운동 강도를 내 기록 기준으로 정해줘','내 최근 운동 기록을 분석해줘','오늘 저장된 식단 기록을 분석해줘','오늘 회복 상태를 알려줘','오늘 계획을 만들어줘'])assert.ok(source.includes(text),text);
  assert.ok(source.includes("composerWrap.insertBefore(strip,composer)"));assert.ok(source.includes("garangPersistent='1'"));assert.ok(source.includes('data-garang-canonical-prompt'));assert.ok(source.includes("session.confirm(entry.proposal.id,approved)"));assert.ok(source.includes("garangPromptOwner='coach-agent-v4'"));
 });
 await test('canonical Coach Agent absorbed stored-message English repair',()=>{
  const source=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-coach-agent-v4.js'),'utf8');
  for(const phrase of ['Based on today’s records:','There are ${count} saved workout records.',"Today’s recovery score is about",'The external AI is not connected yet, so GARANG is responding with its local Coach Engine.'])assert.ok(source.includes(phrase),phrase);
  for(const token of ['threadMessageById','promptByKo.has(source)','translateKnownCoachText','repairMessageLanguage(root)'])assert.ok(source.includes(token),token);
  assert.ok(source.includes("version:'garang-coach-agent-v4.9'"));
  assert.equal(fs.existsSync(path.join(root,'06_features/ui/runtime/garang-coach-item4-final.js')),false,'retired item4 overlay must stay deleted');
 });
 console.log(`${tests.length} Agent E2E tests passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});