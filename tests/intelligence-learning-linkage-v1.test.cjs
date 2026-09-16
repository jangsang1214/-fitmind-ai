'use strict';
const assert=require('node:assert/strict');
const Contract=require('../06_features/final/agent-contract-v2.js');

(async()=>{
  let applied=null;
  const times=['2026-09-16T09:00:00.000Z','2026-09-16T09:00:01.000Z','2026-09-16T09:00:02.000Z'];let ti=0;
  const session=Contract.createSession({
    getState:()=>({planner:[]}),
    idFactory:prefix=>`${prefix}-fixed`,
    clock:()=>new Date(times[Math.min(ti++,times.length-1)]),
    applyWrite:(tool,args,meta)=>{applied={tool,args,meta};return {ok:true};}
  });
  const request=Contract.createRequest({
    message:'오늘 운동을 어떻게 조정할까?',
    language:'ko',
    context:{decision:{decisionId:'2026-09-16:reduce:LOW_ENERGY',mode:'reduce',confidence:.82,reasonCodes:['MODE_REDUCE','LOW_ENERGY']}}
  },{idFactory:prefix=>`${prefix}-request`,clock:()=>new Date('2026-09-16T08:59:00.000Z')});
  const adapter={respond:async()=>({answer:'오늘은 볼륨을 낮춘 계획을 제안합니다.',meta:{provider:'openai'},toolCalls:[{id:'recommendation-1',tool:'createPlan',args:{type:'workout',duration:40,intensityScale:.7,volumeScale:.7,reasonCodes:['MODE_REDUCE','LOW_ENERGY']},reason:'LOW_ENERGY'}]})};
  const run=await session.run(request,{adapter});
  assert.equal(run.proposals.length,1);
  const proposal=run.proposals[0];
  assert.equal(proposal.decisionId,'2026-09-16:reduce:LOW_ENERGY');assert.equal(proposal.decisionMode,'reduce');assert.equal(proposal.recommendationId,'recommendation-1');assert.equal(proposal.status,'pending');
  const modified=session.modify('recommendation-1',{args:{duration:35}});assert.equal(modified.recommendationId,'recommendation-1');assert.equal(modified.decisionId,'2026-09-16:reduce:LOW_ENERGY');assert.equal(modified.revision,2);
  const confirmed=session.confirm('recommendation-1',true);assert.equal(confirmed.proposal.status,'confirmed');assert.ok(applied);
  assert.equal(applied.tool,'createPlan');assert.equal(applied.args.decisionId,'2026-09-16:reduce:LOW_ENERGY');assert.equal(applied.args.decisionMode,'reduce');assert.equal(applied.args.recommendationId,'recommendation-1');assert.equal(applied.args.recommendationRevision,2);
  assert.equal(applied.meta.decisionId,'2026-09-16:reduce:LOW_ENERGY');assert.equal(applied.meta.recommendationId,'recommendation-1');assert.equal(applied.meta.userConfirmed,true);
  assert.deepEqual(session.audit.map(row=>row.event),['write_proposed','write_modified','write_confirmed']);
  assert.ok(session.audit.every(row=>row.decisionId==='2026-09-16:reduce:LOW_ENERGY'));
  console.log('PASS intelligence-learning-linkage-v1');
})().catch(error=>{console.error(error);process.exitCode=1;});
