(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangFoodDataFoundation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const VERSION='garang-food-data-foundation-v2';
const QUALITY=Object.freeze(['verified','approximate','estimated','unknown']);
const CORE_NUTRIENTS=Object.freeze(['kcal','protein','carbs','fat']);
const finite=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const clean=value=>String(value??'').trim();
const list=value=>Array.isArray(value)?value:[];
const uniq=value=>[...new Set(list(value).map(clean).filter(Boolean))];
const normalizedName=value=>clean(value).toLowerCase().replace(/[\s·_\-()]/g,'');

function normalizeQuality(value){const raw=clean(value).toLowerCase();return QUALITY.includes(raw)?raw:'unknown';}
function normalizeSource(input={}){
  if(typeof input==='string')return {provider:null,dataset:null,recordId:null,url:null,sourceDate:null,retrievedAt:null,label:clean(input)||null};
  return {
    provider:clean(input.provider)||null,
    dataset:clean(input.dataset)||null,
    recordId:clean(input.recordId||input.record_id)||null,
    url:clean(input.url)||null,
    sourceDate:clean(input.sourceDate||input.source_date)||null,
    retrievedAt:clean(input.retrievedAt||input.retrieved_at)||null,
    label:clean(input.label)||null
  };
}
function nutritionFromLegacy(input={}){
  return {
    kcal:finite(input.kcal),
    protein:finite(input.protein??input.protein_g),
    carbs:finite(input.carbs??input.carbohydrate??input.carbohydrate_g),
    fat:finite(input.fat??input.fat_g),
    sugar:finite(input.sugar??input.sugar_g),
    fiber:finite(input.fiber??input.fiber_g),
    sodium:finite(input.sodium??input.sodium_mg),
    cholesterol:finite(input.cholesterol??input.cholesterol_mg),
    saturatedFat:finite(input.saturated_fat??input.saturatedFat),
    transFat:finite(input.trans_fat??input.transFat)
  };
}
function canonicalize(input={},options={}){
  const nutrients=nutritionFromLegacy(input.nutrients&&typeof input.nutrients==='object'?input.nutrients:input);
  const source=normalizeSource(options.source||input.provenance||input.source);
  return {
    version:VERSION,
    foodId:clean(input.food_id||input.foodId||input.id),
    name:clean(input.name||input.food_name||input.description),
    nameEn:clean(input.name_en||input.nameEn)||null,
    category:clean(input.category)||null,
    aliases:uniq(input.aliases),
    serving:clean(input.serving||input.serving_description)||null,
    basisG:finite(input.basis_g??input.nutrition_basis_g??input.basisG)??100,
    nutrients,
    quality:normalizeQuality(options.quality||input.nutrition_status||input.quality),
    provenance:source
  };
}
function issue(code,severity,detail=null){return {code,severity,detail};}
function assess(input={}){
  const food=input.version===VERSION?input:canonicalize(input),issues=[];
  if(!food.foodId)issues.push(issue('MISSING_FOOD_ID','error'));
  if(!food.name)issues.push(issue('MISSING_NAME','error'));
  if(!(food.basisG>0))issues.push(issue('INVALID_BASIS_G','error',food.basisG));
  for(const key of CORE_NUTRIENTS){const value=food.nutrients[key];if(value===null)issues.push(issue(`MISSING_${key.toUpperCase()}`,'warning'));else if(value<0)issues.push(issue(`NEGATIVE_${key.toUpperCase()}`,'error',value));}
  for(const [key,value] of Object.entries(food.nutrients))if(value!==null&&value<0)issues.push(issue(`NEGATIVE_${key.toUpperCase()}`,'error',value));
  const factor=food.basisG>0?100/food.basisG:1,p=food.nutrients.protein,c=food.nutrients.carbs,f=food.nutrients.fat,k=food.nutrients.kcal;
  if(p!==null&&p*factor>105)issues.push(issue('PROTEIN_OVER_105G_PER_100G','error',p*factor));
  if(c!==null&&c*factor>105)issues.push(issue('CARBS_OVER_105G_PER_100G','error',c*factor));
  if(f!==null&&f*factor>105)issues.push(issue('FAT_OVER_105G_PER_100G','error',f*factor));
  if(k!==null&&k*factor>950)issues.push(issue('KCAL_IMPLAUSIBLE_PER_100G','error',k*factor));
  if([p,c,f,k].every(v=>v!==null)){
    const macroKcal=(p*4+c*4+f*9),delta=Math.abs(k-macroKcal),denom=Math.max(80,k,macroKcal);
    if(delta/denom>.45)issues.push(issue('MACRO_KCAL_LARGE_MISMATCH','warning',{kcal:k,macroKcal:Math.round(macroKcal*10)/10}));
  }
  const traceable=!!(food.provenance.provider&&food.provenance.dataset&&food.provenance.recordId);
  if(food.quality==='verified'&&!traceable)issues.push(issue('VERIFIED_WITHOUT_TRACEABLE_PROVENANCE','error'));
  const sourceText=[food.provenance.label,food.provenance.provider,food.provenance.dataset].filter(Boolean).join(' ').toLowerCase();
  if(food.quality==='verified'&&/(임의|추정|estimated|approx)/i.test(sourceText))issues.push(issue('VERIFIED_SOURCE_CONFLICT','error'));
  if(food.quality==='unknown')issues.push(issue('UNKNOWN_QUALITY','warning'));
  return {food,issues,errors:issues.filter(x=>x.severity==='error'),warnings:issues.filter(x=>x.severity==='warning')};
}
function audit(records=[]){
  const seenIds=new Map(),seenNames=new Map(),aliasOwners=new Map(),items=[];
  const statusCounts=Object.fromEntries(QUALITY.map(key=>[key,0]));
  for(const raw of list(records)){
    const result=assess(raw),food=result.food;items.push(result);statusCounts[food.quality]=(statusCounts[food.quality]||0)+1;
    if(food.foodId){if(seenIds.has(food.foodId))result.errors.push(issue('DUPLICATE_FOOD_ID','error',food.foodId));else seenIds.set(food.foodId,food.name);}
    const nameKey=normalizedName(food.name);if(nameKey){const bucket=seenNames.get(nameKey)||[];bucket.push(food.foodId);seenNames.set(nameKey,bucket);}
    for(const alias of [food.name,...food.aliases]){const key=normalizedName(alias);if(!key)continue;const owners=aliasOwners.get(key)||new Set();owners.add(food.foodId);aliasOwners.set(key,owners);}
  }
  const duplicateNames=[...seenNames.entries()].filter(([,ids])=>ids.filter(Boolean).length>1).map(([key,ids])=>({key,ids}));
  const aliasCollisions=[...aliasOwners.entries()].filter(([,owners])=>owners.size>1).map(([key,owners])=>({key,ids:[...owners]}));
  const errors=items.flatMap((item,index)=>item.errors.map(x=>({...x,index,foodId:item.food.foodId,name:item.food.name}))),warnings=items.flatMap((item,index)=>item.warnings.map(x=>({...x,index,foodId:item.food.foodId,name:item.food.name})));
  return {version:VERSION,total:items.length,statusCounts,errors,warnings,duplicateNames,aliasCollisions,pass:errors.length===0};
}
function ingestExternal(input={}){
  const provenance=normalizeSource(input.provenance||{}),quality=normalizeQuality(input.quality);
  if(quality==='verified'&&!(provenance.provider&&provenance.dataset&&provenance.recordId))throw Object.assign(new Error('TRACEABLE_PROVENANCE_REQUIRED'),{code:'TRACEABLE_PROVENANCE_REQUIRED'});
  return canonicalize({foodId:input.foodId||input.id,name:input.name,nameEn:input.nameEn,category:input.category,aliases:input.aliases,serving:input.serving,basisG:input.basisG,nutrients:input.nutrients,quality},{source:provenance,quality});
}
return Object.freeze({VERSION,QUALITY,CORE_NUTRIENTS,normalizeQuality,normalizeSource,nutritionFromLegacy,canonicalize,assess,audit,ingestExternal,normalizedName});
});
