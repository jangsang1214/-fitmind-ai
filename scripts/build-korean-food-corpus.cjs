'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const Adapters=require('../02_core/food-source-adapters-v2.js');
const Foundation=require('../02_core/food-data-foundation-v2.js');
const Korean=require('../02_core/korean-food-normalization-v1.js');
const Importer=require('./import-official-food-data.cjs');

const VERSION='garang-korean-food-corpus-v1';
const clean=v=>String(v??'').trim();
const finite=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(String(v).replace(/,/g,'')))?Number(String(v).replace(/,/g,'')):null;
function sha256Text(text){return crypto.createHash('sha256').update(text).digest('hex');}
function writeJson(file,value){const p=path.resolve(file);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(value,null,2)+'\n');}
const CHOSEONG=['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
function bucketOf(value){const s=Korean.compact(value);if(!s)return '*';const ch=s[0],code=ch.charCodeAt(0);if(code>=0xAC00&&code<=0xD7A3)return CHOSEONG[Math.floor((code-0xAC00)/588)]||'*';if(/[a-z]/i.test(ch))return ch.toUpperCase();if(/[0-9]/.test(ch))return '#';return '*';}
function rowBuckets(row){const values=[row.product_name,row.brand,row.category,row.name];return [...new Set(values.map(bucketOf).filter(Boolean))];}
function safeBucketName(bucket){return bucket==='*'?'other':bucket==='#'?'digit':/^[A-Z]$/.test(bucket)?'latin-'+bucket.toLowerCase():'ko-'+Buffer.from(bucket).toString('hex');}
function writeShards(outDir,records){const groups=new Map();for(const row of records){for(const bucket of rowBuckets(row)){const list=groups.get(bucket)||[];list.push(row);groups.set(bucket,list);}}const shards={};for(const [bucket,rows] of groups){const file=safeBucketName(bucket)+'.json';writeJson(path.join(outDir,file),{version:VERSION,bucket,count:rows.length,records:rows});shards[bucket]={file,count:rows.length};}return shards;}
function rawRows(payload){return Adapters.unwrapRows(payload,'data-go-kr-standard');}
function legacy(raw,canonical){
 const n=Korean.normalize(raw),basis=Number(canonical.basisG)||100,brand=n.brand||null;
 return {
  food_id:canonical.foodId,
  name:n.displayName||canonical.name,
  name_en:canonical.nameEn||null,
  product_name:n.productName||canonical.name,
  brand,manufacturer:clean(raw.mkrNm||raw['제조사명'])||null,company:clean(raw.companyNm||raw['업체명'])||null,
  category:canonical.category||n.categoryPrefix||clean(raw.typeNm||raw['데이터구분명'])||'한국 식품',
  serving:canonical.serving||clean(raw.foodSize||raw['식품중량'])||clean(raw.nutConSrtrQua||raw['영양성분함량기준량'])||null,
  basis_g:basis,
  kcal:canonical.nutrients.kcal,protein:canonical.nutrients.protein,carbs:canonical.nutrients.carbs,fat:canonical.nutrients.fat,
  sugar:canonical.nutrients.sugar,fiber:canonical.nutrients.fiber,sodium:canonical.nutrients.sodium,cholesterol:canonical.nutrients.cholesterol,
  saturated_fat:canonical.nutrients.saturatedFat,trans_fat:canonical.nutrients.transFat,
  aliases:n.aliases,
  nutrition_status:'verified',
  source:'대한민국 공공데이터포털 전국통합식품영양성분정보표준데이터',
  nutrition_basis_g:basis,
  provenance:canonical.provenance
 };
}
function rank(row){
 const t=clean(row?.provenance?.dataset).toUpperCase();
 if(t==='PROCESSED')return 0;if(t==='FOOD')return 1;if(t==='MATERIAL')return 2;return 3;
}
function dedupe(rows){
 const byId=new Map(),byKey=new Map(),dropped=[];
 for(const row of rows.sort((a,b)=>rank(a)-rank(b)||String(a.food_id).localeCompare(String(b.food_id)))){
  if(byId.has(row.food_id)){dropped.push({reason:'DUPLICATE_ID',foodId:row.food_id});continue;}
  const key=Korean.compact((row.brand||'')+' '+(row.product_name||row.name));
  if(key&&byKey.has(key)){dropped.push({reason:'DUPLICATE_BRAND_PRODUCT',foodId:row.food_id,kept:byKey.get(key).food_id});continue;}
  byId.set(row.food_id,row);if(key)byKey.set(key,row);
 }
 return {records:[...byId.values()],dropped};
}
async function main(){
 const args=Importer.argsOf(process.argv.slice(2)),serviceKey=process.env.DATA_GO_KR_SERVICE_KEY||args['service-key'];
 if(!args['output-dir']||!args.manifest||!args.meta)throw new Error('Use --output-dir <dir> --manifest <json> --meta <json> [--page-size 1000 --max-pages 1000]');
 let payload;
 if(args.input)payload=Importer.readInput(args.input);
 else payload=await Importer.fetchDataGoKr(serviceKey,{pageSize:Number(args['page-size'])||1000,maxPages:Number(args['max-pages'])||1000});
 const rows=rawRows(payload),retrievedAt=new Date().toISOString(),accepted=[],rejected=[];
 for(const raw of rows){
  try{
   const canonical=Adapters.adaptDataGoKrStandard(raw,{retrievedAt});
   const assessment=Foundation.assess(canonical);
   if(assessment.errors.length||assessment.food.quality!=='verified'){rejected.push({foodCd:raw?.foodCd||raw?.['식품코드']||null,name:raw?.foodNm||raw?.['식품명']||null,reason:assessment.errors[0]?.code||'MISSING_CORE_NUTRIENTS'});continue;}
   accepted.push(legacy(raw,assessment.food));
  }catch(error){rejected.push({foodCd:raw?.foodCd||null,name:raw?.foodNm||null,reason:error?.code||error?.message||'ADAPT_FAILED'});}
 }
 const merged=dedupe(accepted);merged.records.sort((a,b)=>String(a.name).localeCompare(String(b.name),'ko'));
 const audit=Foundation.audit(merged.records);
 if(!audit.pass)throw Object.assign(new Error('KOREAN_CORPUS_AUDIT_FAILED'),{details:audit.errors.slice(0,20)});
 const sourceCounts={};for(const row of merged.records){const k=clean(row.provenance?.dataset)||'UNKNOWN';sourceCounts[k]=(sourceCounts[k]||0)+1;}
 const brandRows=merged.records.filter(x=>x.brand).length,aliasRows=merged.records.filter(x=>Array.isArray(x.aliases)&&x.aliases.length).length;
 const shards=writeShards(args['output-dir'],merged.records);
 const corpus={version:VERSION,generatedAt:retrievedAt,purpose:'Korean official supplemental lookup corpus; curated GARANG canonical remains primary',precedence:['GARANG canonical Korean DB','Korean official supplemental','USDA supplemental','source-backed web lookup'],count:merged.records.length,shards};
 const meta={version:VERSION,generatedAt:retrievedAt,rawRows:rows.length,acceptedRows:accepted.length,rejectedRows:rejected.length,count:merged.records.length,sourceCounts,brandRows,brandRate:merged.records.length?brandRows/merged.records.length:0,aliasRows,aliasRate:merged.records.length?aliasRows/merged.records.length:0,dedupeDropped:merged.dropped.length,audit:{pass:audit.pass,statusCounts:audit.statusCounts,coverage:audit.coverage,errors:audit.errors.length,warnings:audit.warnings.length,duplicateNames:audit.duplicateNames.length,aliasCollisions:audit.aliasCollisions.length},request:{endpoint:Importer.DATA_GO_KR_FOOD_ENDPOINT,pageSize:Number(args['page-size'])||1000,maxPages:Number(args['max-pages'])||1000},inputFingerprint:sha256Text(JSON.stringify({rows:rows.length,first:rows[0]?.foodCd||rows[0]?.['식품코드']||null,last:rows.at(-1)?.foodCd||rows.at(-1)?.['식품코드']||null})),guardrails:{canonicalPrimary:true,verifiedOnly:true,traceableProvenanceRequired:true,noAutomaticCanonicalOverwrite:true,deterministicAliasesOnly:true}};
 writeJson(args.manifest,corpus);writeJson(args.meta,{...meta,shards});console.log(JSON.stringify({...meta,shards},null,2));
}
if(require.main===module)main().catch(error=>{console.error('[build-korean-food-corpus]',error?.code||error?.message||error);if(error?.details)console.error(JSON.stringify(error.details,null,2));process.exitCode=1;});
module.exports={VERSION,legacy,dedupe,rawRows,bucketOf,rowBuckets,safeBucketName,writeShards};
