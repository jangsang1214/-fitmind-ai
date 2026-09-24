'use strict';
const assert=require('node:assert/strict');
const Food=require('../02_core/food-data-foundation-v2.js');

{
  const food=Food.canonicalize({food_id:'F1',name:'현미밥',basis_g:100,kcal:157,protein:3.8,carbs:34.3,fat:.5,nutrition_status:'approximate',aliases:['현미']});
  assert.equal(food.version,'garang-food-data-foundation-v2');
  assert.equal(food.foodId,'F1');
  assert.equal(food.quality,'approximate');
  assert.equal(food.nutrients.carbs,34.3);
  assert.deepEqual(food.aliases,['현미']);
  const branded=Food.canonicalize({food_id:'B1',name:'프로틴 음료',brand:'GARANG Foods',product_name:'Protein Drink',basis_g:100,kcal:80,protein:15,carbs:4,fat:1,nutrition_status:'verified',provenance:{provider:'TEST',dataset:'BRANDED',recordId:'B1'}});\n  assert.equal(branded.brand,'GARANG Foods');assert.equal(branded.productName,'Protein Drink');\n  console.log('PASS legacy Food DB row canonicalizes without changing quality');
}

{
  assert.throws(()=>Food.ingestExternal({id:'x',name:'test',basisG:100,nutrients:{kcal:100,protein:1,carbs:10,fat:5},quality:'verified'}),error=>error?.code==='TRACEABLE_PROVENANCE_REQUIRED');
  const verified=Food.ingestExternal({id:'x',name:'test',basisG:100,nutrients:{kcal:100,protein:1,carbs:10,fat:5},quality:'verified',provenance:{provider:'USDA FoodData Central',dataset:'Foundation',recordId:'123'}});
  assert.equal(Food.assess(verified).errors.length,0);
  console.log('PASS verified nutrition requires traceable provider, dataset and record ID');
}

{
  const result=Food.assess({food_id:'x',name:'synthetic',basis_g:100,kcal:100,protein:20,carbs:80,fat:20,nutrition_status:'estimated',source:'FitMind AI 임의 추정값'});
  assert.equal(result.food.quality,'estimated');
  assert.ok(result.warnings.some(x=>x.code==='MACRO_KCAL_LARGE_MISMATCH'));
  assert.equal(result.errors.some(x=>x.code==='VERIFIED_SOURCE_CONFLICT'),false);
  console.log('PASS estimated values stay estimated and suspicious macro math is visible');
}

{
  const report=Food.audit([
    {food_id:'dup',name:'A',basis_g:100,kcal:100,protein:1,carbs:20,fat:1,nutrition_status:'approximate'},
    {food_id:'dup',name:'B',basis_g:100,kcal:100,protein:1,carbs:20,fat:1,nutrition_status:'approximate'}
  ]);
  assert.equal(report.pass,false);
  assert.ok(report.errors.some(x=>x.code==='DUPLICATE_FOOD_ID'));
  console.log('PASS duplicate stable IDs fail the data contract');
}

console.log('food-data-foundation-v2: PASS');
