'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Adapters=require('../02_core/food-source-adapters-v2.js');
const Foundation=require('../02_core/food-data-foundation-v2.js');

const VERSION='garang-usda-supplemental-corpus-v1';
const RELEASES=Object.freeze({
 foundation:{dataset:'Foundation',release:'2026-04-30',url:'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2026-04-30.zip'},
 fndds:{dataset:'FNDDS',release:'2024-10-31',url:'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_json_2024-10-31.zip'}
});

function argsOf(argv){const out={};for(let i=0;i<argv.length;i++){const token=argv[i];if(!token.startsWith('--'))continue;const key=token.slice(2),next=argv[i+1];if(next&&!next.startsWith('--')){out[key]=next;i++;}else out[key]=true;}return out;}
function readJson(file){return JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));}
function sha256(file){return crypto.createHash('sha256').update(fs.readFileSync(path.resolve(file))).digest('hex');}
function writeJson(file,value){const p=path.resolve(file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n');}
function normalized(value){return Foundation.normalizedName(value);}
function rowsOf(payload){
 if(Array.isArray(payload))return payload;
 for(const key of ['FoundationFoods','SurveyFoods','foods','Foods','items','data'])if(Array.isArray(payload?.[key]))return payload[key];
 for(const value of Object.values(payload||{}))if(Array.isArray(value)&&value.some(row=>row&&typeof row==='object'&&(row.fdcId||row.description)))return value;
 return [];
}
function legacyRow(food){
 return {food_id:food.foodId,name:food.name,name_en:food.nameEn||food.name,category:food.category||'USDA',brand:food.brand||null,product_name:food.productName||food.name,serving:food.serving||'100g',basis_g:Number(food.basisG)||100,kcal:food.nutrients.kcal,protein:food.nutrients.protein,carbs:food.nutrients.carbs,fat:food.nutrients.fat,sugar:food.nutrients.sugar,fiber:food.nutrients.fiber,sodium:food.nutrients.sodium,cholesterol:food.nutrients.cholesterol,saturated_fat:food.nutrients.saturatedFat,trans_fat:food.nutrients.transFat,aliases:Array.isArray(food.aliases)?food.aliases:[],nutrition_status:'verified',source:'USDA FoodData Central',nutrition_basis_g:Number(food.basisG)||100,provenance:food.provenance};
}
function ingest(file,kind,retrievedAt){
 const payload=readJson(file),rows=rowsOf(payload),accepted=[],rejected=[];
 for(const raw of rows){
  try{
   const food=Adapters.adaptUsda(raw,{dataset:RELEASES[kind].dataset,retrievedAt});
   const assessment=Foundation.assess(food);
   if(assessment.errors.length||assessment.food.quality!=='verified'){rejected.push({fdcId:raw?.fdcId||null,reason:assessment.errors[0]?.code||'NOT_VERIFIED'});continue;}
   if(!assessment.food.name||assessment.food.name.length>180){rejected.push({fdcId:raw?.fdcId||null,reason:'INVALID_NAME'});continue;}
   accepted.push(assessment.food);
  }catch(error){rejected.push({fdcId:raw?.fdcId||null,reason:error?.code||error?.message||'ADAPT_FAILED'});}
 }
 return {kind,file,rawRows:rows.length,accepted,rejected,sha256:sha256(file)};
}
function dedupe(inputs){
 const candidates=inputs.flatMap((source,sourcePriority)=>source.accepted.map(food=>({food,sourcePriority})));
 candidates.sort((a,b)=>a.sourcePriority-b.sourcePriority||String(a.food.foodId).localeCompare(String(b.food.foodId)));
 const byName=new Map(),seenIds=new Set(),duplicateIds=[],duplicateNames=[];
 for(const item of candidates){
  const id=String(item.food.foodId||''),key=normalized(item.food.name);if(!id||!key)continue;
  if(seenIds.has(id)){duplicateIds.push(id);continue;}seenIds.add(id);
  if(byName.has(key)){duplicateNames.push({name:item.food.name,kept:byName.get(key).foodId,dropped:id});continue;}
  byName.set(key,item.food);
 }
 return {records:[...byName.values()].map(legacyRow),duplicateIds,duplicateNames};
}
function main(){
 const args=argsOf(process.argv.slice(2));
 if(!args.foundation||!args.fndds||!args.output||!args.meta)throw new Error('Use --foundation <json> --fndds <json> --output <json> --meta <json>');
 const retrievedAt=new Date().toISOString();
 const foundation=ingest(args.foundation,'foundation',retrievedAt),fndds=ingest(args.fndds,'fndds',retrievedAt),merged=dedupe([foundation,fndds]);
 merged.records.sort((a,b)=>String(a.name).localeCompare(String(b.name),'en'));
 const audit=Foundation.audit(merged.records);
 if(!audit.pass)throw Object.assign(new Error('SUPPLEMENTAL_CORPUS_AUDIT_FAILED'),{details:audit.errors.slice(0,20)});
 if(merged.records.length<4000)throw new Error('SUPPLEMENTAL_CORPUS_TOO_SMALL:'+merged.records.length);
 const corpus={version:VERSION,generatedAt:retrievedAt,license:'USDA FoodData Central public domain / CC0 1.0',purpose:'supplemental lookup corpus; canonical Korean GARANG food-db remains primary',precedence:['GARANG canonical Korean DB','USDA Foundation','USDA FNDDS'],sourceReleases:[{...RELEASES.foundation,inputSha256:foundation.sha256,rawRows:foundation.rawRows,acceptedRows:foundation.accepted.length,rejectedRows:foundation.rejected.length},{...RELEASES.fndds,inputSha256:fndds.sha256,rawRows:fndds.rawRows,acceptedRows:fndds.accepted.length,rejectedRows:fndds.rejected.length}],count:merged.records.length,records:merged.records};
 const meta={version:VERSION,generatedAt:retrievedAt,count:merged.records.length,sourceCounts:{Foundation:foundation.accepted.length,FNDDS:fndds.accepted.length},rejectedCounts:{Foundation:foundation.rejected.length,FNDDS:fndds.rejected.length},dedupe:{duplicateIds:merged.duplicateIds.length,duplicateNames:merged.duplicateNames.length},audit:{pass:audit.pass,statusCounts:audit.statusCounts,coverage:audit.coverage,errors:audit.errors.length,warnings:audit.warnings.length,duplicateNames:audit.duplicateNames.length,aliasCollisions:audit.aliasCollisions.length},sourceFiles:{foundation:{sha256:foundation.sha256},fndds:{sha256:fndds.sha256}},guardrails:{canonicalPrimary:true,verifiedOnly:true,traceableProvenanceRequired:true,noAutomaticCanonicalOverwrite:true,noFabricatedAliases:true}};
 writeJson(args.output,corpus);writeJson(args.meta,meta);console.log(JSON.stringify(meta,null,2));
}
if(require.main===module){try{main();}catch(error){console.error('[build-public-food-corpus]',error?.message||error);if(error?.details)console.error(JSON.stringify(error.details,null,2));process.exitCode=1;}}
module.exports={VERSION,RELEASES,argsOf,rowsOf,legacyRow,ingest,dedupe};
