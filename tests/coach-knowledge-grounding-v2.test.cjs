'use strict';
const assert=require('node:assert/strict');
const Grounding=require('../02_core/coach-knowledge-grounding-v2.js');

const coachRules=[
  {id:'V5R004',title:'회복',rule:'같은 부위를 짧은 간격으로 고강도 훈련했거나 퍼포먼스가 하락하면 강도 또는 볼륨을 낮추고 회복 우선.'},
  {id:'V5R005',title:'단백질',rule:'단백질은 체중과 목표를 기준으로 조정.'},
  {id:'V5R036',title:'수면 부족',rule:'고강도 대신 강도나 볼륨을 낮추는 선택을 우선'},
  {id:'V5R001',title:'Progressive overload',rule:'안정적 달성 시 소폭 증량을 검토'}
];

{
  const result=Grounding.ground({
    decision:{decisionId:'d1',mode:'reduce',reasonCodes:['SHORT_SLEEP']},
    userState:{fatigue:{reasons:['SHORT_SLEEP']}},
    query:'오늘 벤치 세게 해도 돼?',
    coachRules
  });
  assert.equal(result.decisionIdentity.decisionId,'d1');
  assert.equal(result.decisionIdentity.mode,'reduce');
  assert.ok(result.queryTags.includes('recovery'));
  assert.ok(result.evidence.some(item=>item.id==='V5R036'));
  assert.equal(result.contract.decisionOwnedBy,'GARANG');
  assert.equal(result.contract.llmRole,'explain_only');
  assert.equal(result.contract.stateMutationAllowed,false);
}

{
  const result=Grounding.ground({
    decision:{decisionId:'d2',mode:'progress',reasonCodes:['READINESS_HIGH']},
    query:'다음 세션 중량 올려도 돼?',
    coachRules
  });
  assert.ok(result.queryTags.includes('progression'));
  assert.ok(result.evidence.some(item=>item.id==='V5R001'));
}

{
  const grounding=Grounding.ground({
    decision:{decisionId:'d3',mode:'maintain',reasonCodes:['OUTCOME_GAP']},
    nutrition:{mode:'protein_support',reasonCodes:['PROTEIN_GAP']},
    coachRules
  });
  assert.ok(grounding.queryTags.includes('nutrition'));
  assert.ok(grounding.evidence.some(item=>item.id==='V5R005'));
  const pass=Grounding.verifyAlignment(grounding,{alignment:{decisionId:'d3',decisionMode:'maintain',reasonCodesUsed:['PROTEIN_GAP']}});
  assert.equal(pass.ok,true);
  const fail=Grounding.verifyAlignment(grounding,{alignment:{decisionId:'d3',decisionMode:'progress',reasonCodesUsed:['MADE_UP_REASON']}});
  assert.equal(fail.ok,false);
  assert.deepEqual(fail.unsupportedReasons,['MADE_UP_REASON']);
}

{
  const result=Grounding.ground({decision:{decisionId:'d4',mode:'maintain',reasonCodes:[]},coachRules:[],query:'잡담'});
  assert.equal(result.evidenceCount,0);
  assert.deepEqual(result.warnings,['NO_RELEVANT_KNOWLEDGE_EVIDENCE']);
}

console.log('coach-knowledge-grounding-v2: PASS');