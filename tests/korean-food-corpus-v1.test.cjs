'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Korean=require('../02_core/korean-food-normalization-v1.js');
const Builder=require('../scripts/build-korean-food-corpus.cjs');

const manifest=require('../04_data/knowledge/food-db-supplemental-korea-v1/manifest.json');
const meta=require('../04_data/knowledge/food-db-supplemental-korea-v1/meta.json');
const canonical=require('../04_data/knowledge/food-db.json');
const usda=require('../04_data/knowledge/food-db-supplemental-usda-v1.json');
const FoodIntelligence=require('../02_core/food-intelligence-v2.js');

assert.equal(manifest.status,'ready');
assert.equal(manifest.rawCount,19617);
assert.ok(manifest.count>=2000,'K-FIND representative corpus unexpectedly small');
assert.equal(meta.records,manifest.count);
assert.equal(meta.source.provider,'식품의약품안전처 K-FIND');
assert.equal(meta.guardrails.gramBasisOnlyForAutomaticCalculation,true);
assert.equal(Object.keys(manifest.shards).length,18);
let materialized=0;
for(const spec of Object.values(manifest.shards)){
 const payload=require('../04_data/knowledge/food-db-supplemental-korea-v1/'+spec.file);
 assert.equal(payload.count,payload.records.length);
 assert.ok(payload.records.every(row=>row.nutrition_status==='verified'));
 assert.ok(payload.records.every(row=>row.basis_unit==='g'));
 assert.ok(payload.records.every(row=>row.provenance?.provider==='식품의약품안전처 K-FIND'));
 const sample=payload.records[0];
 if(sample){
  const hit=FoodIntelligence.resolve(payload.records,sample.name,{mode:'manual'});
  assert.equal(hit.status,'matched');
  assert.equal(hit.food.food_id,sample.food_id);
 }
 materialized+=payload.records.length;
}
assert.equal(materialized,manifest.count);
assert.equal(canonical.length+usda.count+manifest.count,500+5721+manifest.count);


const pizza={foodCd:'D202-120000000-0194',foodNm:'피자_골든큐브스테이크 피자',typeNm:'음식',enerc:'215',nutConSrtrQua:'100g',prot:'11.35',fatce:'8.1',chocdf:'25.4',sugar:'3.89',nat:'361',companyNm:'유로코피자',crtYmd:'2022-10-30'};
const normalized=Korean.normalize(pizza);
assert.equal(normalized.productName,'골든큐브스테이크 피자');
assert.equal(normalized.brand,'유로코피자');
assert.equal(normalized.displayName,'유로코피자 · 골든큐브스테이크 피자');
assert.ok(normalized.aliases.includes('피자_골든큐브스테이크 피자'));
assert.ok(normalized.aliases.includes('유로코피자 골든큐브스테이크 피자'));
assert.equal(Builder.bucketOf('유로코피자'),'ㅇ');
assert.equal(Builder.bucketOf('피자'),'ㅍ');
assert.equal(Builder.bucketOf('Domino'),'D');
assert.ok(Builder.rowBuckets({product_name:'골든큐브스테이크 피자',brand:'유로코피자',category:'피자',name:'유로코피자 · 골든큐브스테이크 피자'}).includes('ㄱ'));

const tmp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'garang-kfood-'));
const rows=[
 {food_id:'a',name:'유로코피자 · 골든큐브스테이크 피자',product_name:'골든큐브스테이크 피자',brand:'유로코피자',category:'피자'},
 {food_id:'b',name:'도미노피자 · 랍스터슈림프',product_name:'랍스터슈림프',brand:'도미노피자',category:'피자'}
];
const shards=Builder.writeShards(tmp,rows);
assert.ok(shards['ㅇ']);assert.ok(shards['ㄱ']);assert.ok(shards['ㄷ']);assert.ok(shards['ㄹ']);assert.ok(shards['ㅍ']);
for(const spec of Object.values(shards))assert.ok(fs.existsSync(path.join(tmp,spec.file)));

const app=fs.readFileSync(require.resolve('../01_app/app.js'),'utf8');
assert.ok(app.includes("KOREAN_FOOD_MANIFEST_PATH='04_data/knowledge/food-db-supplemental-korea-v1/manifest.json'"));
assert.ok(app.includes('findKoreanSupplementalFood(q,options={})'));
assert.ok(app.includes('return await findKoreanSupplementalFood(q,options)||await findUsdaSupplementalFood(q,options)'));
assert.ok(app.includes('buildSupplementalIndex(rows)'));
assert.ok(app.includes("source:'korea-official'"));

console.log(JSON.stringify({status:'PASS',normalization:normalized,shards:Object.keys(shards),kfindRaw:manifest.rawCount,kfindRepresentatives:manifest.count,effectiveCoverage:canonical.length+usda.count+manifest.count},null,2));
console.log('korean-food-corpus-v1: PASS');
