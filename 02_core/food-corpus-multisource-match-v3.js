(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./food-data-foundation-v2.js'):root?.GarangFoodDataFoundation);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangFoodCorpusMultisourceMatchV3=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Foundation){
'use strict';

if(!Foundation)throw new Error('FOOD_DATA_FOUNDATION_REQUIRED');

const VERSION='garang-food-corpus-multisource-match-v3';
const DEFAULT_PRESERVE_NAMES=Object.freeze(['라면']);
const NUTRIENT_KEYS=Object.freeze(['kcal','protein','carbs','fat','sugar','fiber','sodium','cholesterol','saturatedFat','transFat']);
const DATASET_PRIORITY=Object.freeze({
  KDDB_HOME_ANALYZED:400,
  KDDB:350,
  KFCT:300,
  KCTMP:250,
  PFDB:200,
  FOOD:180,
  MATERIAL:160,
  PROCESSED:140
});
const COOKING_TOKENS=Object.freeze(['구이','구운','볶음','볶은','튀김','튀긴','삶은','삶음','찜','찐','조림','국','탕','찌개','전골','죽','밥','면','회','생','훈제','말린','건조']);

const list=value=>Array.isArray(value)?value:[];
const clean=value=>String(value??'').trim();
const finite=value=>{if(value===null||value===undefined||value==='')return null;const n=Number(value);return Number.isFinite(n)?n:null;};
const normalized=value=>Foundation.normalizedName(value);

function sourcePriority(food){return DATASET_PRIORITY[clean(food?.provenance?.dataset)]||0;}
function cookingSignature(name){const text=clean(name);return COOKING_TOKENS.filter(token=>text.includes(token)).sort();}
function signaturesCompatible(target,official){
  const a=cookingSignature(target?.name),b=cookingSignature(official?.name);
  if(!a.length||!b.length)return true;
  return a.some(token=>b.includes(token));
}
function categoryCompatible(target,official){
  const a=normalized(target?.category),b=normalized(official?.category);
  if(!a||!b)return true;
  if(a===b||a.includes(b)||b.includes(a))return true;
  const groups=[
    ['밥','곡류','죽'],['면','만두'],['국','탕','찌개','전골'],['육류','고기','가금'],['어패','수산','생선','어류'],
    ['채소','나물'],['과일'],['유제품','우유','치즈'],['빵','과자','디저트'],['음료'],['난류','달걀','계란']
  ];
  return groups.some(group=>group.some(x=>a.includes(x))&&group.some(x=>b.includes(x)));
}
function isTraceableVerified(row){
  const a=Foundation.assess(row),food=a.food;
  return !a.errors.length&&food.quality==='verified'&&food.basisG>0&&
    !!(food.provenance.provider&&food.provenance.dataset&&food.provenance.recordId)&&
    NUTRIENT_KEYS.every(key=>finite(food.nutrients[key])!==null);
}
function officialIdentity(row){const f=Foundation.canonicalize(row);return `${f.provenance.provider||''}/${f.provenance.dataset||''}/${f.provenance.recordId||f.foodId||''}`;}
function targetKeys(target){return [target.name,...list(target.aliases)].map(normalized).filter(Boolean);}
function officialKeys(official){return [official.name,...list(official.aliases)].map(normalized).filter(Boolean);}
function overlapKind(target,official){
  const primary=normalized(target.name),op=normalized(official.name);
  if(primary&&primary===op)return 'exact-primary';
  const targetAliases=new Set(list(target.aliases).map(normalized).filter(Boolean));
  if(op&&targetAliases.has(op))return 'official-name-to-target-alias';
  const officialAliases=new Set(list(official.aliases).map(normalized).filter(Boolean));
  if(primary&&officialAliases.has(primary))return 'target-name-to-official-alias';
  if(targetKeys(target).some(key=>officialKeys(official).includes(key)))return 'alias-overlap';
  return null;
}
function matchScore(target,official,kind){
  const base={"exact-primary":100,"official-name-to-target-alias":90,"target-name-to-official-alias":88,"alias-overlap":80}[kind]||0;
  return base+(categoryCompatible(target,official)?10:-40)+(signaturesCompatible(target,official)?8:-35)+Math.min(20,Math.floor(sourcePriority(official)/25));
}
function buildPlan(existing=[],officialRecords=[],options={}){
  const preserve=new Set([...(options.preserveNames||DEFAULT_PRESERVE_NAMES)].map(normalized));
  const targets=list(existing).map(raw=>({raw,food:Foundation.canonicalize(raw)}));
  const official=list(officialRecords).map(Foundation.canonicalize).filter(isTraceableVerified);
  const index=new Map();
  for(const row of official){
    for(const key of officialKeys(row)){
      const bucket=index.get(key)||[];
      if(!bucket.some(x=>officialIdentity(x)===officialIdentity(row)))bucket.push(row);
      index.set(key,bucket);
    }
  }
  const apply=[],review=[],preserveExisting=[],alreadyVerified=[];
  for(const entry of targets){
    const target=entry.food,key=normalized(target.name);
    if(target.quality==='verified'){alreadyVerified.push({targetFoodId:target.foodId,targetName:target.name});continue;}
    if(preserve.has(key)){
      preserveExisting.push({reason:'BROAD_NAME_KEEP_CURRENT',targetFoodId:target.foodId,targetName:target.name,currentQuality:target.quality});
      continue;
    }
    const candidates=[];
    for(const targetKey of targetKeys(target))for(const officialRow of index.get(targetKey)||[]){
      const kind=overlapKind(target,officialRow);if(!kind)continue;
      const id=officialIdentity(officialRow);if(candidates.some(x=>x.id===id))continue;
      candidates.push({id,kind,score:matchScore(target,officialRow,kind),categoryCompatible:categoryCompatible(target,officialRow),cookingCompatible:signaturesCompatible(target,officialRow),official:officialRow});
    }
    candidates.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    if(!candidates.length){preserveExisting.push({reason:'NO_TRACEABLE_MATCH',targetFoodId:target.foodId,targetName:target.name,currentQuality:target.quality});continue;}
    const compatible=candidates.filter(x=>x.categoryCompatible&&x.cookingCompatible);
    if(!compatible.length){review.push({reason:'SEMANTIC_MISMATCH',targetFoodId:target.foodId,targetName:target.name,candidates:candidates.slice(0,5)});continue;}
    const top=compatible[0],ties=compatible.filter(x=>x.score===top.score);
    if(ties.length!==1){review.push({reason:'MULTIPLE_EQUIVALENT_CANDIDATES',targetFoodId:target.foodId,targetName:target.name,candidates:ties.slice(0,10)});continue;}
    const officialDataset=clean(top.official.provenance.dataset);
    if((officialDataset==='PFDB'||officialDataset==='PROCESSED')&&top.kind!=='exact-primary'){
      review.push({reason:'PROCESSED_FOOD_IDENTITY_NEEDS_REVIEW',targetFoodId:target.foodId,targetName:target.name,candidate:top});continue;
    }
    apply.push({targetFoodId:target.foodId,targetName:target.name,currentQuality:target.quality,match:top.kind,score:top.score,official:top.official,action:'replace-nutrition'});
  }
  const before={verified:0,approximate:0,estimated:0,unknown:0};
  for(const {food} of targets)before[food.quality]=(before[food.quality]||0)+1;
  const projectedAfter={...before};
  for(const p of apply){projectedAfter[p.currentQuality]=Math.max(0,(projectedAfter[p.currentQuality]||0)-1);projectedAfter.verified++;}
  return {version:VERSION,summary:{targets:targets.length,traceableOfficialRecords:official.length,apply:apply.length,review:review.length,preserveExisting:preserveExisting.length,alreadyVerified:alreadyVerified.length,before,projectedAfter},apply,review,preserveExisting,alreadyVerified};
}
function nutrientsPer100(official){
  const basis=finite(official?.basisG);if(!(basis>0))throw new Error('OFFICIAL_BASIS_REQUIRED');
  const factor=100/basis;
  return Object.fromEntries(NUTRIENT_KEYS.map(key=>[key,finite(official?.nutrients?.[key])*factor]));
}
function applyPlan(existing=[],plan={}){
  const byId=new Map(list(plan.apply).map(row=>[row.targetFoodId,row]));
  return list(existing).map(raw=>{
    const target=Foundation.canonicalize(raw),proposal=byId.get(target.foodId);
    if(!proposal)return {...raw};
    const official=proposal.official,n=nutrientsPer100(official),p=official.provenance;
    return {...raw,basis_g:100,nutrition_basis_g:100,kcal:n.kcal,protein:n.protein,carbs:n.carbs,fat:n.fat,sugar:n.sugar,fiber:n.fiber,sodium:n.sodium,cholesterol:n.cholesterol,saturated_fat:n.saturatedFat,trans_fat:n.transFat,source:`${p.provider} / ${p.dataset} / ${p.recordId}`,source_date:p.sourceDate||null,nutrition_status:'verified',provenance:{...p}};
  });
}
function corpusIdentity(records=[]){return list(records).map(row=>({food_id:row.food_id,name:row.name,aliases:row.aliases,category:row.category,serving:row.serving}));}
function verifyIdentity(before=[],after=[]){return JSON.stringify(corpusIdentity(before))===JSON.stringify(corpusIdentity(after));}

return Object.freeze({VERSION,DEFAULT_PRESERVE_NAMES,NUTRIENT_KEYS,DATASET_PRIORITY,cookingSignature,categoryCompatible,signaturesCompatible,isTraceableVerified,nutrientsPer100,buildPlan,applyPlan,verifyIdentity});
});
