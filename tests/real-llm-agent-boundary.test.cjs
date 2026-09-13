'use strict';
const assert=require('node:assert/strict');
const Agent=require('../06_features/final/agent-contract-v2.js');
let seq=0;const idFactory=prefix=>`${prefix}_${++seq}`,clock=()=>new Date('2026-09-14T12:00:00Z');
(async()=>{
 let writes=0,last=null;
 const session=Agent.createSession({getState:()=>({planner:[]}),applyWrite:(tool,args,meta)=>{writes++;last={tool,args,meta};return {id:'plan-1'};},idFactory,clock});
 const llmAdapter={respond:async request=>({answer:'GARANG 판단을 설명합니다.',requestId:request.requestId,meta:{provider:'real-llm-gateway'},toolCalls:[{id:'llm-plan-1',tool:'createPlan',args:{title:'오늘 벤치 볼륨 조정',type:'workout',duration:35,reasonCodes:['LOW_SLEEP']},reason:'GARANG decision recommends reduced load'}]})};
 const result=await session.run({message:'오늘 벤치 세게 해도 돼?',context:{decision:{mode:'reduce',confidence:.84,reasonCodes:['LOW_SLEEP']}},language:'ko'},{adapter:llmAdapter});
 assert.equal(writes,0,'LLM proposal must cause zero mutation before confirmation');assert.equal(result.proposals.length,1);assert.equal(result.proposals[0].status,'pending');
 const rejectedSession=Agent.createSession({getState:()=>({planner:[]}),applyWrite:()=>{writes++;},idFactory,clock});const rejected=await rejectedSession.run({message:'x',context:{decision:{mode:'reduce'}},language:'ko'},{adapter:llmAdapter});rejectedSession.confirm(rejected.proposals[0].id,false);assert.equal(writes,0,'rejection must cause zero mutation');
 const approved=session.confirm(result.proposals[0].id,true);assert.equal(writes,1,'approval must apply exactly once');assert.equal(last.tool,'createPlan');assert.equal(last.meta.userConfirmed,true);assert.equal(last.meta.idempotencyKey,'llm-plan-1');assert.equal(approved.proposal.status,'confirmed');
 assert.throws(()=>session.confirm(result.proposals[0].id,true),error=>error?.code==='PROPOSAL_ALREADY_RESOLVED');assert.equal(writes,1,'repeat approval must not write twice');
 console.log('real LLM Agent confirmation boundary: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
