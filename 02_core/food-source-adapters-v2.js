(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./food-data-foundation-v2.js'):root?.GarangFoodDataFoundation);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.GarangFoodSourceAdapters=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Foundation){
'use strict';

if(!Foundation)throw new Error('FOOD_DATA_FOUNDATION_REQUIRED');
const VERSION='garang-food-source-adapters-v2';
const clean=v=>String(v??'').trim();
const list=v=>Array.isArray(v)?v:[];
const finite=v=>{if(v===null||v===undefined||v==='')return null;const s=typeof v==='string'?v.replace(/,/g,'').trim():v;const n=Number(s);return Number.isFinite(n)?n:null;};
const first=(row,keys)=>{for(const key of keys){const v=row?.[key];if(v!==undefined&&v!==null&&v!=='')return v;}return null;};
const dateText=v=>{const s=clean(v);return s||null;};
const unitText=v=>clean(v).toLowerCase().replace(/\s+/g,'');
function gramValue(value,unit){const n=finite(value);if(n===null)return null;const u=unitText(unit||'g');if(['g','gram','grams','그램'].includes(u))return n;if(['kg','kilogram','kilograms','킬로그램'].includes(u))return n*1000;if(['mg','milligram','milligrams'].includes(u))return n/1000;return null;}
function parseBasis(value){if(typeof value==='number')return value>0?value:null;const s=clean(value);if(!s)return null;const m=s.match(/([\d,.]+)\s*(kg|g|그램|mg|ml|밀리리터)/i);if(!m)return finite(s);const unit=String(m[2]).toLowerCase();if(['ml','밀리리터'].includes(unit))return null;return gramValue(m[1],m[2]);}
function hasCore(nutrients){return ['kcal','protein','carbs','fat'].every(k=>finite(nutrients?.[k])!==null);}
function safeFoodId(prefix,dataset,recordId){return [prefix,clean(dataset),clean(recordId)].filter(Boolean).join(':');}

const KFIND_FIELDS=Object.freeze({
  recordId:['FOOD_CD','foodCd','foodCode','food_code','식품코드'],
  name:['FOOD_NM_KR','foodNmKr','foodName','food_name','식품명'],
  nameEn:['FOOD_NM_EN','foodNmEn','foodNameEn','food_name_en','식품명영문'],
  category:['FOOD_CAT3_NM','foodCat3Nm','FOOD_CAT2_NM','foodCategory','category','식품분류'],
  dataset:['DB_GRP_CM','dbGrpCm','dataset','dataSourceCode','DB구분'],
  basis:['NUT_CON_SRTR_QUA','nutConSrtrQua','nutritionBasis','nutrition_basis','영양성분함량기준량'],
  serving:['SERVING_SIZE','servingSize','nutriServingSize','oneServing','1회섭취참고량'],
  sourceDate:['DATA_CRTR_YMD','dataCrtrYmd','DATA_GENERATION_DATE','dataGenerationDate','데이터기준일자','데이터생성일자'],
  manufacturer:['MKR_NM','mkrNm','manufacturer','manufacturerName','제조사명','업체명'],
  kcal:['ENERGY_KCAL','energyKcal','ENERC_KCAL','enercKcal','energy','에너지(kcal)','에너지'],
  protein:['PROTEIN_G','proteinG','PROCNT','procnt','protein','단백질(g)','단백질'],
  carbs:['CARBOHYDRATE_G','carbohydrateG','CHOCDF','chocdf','carbs','carbohydrate','탄수화물(g)','탄수화물'],
  fat:['FAT_G','fatG','FATCE','fatce','fat','지방(g)','지방'],
  sugar:['SUGAR_G','sugarG','SUGAR','sugar','당류(g)','당류'],
  fiber:['FIBER_G','fiberG','FIBTG','fibtg','fiber','식이섬유(g)','식이섬유'],
  sodium:['SODIUM_MG','sodiumMg','NA','sodium','나트륨(mg)','나트륨'],
  cholesterol:['CHOLESTEROL_MG','cholesterolMg','CHOLE','cholesterol','콜레스테롤(mg)','콜레스테롤'],
  saturatedFat:['SATURATED_FAT_G','saturatedFatG','FASAT','saturatedFat','포화지방산(g)','포화지방산'],
  transFat:['TRANS_FAT_G','transFatG','FATRN','transFat','트랜스지방산(g)','트랜스지방산']
});
function normalizeKfindDataset(raw,options={}){
  const supplied=clean(options.dataset||first(raw,KFIND_FIELDS.dataset));
  const map={음식:'KDDB',가공식품:'PFDB',원재료성식품:'KFCT',국가표준식품성분표:'KFCT',표준수산물성분표:'KCTMP'};
  return map[supplied]||supplied||null;
}
function adaptKfind(raw={},options={}){
  const recordId=clean(first(raw,KFIND_FIELDS.recordId));
  const dataset=normalizeKfindDataset(raw,options);
  const basisRaw=first(raw,KFIND_FIELDS.basis),basisG=parseBasis(basisRaw)||100;
  const nutrients={
    kcal:finite(first(raw,KFIND_FIELDS.kcal)),protein:finite(first(raw,KFIND_FIELDS.protein)),carbs:finite(first(raw,KFIND_FIELDS.carbs)),fat:finite(first(raw,KFIND_FIELDS.fat)),
    sugar:finite(first(raw,KFIND_FIELDS.sugar)),fiber:finite(first(raw,KFIND_FIELDS.fiber)),sodium:finite(first(raw,KFIND_FIELDS.sodium)),cholesterol:finite(first(raw,KFIND_FIELDS.cholesterol)),
    saturatedFat:finite(first(raw,KFIND_FIELDS.saturatedFat)),transFat:finite(first(raw,KFIND_FIELDS.transFat))
  };
  const traceable=!!(dataset&&recordId&&clean(first(raw,KFIND_FIELDS.name))&&basisG>0);
  const quality=traceable&&hasCore(nutrients)?'verified':'unknown';
  return Foundation.ingestExternal({
    foodId:clean(options.foodId)||safeFoodId('kfind',dataset,recordId),name:clean(first(raw,KFIND_FIELDS.name)),nameEn:clean(first(raw,KFIND_FIELDS.nameEn))||null,
    category:clean(first(raw,KFIND_FIELDS.category))||null,brand:clean(first(raw,KFIND_FIELDS.manufacturer))||null,productName:clean(first(raw,KFIND_FIELDS.name))||null,aliases:list(options.aliases),serving:clean(first(raw,KFIND_FIELDS.serving))||clean(basisRaw)||null,basisG,nutrients,quality,
    provenance:{provider:'MFDS K-FIND',dataset,recordId,url:'https://www.data.go.kr/data/15127578/openapi.do',sourceDate:dateText(first(raw,KFIND_FIELDS.sourceDate)),retrievedAt:dateText(options.retrievedAt),label:'Official food nutrition data'}
  });
}

const DATA_GO_KR_FIELDS=Object.freeze({
  recordId:['foodCd','식품코드'],name:['foodNm','식품명'],dataset:['typeNm','데이터구분명','dataCd','데이터구분코드'],basis:['nutConSrtrQua','영양성분함량기준량'],
  kcal:['enerc','에너지(kcal)'],protein:['prot','단백질(g)'],fat:['fatce','지방(g)'],carbs:['chocdf','탄수화물(g)'],sugar:['sugar','당류(g)'],fiber:['fibtg','식이섬유(g)'],
  sodium:['nat','나트륨(mg)'],cholesterol:['chole','콜레스테롤(mg)'],saturatedFat:['fasat','포화지방산(g)'],transFat:['fatrn','트랜스지방산(g)'],
  source:['srcNm','출처명'],sourceDate:['crtYmd','dataProdYmd','dataProdDt','데이터생성일자','crtrYmd','dataCrtrYmd','데이터기준일자'],manufacturer:['mkrNm','제조사명'],company:['restNm','companyNm','업체명']
});
function normalizeDataGoKrDataset(value){const raw=clean(value);const map={음식:'FOOD',가공식품:'PROCESSED',원재료성식품:'MATERIAL','원재료성 식품':'MATERIAL'};return map[raw]||raw||null;}
function adaptDataGoKrStandard(raw={},options={}){
  const recordId=clean(first(raw,DATA_GO_KR_FIELDS.recordId)),name=clean(first(raw,DATA_GO_KR_FIELDS.name));
  const dataset=normalizeDataGoKrDataset(options.dataset||first(raw,DATA_GO_KR_FIELDS.dataset));
  const basisRaw=first(raw,DATA_GO_KR_FIELDS.basis),basisG=parseBasis(basisRaw);
  const nutrients={kcal:finite(first(raw,DATA_GO_KR_FIELDS.kcal)),protein:finite(first(raw,DATA_GO_KR_FIELDS.protein)),carbs:finite(first(raw,DATA_GO_KR_FIELDS.carbs)),fat:finite(first(raw,DATA_GO_KR_FIELDS.fat)),sugar:finite(first(raw,DATA_GO_KR_FIELDS.sugar)),fiber:finite(first(raw,DATA_GO_KR_FIELDS.fiber)),sodium:finite(first(raw,DATA_GO_KR_FIELDS.sodium)),cholesterol:finite(first(raw,DATA_GO_KR_FIELDS.cholesterol)),saturatedFat:finite(first(raw,DATA_GO_KR_FIELDS.saturatedFat)),transFat:finite(first(raw,DATA_GO_KR_FIELDS.transFat))};
  const source=clean(first(raw,DATA_GO_KR_FIELDS.source))||'공공데이터포털 전국통합식품영양성분정보표준데이터';
  const traceable=!!(recordId&&dataset&&name&&basisG&&basisG>0);
  const quality=traceable&&hasCore(nutrients)?'verified':'unknown';
  return Foundation.ingestExternal({
    foodId:clean(options.foodId)||safeFoodId('data-go-kr',dataset,recordId),name,category:clean(first(raw,['foodLv3Nm','foodCat1Nm','식품대분류명','식품대분류','category']))||null,brand:clean(first(raw,DATA_GO_KR_FIELDS.manufacturer))||clean(first(raw,DATA_GO_KR_FIELDS.company))||null,productName:name,aliases:list(options.aliases),serving:clean(basisRaw)||null,basisG:basisG||100,nutrients,quality,
    provenance:{provider:'DATA.GO.KR',dataset,recordId,url:'https://www.data.go.kr/data/15100064/standard.do',sourceDate:dateText(first(raw,DATA_GO_KR_FIELDS.sourceDate)),retrievedAt:dateText(options.retrievedAt),label:source}
  });
}

const USDA_NUTRIENTS=Object.freeze({
  kcal:{ids:new Set([1008]),numbers:new Set(['208']),names:/energy/i},protein:{ids:new Set([1003]),numbers:new Set(['203']),names:/protein/i},carbs:{ids:new Set([1005]),numbers:new Set(['205']),names:/carbohydrate.*difference|carbohydrate/i},fat:{ids:new Set([1004]),numbers:new Set(['204']),names:/total lipid|total fat/i},sugar:{ids:new Set([2000,1063]),numbers:new Set(['269']),names:/sugars,? total|total sugars/i},fiber:{ids:new Set([1079]),numbers:new Set(['291']),names:/fiber,? total dietary|dietary fiber/i},sodium:{ids:new Set([1093]),numbers:new Set(['307']),names:/sodium/i},cholesterol:{ids:new Set([1253]),numbers:new Set(['601']),names:/cholesterol/i},saturatedFat:{ids:new Set([1258]),numbers:new Set(['606']),names:/fatty acids,? total saturated|saturated fat/i},transFat:{ids:new Set([1257]),numbers:new Set(['605']),names:/fatty acids,? total trans|trans fat/i}
});
function normalizeUsdaDataset(value){const raw=clean(value);const map={'Survey (FNDDS)':'FNDDS','Survey':'FNDDS','Foundation':'Foundation','Branded':'Branded','SR Legacy':'SR Legacy'};return map[raw]||raw||null;}
function nutrientMeta(item={}){const n=item.nutrient||item;return {id:Number(n?.id??item?.nutrientId),number:clean(n?.number??item?.nutrientNumber),name:clean(n?.name??item?.nutrientName),unit:clean(n?.unitName??item?.unitName??item?.unit)};}
function findUsdaNutrient(rows,key){const spec=USDA_NUTRIENTS[key];for(const row of list(rows)){const meta=nutrientMeta(row);if(spec.ids.has(meta.id)||spec.numbers.has(meta.number)||spec.names.test(meta.name)){const value=finite(row?.amount??row?.value);if(value===null)continue;return {value,unit:meta.unit};}}return {value:null,unit:null};}
function normalizeEnergy(value,unit){const n=finite(value);if(n===null)return null;return /kj/i.test(clean(unit))?n/4.184:n;}
function adaptUsda(raw={},options={}){
  const recordId=clean(raw.fdcId??raw.fdc_id),dataset=normalizeUsdaDataset(raw.dataType||raw.data_type||options.dataset),rows=raw.foodNutrients||raw.food_nutrients||[],energy=findUsdaNutrient(rows,'kcal'),nutrients={kcal:normalizeEnergy(energy.value,energy.unit)};
  for(const key of ['protein','carbs','fat','sugar','fiber','sodium','cholesterol','saturatedFat','transFat'])nutrients[key]=findUsdaNutrient(rows,key).value;
  const servingG=gramValue(raw.servingSize,raw.servingSizeUnit),serving=clean(raw.householdServingFullText)||(servingG?`${servingG}g`:null),traceable=!!(recordId&&dataset&&clean(raw.description)),quality=traceable&&hasCore(nutrients)?'verified':'unknown';
  return Foundation.ingestExternal({foodId:clean(options.foodId)||safeFoodId('usda-fdc',dataset,recordId),name:clean(options.name||raw.description),nameEn:clean(raw.description)||null,category:clean(raw.foodCategory||raw.brandedFoodCategory||raw.food_category)||null,brand:clean(raw.brandOwner||raw.brandName||raw.brand_owner||raw.brand_name)||null,productName:clean(raw.description)||null,aliases:list(options.aliases),serving,basisG:100,nutrients,quality,provenance:{provider:'USDA FoodData Central',dataset,recordId,url:recordId?`https://fdc.nal.usda.gov/fdc-app.html#/food-details/${recordId}`:'https://fdc.nal.usda.gov/',sourceDate:dateText(raw.publicationDate||raw.availableDate||raw.modifiedDate),retrievedAt:dateText(options.retrievedAt),label:'USDA FoodData Central'}});
}
function unwrapRows(payload,source){
  if(Array.isArray(payload))return payload;
  if(source==='usda-fdc')return list(payload?.foods?.length?payload.foods:payload?.foods||payload?.items);
  const candidates=[payload?.body?.items,payload?.response?.body?.items?.item,payload?.response?.body?.items,payload?.items?.item,payload?.items,payload?.data,payload?.results];
  for(const value of candidates)if(Array.isArray(value))return value;
  return [];
}
function adaptMany(source,payload,options={}){
  const rows=unwrapRows(payload,source),adapter=source==='kfind'?adaptKfind:source==='data-go-kr-standard'?adaptDataGoKrStandard:source==='usda-fdc'?adaptUsda:null;
  if(!adapter)throw Object.assign(new Error('UNSUPPORTED_FOOD_SOURCE'),{code:'UNSUPPORTED_FOOD_SOURCE'});
  return rows.map((row,index)=>adapter(row,{...options,index}));
}
function exactMatchProposal(existing=[],official=[]){
  const byKey=new Map();
  for(const row of list(existing)){const canonical=Foundation.canonicalize(row),keys=[canonical.name,...canonical.aliases].map(Foundation.normalizedName).filter(Boolean);for(const key of keys){const bucket=byKey.get(key)||[];bucket.push(canonical);byKey.set(key,bucket);}}
  const proposals=[],review=[],unmatched=[];
  for(const row of list(official)){
    const assessment=Foundation.assess(row);if(assessment.errors.length||assessment.food.quality!=='verified'){review.push({reason:'OFFICIAL_RECORD_NOT_VERIFIED',official:assessment.food});continue;}
    const keys=[assessment.food.name,...assessment.food.aliases].map(Foundation.normalizedName).filter(Boolean),candidates=new Map();
    for(const key of keys)for(const hit of byKey.get(key)||[])candidates.set(hit.foodId,hit);
    if(candidates.size===1){const target=[...candidates.values()][0];proposals.push({targetFoodId:target.foodId,targetName:target.name,official:assessment.food,match:'exact-name-or-alias',action:'replace-nutrition-after-review'});}
    else if(candidates.size>1)review.push({reason:'AMBIGUOUS_EXACT_MATCH',candidateIds:[...candidates.keys()],official:assessment.food});
    else unmatched.push({official:assessment.food});
  }
  return {version:VERSION,proposals,review,unmatched,summary:{official:list(official).length,proposals:proposals.length,review:review.length,unmatched:unmatched.length}};
}
function countQuality(rows){const out={verified:0,approximate:0,estimated:0,unknown:0};for(const row of list(rows)){const q=Foundation.canonicalize(row).quality||'unknown';if(out[q]===undefined)out.unknown++;else out[q]++;}return out;}
function corpusUpgradePlan(existing=[],official=[]){
  const targets=list(existing).map(Foundation.canonicalize),officialVerified=[];
  for(const row of list(official)){const a=Foundation.assess(row);if(!a.errors.length&&a.food.quality==='verified')officialVerified.push(a.food);}
  const officialByKey=new Map();for(const row of officialVerified){for(const key of [row.name,...row.aliases].map(Foundation.normalizedName).filter(Boolean)){const bucket=officialByKey.get(key)||[];bucket.push(row);officialByKey.set(key,bucket);}}
  const proposals=[],review=[],unmatchedTargets=[];
  for(const target of targets){const candidates=new Map();for(const key of [target.name,...target.aliases].map(Foundation.normalizedName).filter(Boolean)){for(const hit of officialByKey.get(key)||[])candidates.set(hit.foodId,hit);}
    if(candidates.size===1){const officialRow=[...candidates.values()][0];proposals.push({targetFoodId:target.foodId,targetName:target.name,currentQuality:target.quality,official:officialRow,match:'exact-name-or-alias',action:'replace-nutrition-after-review'});}
    else if(candidates.size>1)review.push({reason:'MULTIPLE_OFFICIAL_CANDIDATES',targetFoodId:target.foodId,targetName:target.name,candidateIds:[...candidates.keys()]});
    else unmatchedTargets.push({targetFoodId:target.foodId,targetName:target.name,currentQuality:target.quality});
  }
  const before=countQuality(targets),after={...before};for(const p of proposals){after[p.currentQuality]=Math.max(0,(after[p.currentQuality]||0)-1);after.verified=(after.verified||0)+1;}
  return {version:'garang-food-corpus-upgrade-plan-v2',summary:{targets:targets.length,officialRecords:list(official).length,officialVerified:officialVerified.length,safeProposals:proposals.length,manualReview:review.length,unmatchedTargets:unmatchedTargets.length,before,projectedAfterReview:after},proposals,review,unmatchedTargets};
}
return Object.freeze({VERSION,KFIND_FIELDS,DATA_GO_KR_FIELDS,USDA_NUTRIENTS,parseBasis,normalizeUsdaDataset,adaptKfind,adaptDataGoKrStandard,adaptUsda,adaptMany,unwrapRows,exactMatchProposal,countQuality,corpusUpgradePlan});
});
