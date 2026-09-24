'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Korean=require('../02_core/korean-food-normalization-v1.js');
const Builder=require('../scripts/build-korean-food-corpus.cjs');

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

console.log(JSON.stringify({status:'PASS',normalization:normalized,shards:Object.keys(shards)},null,2));
console.log('korean-food-corpus-v1: PASS');
