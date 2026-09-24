'use strict';
const assert=require('node:assert/strict');
const Identity=require('../02_core/food-identity-v1.js');

assert.equal(Identity.VERSION,'garang-food-identity-v1');
assert.equal(Identity.validCheckDigit('012345678905'),true);
assert.equal(Identity.validCheckDigit('12345670'),true);
assert.equal(Identity.validCheckDigit('012345678904'),false);
assert.deepEqual(Identity.normalizeGtin('0 12345-67890 5'),{raw:'012345678905',canonical:'00012345678905',display:'012345678905'});
assert.equal(Identity.normalizeGtin('1234'),null);
assert.equal(Identity.normalizeReportNo('2024-0417-36623'),'2024041736623');

const item={foodId:'kfind-processed:P101',name:'GARANG 프로틴바',grams:55,kcal:210,protein:20,carbs:24,fat:6,nutritionStatus:'verified',nutritionSource:{source:'식품영양성분 데이터베이스'}};
const mapping=Identity.mappingFromItem('012345678905',item,{brand:'GARANG LABS',reportNo:'2024-0417-36623',source:'label+korea-processed',confirmedAt:'2026-09-25T00:00:00.000Z'});
assert.equal(mapping.gtin,'00012345678905');
assert.equal(mapping.brand,'GARANG LABS');
assert.equal(mapping.reportNo,'2024041736623');
assert.equal(Identity.findMapping([mapping],'012345678905').foodId,'kfind-processed:P101');
const updated=Identity.mappingFromItem('012345678905',{...item,kcal:205},{confirmedAt:'2026-09-25T01:00:00.000Z'});
assert.equal(Identity.upsertMapping([mapping],updated).length,1);
assert.equal(Identity.upsertMapping([mapping],updated)[0].kcal,205);
assert.deepEqual(Identity.queryNames({brand:'GARANG LABS',productName:'프로틴바'}),['GARANG LABS 프로틴바','프로틴바','GARANG LABS']);
assert.ok(Identity.identityKey({brand:'GARANG LABS',productName:'프로틴바',reportNo:'2024-0417-36623'}).includes('garanglabs'));

console.log('food-identity-v1: PASS');
