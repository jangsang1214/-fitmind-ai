'use strict';
const assert=require('node:assert/strict');
const Food=require('../02_core/food-intelligence-v2.js');
const foods=require('../04_data/knowledge/food-db.json');

const exact=Food.resolve(foods,'현미밥',{mode:'manual'});
assert.equal(exact.status,'matched');
assert.equal(exact.canonical.name,'현미밥');

const spaced=Food.resolve(foods,'현미 밥',{mode:'manual'});
assert.equal(spaced.status,'matched');
assert.equal(spaced.canonical.name,'현미밥');

const synthetic=[
 {food_id:'chicken',name:'닭가슴살',name_en:'Chicken Breast',aliases:['chicken breast','닭 가슴살'],basis_g:100,kcal:165,protein:31,carbs:0,fat:3.6,nutrition_status:'verified',provenance:{provider:'TEST',dataset:'OFFICIAL',recordId:'1'}},
 {food_id:'yogurt-a',name:'그릭요거트',name_en:'Greek Yogurt',aliases:['greek yogurt'],basis_g:100,kcal:97,protein:9,carbs:4,fat:5,nutrition_status:'verified',provenance:{provider:'TEST',dataset:'OFFICIAL',recordId:'2'}},
 {food_id:'yogurt-b',name:'플레인요거트',name_en:'Plain Yogurt',aliases:['plain yogurt'],basis_g:100,kcal:70,protein:5,carbs:8,fat:2,nutrition_status:'verified',provenance:{provider:'TEST',dataset:'OFFICIAL',recordId:'3'}}
];
const english=Food.resolve(synthetic,'chicken breast',{mode:'manual'});
assert.equal(english.status,'matched');assert.equal(english.canonical.foodId,'chicken');
const typo=Food.resolve(synthetic,'greek yogrt',{mode:'manual'});
assert.equal(typo.status,'matched');assert.equal(typo.canonical.foodId,'yogurt-a');
const broad=Food.resolve(synthetic,'yogurt',{mode:'manual'});
assert.notEqual(broad.status,'matched','broad fuzzy query must not jump to a specific yogurt without enough identity evidence');
const lowVision=Food.resolveVisionRow(synthetic,{name:'닭가슴살',confidence:.2});
assert.equal(lowVision.status,'unmatched');assert.equal(lowVision.reason,'VISION_CONFIDENCE_TOO_LOW');
const vision=Food.resolveVisionRow(synthetic,{name:'닭 가슴살',aliases:['chicken breast'],confidence:.92});
assert.equal(vision.status,'matched');assert.equal(vision.canonical.foodId,'chicken');
const item=Food.toMealItem(synthetic[0],150);
assert.equal(item.nutritionStatus,'verified');assert.equal(Math.round(item.protein*10)/10,46.5);assert.equal(item.nutritionSource.recordId,'1');
console.log('food-intelligence-v2: PASS');
