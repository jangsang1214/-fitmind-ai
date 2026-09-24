'use strict';

const assert=require('node:assert/strict');
const Adapters=require('../02_core/food-source-adapters-v2.js');
const Foundation=require('../02_core/food-data-foundation-v2.js');
const Import=require('../scripts/import-official-food-data.cjs');

const kfindFixture={
  FOOD_CD:'KTEST001',FOOD_NM_KR:'흰쌀밥',FOOD_NM_EN:'Cooked white rice',FOOD_CAT3_NM:'밥류',DB_GRP_CM:'음식',NUT_CON_SRTR_QUA:'100g',
  ENERGY_KCAL:'130',PROTEIN_G:'2.4',CARBOHYDRATE_G:'28.7',FAT_G:'0.3',SODIUM_MG:'1',DATA_CRTR_YMD:'2026-09-01'
};
const kfind=Adapters.adaptKfind(kfindFixture,{retrievedAt:'2026-09-15'});
assert.equal(kfind.quality,'verified');
assert.equal(kfind.provenance.provider,'MFDS K-FIND');
assert.equal(kfind.provenance.dataset,'KDDB');
assert.equal(kfind.provenance.recordId,'KTEST001');
assert.equal(kfind.basisG,100);
assert.equal(kfind.nutrients.kcal,130);
assert.equal(kfind.nutrients.carbs,28.7);
assert.equal(Foundation.assess(kfind).errors.length,0);

const kfindIncomplete=Adapters.adaptKfind({...kfindFixture,PROTEIN_G:''});
assert.equal(kfindIncomplete.quality,'unknown');
assert.ok(Foundation.assess(kfindIncomplete).warnings.some(x=>x.code==='UNKNOWN_QUALITY'));

assert.equal(Import.DATA_GO_KR_FOOD_ENDPOINT,'https://api.data.go.kr/openapi/tn_pubr_public_nutri_food_info_api');
const csvRows=Import.parseCsv('식품코드,식품명,데이터구분명,영양성분함량기준량,에너지(kcal),단백질(g),지방(g),탄수화물(g),출처명,데이터생성일자
D001,"김밥, 소고기",음식,100g,160,6.39,3.85,25.01,식품의약품안전처,2026-04-29');
assert.equal(csvRows.length,1);assert.equal(csvRows[0]['식품명'],'김밥, 소고기');
const csvFood=Adapters.adaptDataGoKrStandard(csvRows[0]);assert.equal(csvFood.quality,'verified');assert.equal(csvFood.provenance.recordId,'D001');

const dataGoKrFixture={foodCd:'P116-705070200-1080',foodNm:'대추 쌀과자',dataCd:'P',typeNm:'가공식품',enerc:'382',nutConSrtrQua:'100g',prot:'8.50',fatce:'2.00',chocdf:'82.00',sugar:'0.20',nat:'18',fasat:'0.40',fatrn:'0.00',srcNm:'식품의약품안전처',crtYmd:'2025-01-22',foodLv3Nm:'과자류',restNm:'테스트업체'};
const dataGoKr=Adapters.adaptDataGoKrStandard(dataGoKrFixture,{retrievedAt:'2026-09-15'});
assert.equal(dataGoKr.quality,'verified');
assert.equal(dataGoKr.provenance.provider,'DATA.GO.KR');
assert.equal(dataGoKr.provenance.dataset,'PROCESSED');
assert.equal(dataGoKr.provenance.recordId,'P116-705070200-1080');
assert.equal(dataGoKr.basisG,100);
assert.equal(dataGoKr.nutrients.kcal,382);
assert.equal(dataGoKr.nutrients.protein,8.5);
assert.equal(dataGoKr.category,'과자류');
assert.equal(dataGoKr.brand,'테스트업체');
assert.equal(dataGoKr.provenance.sourceDate,'2025-01-22');
assert.equal(Foundation.assess(dataGoKr).errors.length,0);

const volumeBasis=Adapters.adaptDataGoKrStandard({...dataGoKrFixture,foodCd:'P-VOLUME',foodNm:'간장 테스트',nutConSrtrQua:'100ml'});
assert.equal(volumeBasis.quality,'unknown','volume basis must not be silently treated as gram basis');

const usdaFixture={
  fdcId:999001,dataType:'Foundation',description:'Chicken breast, cooked, roasted',foodCategory:'Poultry Products',publicationDate:'2026-04-01',
  foodNutrients:[
    {nutrient:{id:1008,number:'208',name:'Energy',unitName:'kcal'},amount:165},
    {nutrient:{id:1003,number:'203',name:'Protein',unitName:'g'},amount:31.0},
    {nutrient:{id:1005,number:'205',name:'Carbohydrate, by difference',unitName:'g'},amount:0},
    {nutrient:{id:1004,number:'204',name:'Total lipid (fat)',unitName:'g'},amount:3.6},
    {nutrient:{id:1093,number:'307',name:'Sodium, Na',unitName:'mg'},amount:74}
  ]
};
const usda=Adapters.adaptUsda(usdaFixture,{retrievedAt:'2026-09-15'});
assert.equal(usda.quality,'verified');
assert.equal(usda.provenance.provider,'USDA FoodData Central');
assert.equal(usda.provenance.dataset,'Foundation');
assert.equal(usda.provenance.recordId,'999001');
assert.equal(usda.basisG,100);
assert.equal(usda.nutrients.protein,31);
assert.equal(Foundation.assess(usda).errors.length,0);
const brandedUsda=Adapters.adaptUsda({...usdaFixture,fdcId:999003,dataType:'Branded',description:'Caffe Americano, Grande',brandOwner:'Starbucks Coffee Company'});
assert.equal(brandedUsda.brand,'Starbucks Coffee Company');assert.equal(brandedUsda.productName,'Caffe Americano, Grande');assert.equal(brandedUsda.provenance.dataset,'Branded');

const kj=Adapters.adaptUsda({...usdaFixture,fdcId:999002,foodNutrients:[
  {nutrient:{id:1008,name:'Energy',unitName:'kJ'},amount:418.4},
  {nutrient:{id:1003,name:'Protein',unitName:'g'},amount:10},
  {nutrient:{id:1005,name:'Carbohydrate',unitName:'g'},amount:10},
  {nutrient:{id:1004,name:'Total lipid (fat)',unitName:'g'},amount:2}
]});
assert.equal(Math.round(kj.nutrients.kcal),100);

const existing=[
  {food_id:'F0001',name:'흰쌀밥',aliases:['밥','쌀밥'],basis_g:100,kcal:313,protein:5.3,carbs:68.7,fat:0.6,nutrition_status:'approximate'},
  {food_id:'F1000',name:'닭가슴살',aliases:['chicken breast'],basis_g:100,kcal:165,protein:31,carbs:0,fat:3.6,nutrition_status:'approximate'}
];
const proposal=Adapters.exactMatchProposal(existing,[kfind,Adapters.adaptUsda(usdaFixture,{name:'닭가슴살'})]);
assert.equal(proposal.summary.proposals,2);
assert.equal(proposal.review.length,0);
assert.equal(proposal.proposals[0].action,'replace-nutrition-after-review');
assert.deepEqual(new Set(proposal.proposals.map(x=>x.targetFoodId)),new Set(['F0001','F1000']));

const ambiguousExisting=[...existing,{food_id:'F2000',name:'밥',basis_g:100,kcal:100,protein:2,carbs:20,fat:0.2,nutrition_status:'estimated'}];
const ambiguousOfficial=Adapters.adaptKfind(kfindFixture,{aliases:['밥']});
const ambiguous=Adapters.exactMatchProposal(ambiguousExisting,[ambiguousOfficial]);
assert.equal(ambiguous.proposals.length,0);
assert.equal(ambiguous.review[0].reason,'AMBIGUOUS_EXACT_MATCH');

const riceStandard=Adapters.adaptDataGoKrStandard({foodCd:'RICE-1',foodNm:'흰쌀밥',typeNm:'음식',enerc:'130',nutConSrtrQua:'100g',prot:'2.4',fatce:'0.3',chocdf:'28.7',srcNm:'식품의약품안전처'});
const plan=Adapters.corpusUpgradePlan(existing,[riceStandard,Adapters.adaptUsda(usdaFixture,{name:'닭가슴살'})]);
assert.equal(plan.summary.targets,2);
assert.equal(plan.summary.safeProposals,2);
assert.equal(plan.summary.before.approximate,2);
assert.equal(plan.summary.projectedAfterReview.verified,2);
assert.equal(plan.summary.projectedAfterReview.approximate,0);

const riceDuplicate=Adapters.adaptDataGoKrStandard({foodCd:'RICE-2',foodNm:'흰쌀밥',typeNm:'음식',enerc:'131',nutConSrtrQua:'100g',prot:'2.5',fatce:'0.3',chocdf:'28.8',srcNm:'식품의약품안전처'});
const multiOfficial=Adapters.corpusUpgradePlan(existing,[riceStandard,riceDuplicate]);
assert.equal(multiOfficial.summary.safeProposals,0);
assert.equal(multiOfficial.review[0].reason,'MULTIPLE_OFFICIAL_CANDIDATES');

assert.deepEqual(Adapters.unwrapRows({response:{body:{items:{item:[kfindFixture]}}}},'kfind'),[kfindFixture]);
assert.deepEqual(Adapters.unwrapRows({response:{body:{items:[dataGoKrFixture]}}},'data-go-kr-standard'),[dataGoKrFixture]);
assert.deepEqual(Adapters.unwrapRows({foods:[usdaFixture]},'usda-fdc'),[usdaFixture]);

console.log('food-source-adapters-v2.test: ok');
