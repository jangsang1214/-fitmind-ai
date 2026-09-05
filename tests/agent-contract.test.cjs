'use strict';
const assert=require('node:assert/strict');
const Agent=require('../06_features/final/agent-contract-v1.js');
let passed=0;
async function test(name,fn){await fn();passed++;console.log(`PASS ${name}`);}
const clock=()=>new Date('2026-09-05T00:00:00.000Z');
let seq=0;const idFactory=prefix=>`${prefix}_${++seq}`;

(async()=>{
 await test('request freezes the provider language contract',()=>{
  const req=Agent.createRequest({message:'How is my workout?',context:{workouts:[]},language:'en'},{clock,idFactory});
  assert.equal(req.contractVersion,'garang-agent-action-v1');
  assert.equal(req.language,'en');assert.equal(req.locale,'en-US');
  assert.equal(req.policy.writeRequiresConfirmation,true);assert.equal(req.policy.providerMustRespectLanguage,true);
 });

 await test('English mock output contains no Hangul',async()=>{
  const req=Agent.createRequest({message:'Create a plan for me',context:{},language:'en'},{clock,idFactory});
  const raw=await Agent.createMockAdapter({idFactory}).respond(req);
  const response=Agent.validateResponse(raw,req,{idFactory});
  assert.equal(/[가-힣]/.test(response.answer),false);
  assert.ok(response.toolCalls.some(x=>x.tool==='createPlan'&&x.requiresConfirmation));
 });

 await test('Korean mock output follows Korean language',async()=>{
  const req=Agent.createRequest({message:'오늘 운동 기록 봐줘',context:{},language:'ko'},{clock,idFactory});
  const response=Agent.validateResponse(await Agent.createMockAdapter({idFactory}).respond(req),req,{idFactory});
  assert.match(response.answer,/[가-힣]/);
 });

 await test('unknown tools are rejected at contract boundary',()=>{
  const req=Agent.createRequest({message:'x',context:{},language:'en'},{clock,idFactory});
  assert.throws(()=>Agent.validateResponse({answer:'x',toolCalls:[{tool:'executeCode',args:{}}]},req,{idFactory}),/TOOL_NOT_ALLOWED/);
 });

 await test('write proposal never mutates before user approval',async()=>{
  let applied=0;
  const session=Agent.createSession({getState:()=>({planner:[]}),applyWrite:()=>{applied++;return {ok:true};},clock,idFactory});
  const result=await session.run({message:'계획 만들어줘',context:{},language:'ko'},{adapter:Agent.createMockAdapter({idFactory})});
  assert.equal(applied,0);assert.equal(result.proposals.length,1);assert.equal(result.proposals[0].status,'pending');
 });

 await test('rejected write never mutates',async()=>{
  let applied=0;
  const session=Agent.createSession({getState:()=>({planner:[]}),applyWrite:()=>{applied++;},clock,idFactory});
  const result=await session.run({message:'Create a plan',context:{},language:'en'},{adapter:Agent.createMockAdapter({idFactory})});
  const resolved=session.confirm(result.proposals[0].id,false);
  assert.equal(resolved.proposal.status,'rejected');assert.equal(applied,0);
 });

 await test('approved write executes exactly once',async()=>{
  let applied=0,lastTool='';
  const session=Agent.createSession({getState:()=>({planner:[]}),applyWrite:tool=>{applied++;lastTool=tool;return {saved:true};},clock,idFactory});
  const result=await session.run({message:'Create a plan',context:{},language:'en'},{adapter:Agent.createMockAdapter({idFactory})});
  const id=result.proposals[0].id,confirmed=session.confirm(id,true);
  assert.equal(confirmed.proposal.status,'confirmed');assert.equal(applied,1);assert.equal(lastTool,'createPlan');assert.deepEqual(confirmed.result,{saved:true});
  assert.throws(()=>session.confirm(id,true),/PROPOSAL_ALREADY_RESOLVED/);assert.equal(applied,1);
 });

 await test('read tools execute without mutating source state',async()=>{
  const state={workouts:[{id:'w1',name:'바벨 벤치프레스'}]};
  const session=Agent.createSession({getState:()=>state,clock,idFactory});
  const result=await session.run({message:'Analyze my recent workout',context:{},language:'en'},{adapter:Agent.createMockAdapter({idFactory})});
  assert.equal(result.reads.length,1);assert.equal(result.reads[0].call.tool,'getWorkoutHistory');
  result.reads[0].result[0].id='changed';assert.equal(state.workouts[0].id,'w1');
 });

 await test('write tool arguments are validated before proposal',()=>{
  const req=Agent.createRequest({message:'x',context:{},language:'en'},{clock,idFactory});
  assert.throws(()=>Agent.validateResponse({answer:'x',toolCalls:[{tool:'deleteRecord',args:{domain:'settings',id:'x'}}]},req,{idFactory}),/INVALID_TOOL_ARGS/);
 });

 console.log(`${passed} agent contract tests passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
