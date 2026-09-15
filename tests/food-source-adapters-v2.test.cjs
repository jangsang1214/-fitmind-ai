'use strict';

const assert=require('node:assert/strict');
const Adapters=require('../02_core/food-source-adapters-v2.js');
const Foundation=require('../02_core/food-data-foundation-v2.js');

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

assert.deepEqual(Adapters.unwrapRows({response:{body:{items:{item:[kfindFixture]}}}},'kfind'),[kfindFixture]);
assert.deepEqual(Adapters.unwrapRows({foods:[usdaFixture]},'usda-fdc'),[usdaFixture]);

console.log('food-source-adapters-v2.test: ok');
