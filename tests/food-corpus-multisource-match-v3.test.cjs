'use strict';

const assert=require('node:assert/strict');
const Matcher=require('../02_core/food-corpus-multisource-match-v3.js');

function target(id,name,{aliases=[],category='기타',serving='100g',quality='estimated'}={}){
  return {food_id:id,name,aliases,category,serving,basis_g:100,kcal:100,protein:5,carbs:15,fat:2,sugar:1,fiber:1,sodium:100,cholesterol:0,saturated_fat:0.5,trans_fat:0,nutrition_status:quality,source:'GARANG current value'};
}
function official(id,name,{dataset='KDDB',category='기타',aliases=[],kcal=200,basisG=100,nutrients={}}={}){
  return {foodId:`official:${dataset}:${id}`,name,aliases,category,serving:`${basisG}g`,basisG,nutrients:{kcal,protein:10,carbs:20,fat:5,sugar:2,fiber:2,sodium:200,cholesterol:1,saturatedFat:1,transFat:0,...nutrients},quality:'verified',provenance:{provider:'MFDS K-FIND',dataset,recordId:id,url:'https://example.invalid/source',sourceDate:'2026-08-28',retrievedAt:'2026-09-15'}};
}

{
  const foods=[target('F1','된장찌개',{category:'국/탕/찌개'})];
  const source=[official('D1','된장찌개',{dataset:'KDDB',category:'찌개 및 전골류',kcal:46})];
  const plan=Matcher.buildPlan(foods,source);
  assert.equal(plan.summary.apply,1);
  assert.equal(plan.apply[0].match,'exact-primary');
  const merged=Matcher.applyPlan(foods,plan);
  assert.equal(merged[0].kcal,46);
  assert.equal(merged[0].nutrition_status,'verified');
  assert.equal(merged[0].provenance.recordId,'D1');
  assert.equal(Matcher.verifyIdentity(foods,merged),true);
}

{
  const foods=[target('F2','닭가슴살',{aliases:['닭고기 가슴살'],category:'육류'})];
  const source=[official('K1','닭고기 가슴살',{dataset:'KFCT',category:'가금류'})];
  const plan=Matcher.buildPlan(foods,source);
  assert.equal(plan.summary.apply,1);
  assert.equal(plan.apply[0].match,'official-name-to-target-alias');
}

{
  const foods=[target('F3','고등어구이',{category:'어패류'})];
  const source=[official('K2','고등어조림',{dataset:'KFCT',category:'어류'})];
  const plan=Matcher.buildPlan(foods,source);
  assert.equal(plan.summary.apply,0);
  assert.equal(plan.preserveExisting[0].reason,'NO_TRACEABLE_MATCH');
}

{
  const foods=[target('F4','라면',{aliases:['라면 1봉'],category:'면'})];
  const source=[official('P1','라면',{dataset:'PFDB',category:'면류',kcal:450})];
  const plan=Matcher.buildPlan(foods,source);
  assert.equal(plan.summary.apply,0);
  assert.equal(plan.preserveExisting[0].reason,'BROAD_NAME_KEEP_CURRENT');
  const merged=Matcher.applyPlan(foods,plan);
  assert.equal(merged[0].kcal,100);
  assert.equal(merged[0].nutrition_status,'estimated');
}

{
  const foods=[target('F5','프로틴바',{category:'과자'})];
  const source=[official('P2','프로틴바',{dataset:'PFDB',category:'과자류'}),official('P3','프로틴바',{dataset:'PFDB',category:'과자류'})];
  const plan=Matcher.buildPlan(foods,source);
  assert.equal(plan.summary.apply,0);
  assert.equal(plan.review[0].reason,'MULTIPLE_EQUIVALENT_CANDIDATES');
}

{
  const foods=[target('F6','닭가슴살',{aliases:['치킨 브레스트'],category:'육류'})];
  const source=[official('P4','치킨 브레스트',{dataset:'PFDB',category:'육가공품'})];
  const plan=Matcher.buildPlan(foods,source);
  assert.equal(plan.summary.apply,0);
  assert.equal(plan.review[0].reason,'PROCESSED_FOOD_IDENTITY_NEEDS_REVIEW');
}

{
  const foods=[target('F7','현미밥',{quality:'verified',category:'밥/곡류/면'})];
  const source=[official('D7','현미밥',{dataset:'KDDB',category:'밥류'})];
  const plan=Matcher.buildPlan(foods,source);
  assert.equal(plan.summary.alreadyVerified,1);
  assert.equal(plan.summary.apply,0);
}

{
  const foods=[target('F8','두부',{category:'콩류'})];
  const source=[official('K8','두부',{dataset:'KFCT',category:'콩류',basisG:50,kcal:45,nutrients:{protein:4,carbs:2,fat:2,sugar:0.5,fiber:0.5,sodium:5,cholesterol:0,saturatedFat:0.3,transFat:0}})];
  const plan=Matcher.buildPlan(foods,source);
  assert.equal(plan.summary.apply,1);
  const merged=Matcher.applyPlan(foods,plan);
  assert.equal(merged[0].kcal,90);
  assert.equal(merged[0].protein,8);
  assert.equal(merged[0].nutrition_basis_g,100);
}

{
  const foods=[target('F9','사과',{category:'과일'})];
  const incomplete=official('K9','사과',{dataset:'KFCT',category:'과일',nutrients:{sugar:null}});
  const plan=Matcher.buildPlan(foods,[incomplete]);
  assert.equal(plan.summary.traceableOfficialRecords,0);
  assert.equal(plan.summary.apply,0);
  assert.equal(plan.preserveExisting[0].reason,'NO_TRACEABLE_MATCH');
}

console.log('food-corpus-multisource-match-v3: ok');
