'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),app=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');

assert.match(app,/foodId:f\.food_id\|\|f\.id\|\|null/,'canonical Food DB records must retain foodId');
assert.match(app,/nutritionStatus:String\(f\.nutrition_status\|\|'unknown'\)\.toLowerCase\(\)/,'canonical Food DB records must retain quality state');
assert.match(app,/nutritionSource=normalizedNutritionSource/,'canonical Food DB records must retain source lineage');
assert.match(app,/nutritionSource:\{source:'user_entered'\},userOverride:true/,'manual nutrition must be explicitly marked as user-entered');
assert.match(app,/function normalizeMealItem/,'meal normalization must preserve lineage fields');

const ctx=vm.createContext({console,Date,Math,URL,AbortController,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(path.join(root,'02_core/data-schema.js'),'utf8'),ctx);
const state=ctx.GarangSchema.toTransport({
  profile:{name:'A'},
  meals:[{id:'m1',date:'2026-09-22',name:'현미밥',items:[{
    id:'i1',foodId:'F0002',name:'현미밥',grams:100,kcal:172,protein:3.1,carbs:38.9,fat:.47,
    nutritionStatus:'verified',
    nutritionSource:{provider:'MFDS K-FIND',dataset:'KDDB_HOME_ANALYZED',recordId:'D101-050000000-0001',matchRule:'name_exact'},
    userOverride:false
  }]}],
  memory:{entries:[]}
});
const item=state.meals[0].items[0];
assert.equal(item.foodId,'F0002');
assert.equal(item.nutritionStatus,'verified');
assert.equal(item.nutritionSource.provider,'MFDS K-FIND');
assert.equal(item.nutritionSource.recordId,'D101-050000000-0001');
assert.equal(item.userOverride,false);
console.log('nutrition-record-lineage-v1: PASS');
