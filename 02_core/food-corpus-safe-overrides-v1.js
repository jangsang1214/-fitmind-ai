(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./food-data-foundation-v2.js'):root?.GarangFoodDataFoundation);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangFoodCorpusSafeOverrides=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Foundation){
'use strict';

if(!Foundation)throw new Error('FOOD_DATA_FOUNDATION_REQUIRED');

const VERSION='garang-food-corpus-safe-overrides-v1';
const REQUIRED_PROVIDER='MFDS K-FIND';
const REQUIRED_DATASET='KDDB_HOME_ANALYZED';
const DENYLIST=new Set(['라면'].map(Foundation.normalizedName));
const PACKAGED_SERVING_RE=/(봉|팩|캔|병)/;
const NUTRIENT_KEYS=Object.freeze(['kcal','protein','carbs','fat','sugar','fiber','sodium','cholesterol','saturatedFat','transFat']);

const list=value=>Array.isArray(value)?value:[];
const clean=value=>String(value??'').trim();
const finite=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};

function materializeOfficial(payload={}){
  const source=payload?.source||{};
  const records=list(payload?.records);
  return records.map(row=>Foundation.ingestExternal({
    foodId:`kfind:${clean(source.dataset)||REQUIRED_DATASET}:${clean(row.recordId)}`,
    name:clean(row.name),
    category:clean(row.category)||null,
    aliases:[],
    serving:`${finite(source.basisG)||100}g`,
    basisG:finite(source.basisG)||100,
    nutrients:Object.fromEntries(NUTRIENT_KEYS.map(key=>[key,finite(row?.nutrients?.[key])])),
    quality:'verified',
    provenance:{
      provider:clean(source.provider)||REQUIRED_PROVIDER,
      dataset:clean(source.dataset)||REQUIRED_DATASET,
      recordId:clean(row.recordId),
      url:clean(source.url)||null,
      sourceDate:clean(source.sourceDate)||null,
      retrievedAt:clean(source.retrievedAt)||null,
      label:clean(source.label)||null
    }
  }));
}

function officialEligible(row){
  const a=Foundation.assess(row);
  if(a.errors.length||a.food.quality!=='verified')return {ok:false,reason:'OFFICIAL_RECORD_NOT_VERIFIED',assessment:a};
  if(a.food.provenance.provider!==REQUIRED_PROVIDER||a.food.provenance.dataset!==REQUIRED_DATASET)return {ok:false,reason:'OFFICIAL_SOURCE_NOT_ALLOWED',assessment:a};
  if(a.food.basisG!==100)return {ok:false,reason:'OFFICIAL_BASIS_NOT_100G',assessment:a};
  for(const key of NUTRIENT_KEYS)if(finite(a.food.nutrients[key])===null)return {ok:false,reason:`OFFICIAL_MISSING_${key.toUpperCase()}`,assessment:a};
  return {ok:true,assessment:a};
}

function buildPlan(existing=[],officialPayload={}){
  const targets=list(existing).map(raw=>({raw,canonical:Foundation.canonicalize(raw)}));
  const officialRows=materializeOfficial(officialPayload);
  const byName=new Map();
  const rejectedOfficial=[];
  for(const row of officialRows){
    const eligibility=officialEligible(row);
    if(!eligibility.ok){rejectedOfficial.push({reason:eligibility.reason,official:eligibility.assessment.food});continue;}
    const key=Foundation.normalizedName(eligibility.assessment.food.name);
    const bucket=byName.get(key)||[];
    bucket.push(eligibility.assessment.food);
    byName.set(key,bucket);
  }

  const proposals=[],manualReview=[],unmatchedTargets=[],alreadyVerified=[];
  for(const entry of targets){
    const raw=entry.raw,target=entry.canonical,key=Foundation.normalizedName(target.name);
    if(target.quality==='verified'){alreadyVerified.push({targetFoodId:target.foodId,targetName:target.name});continue;}
    if(DENYLIST.has(key)){manualReview.push({reason:'SEMANTIC_DENYLIST',targetFoodId:target.foodId,targetName:target.name});continue;}
    const hits=byName.get(key)||[];
    if(!hits.length){unmatchedTargets.push({targetFoodId:target.foodId,targetName:target.name,currentQuality:target.quality});continue;}
    if(hits.length>1){manualReview.push({reason:'MULTIPLE_OFFICIAL_CANDIDATES',targetFoodId:target.foodId,targetName:target.name,candidateIds:hits.map(x=>x.foodId)});continue;}
    if(PACKAGED_SERVING_RE.test(clean(raw?.serving))){manualReview.push({reason:'PACKAGED_SERVING_NEEDS_REVIEW',targetFoodId:target.foodId,targetName:target.name,serving:raw.serving,candidateId:hits[0].foodId});continue;}
    proposals.push({targetFoodId:target.foodId,targetName:target.name,currentQuality:target.quality,official:hits[0],match:'exact-primary-name',action:'replace-nutrition'});
  }

  const before={verified:0,approximate:0,estimated:0,unknown:0};
  for(const entry of targets)before[entry.canonical.quality]=(before[entry.canonical.quality]||0)+1;
  const projectedAfter={...before};
  for(const p of proposals){projectedAfter[p.currentQuality]=Math.max(0,(projectedAfter[p.currentQuality]||0)-1);projectedAfter.verified=(projectedAfter.verified||0)+1;}
  return {version:VERSION,summary:{targets:targets.length,officialRecords:officialRows.length,safeProposals:proposals.length,manualReview:manualReview.length,unmatchedTargets:unmatchedTargets.length,alreadyVerified:alreadyVerified.length,rejectedOfficial:rejectedOfficial.length,before,projectedAfter},proposals,manualReview,unmatchedTargets,alreadyVerified,rejectedOfficial};
}

function applyPlan(existing=[],plan={}){
  const proposals=new Map(list(plan?.proposals).map(p=>[p.targetFoodId,p]));
  return list(existing).map(raw=>{
    const id=clean(raw?.food_id||raw?.foodId||raw?.id),proposal=proposals.get(id);
    if(!proposal)return {...raw};
    const official=proposal.official,n=official.nutrients,p=official.provenance;
    return {...raw,basis_g:100,nutrition_basis_g:100,kcal:n.kcal,protein:n.protein,carbs:n.carbs,fat:n.fat,sugar:n.sugar,fiber:n.fiber,sodium:n.sodium,cholesterol:n.cholesterol,saturated_fat:n.saturatedFat,trans_fat:n.transFat,source:`${p.provider} / ${p.dataset} / ${p.recordId}`,source_date:p.sourceDate||null,nutrition_status:'verified',provenance:{...p}};
  });
}

function merge(existing=[],officialPayload={}){const plan=buildPlan(existing,officialPayload);return {version:VERSION,foods:applyPlan(existing,plan),plan};}

return Object.freeze({VERSION,REQUIRED_PROVIDER,REQUIRED_DATASET,NUTRIENT_KEYS,materializeOfficial,officialEligible,buildPlan,applyPlan,merge});
});
