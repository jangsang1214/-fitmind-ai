'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Adapters=require('../02_core/food-source-adapters-v2.js');
const Foundation=require('../02_core/food-data-foundation-v2.js');

function argsOf(argv){const out={};for(let i=0;i<argv.length;i++){const token=argv[i];if(!token.startsWith('--'))continue;const key=token.slice(2);const next=argv[i+1];if(next&&!next.startsWith('--')){out[key]=next;i++;}else out[key]=true;}return out;}
function readJson(file){return JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));}
function writeJson(file,value){fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true});fs.writeFileSync(path.resolve(file),JSON.stringify(value,null,2)+'\n');}
async function fetchUsda(query,key,pageSize=25){
  if(!key)throw Object.assign(new Error('USDA_FDC_API_KEY_REQUIRED'),{code:'USDA_FDC_API_KEY_REQUIRED'});
  const url=new URL('https://api.nal.usda.gov/fdc/v1/foods/search');url.searchParams.set('api_key',key);
  const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,pageSize:Number(pageSize)||25,dataType:['Foundation','Survey (FNDDS)','Branded']})});
  if(!response.ok)throw Object.assign(new Error(`USDA_FDC_HTTP_${response.status}`),{code:`USDA_FDC_HTTP_${response.status}`});
  return response.json();
}
async function fetchDataGoKr(key,{pageSize=1000,maxPages=1000}={}){
  if(!key)throw Object.assign(new Error('DATA_GO_KR_SERVICE_KEY_REQUIRED'),{code:'DATA_GO_KR_SERVICE_KEY_REQUIRED'});
  const rows=[];let pageNo=1,totalCount=null;
  while(pageNo<=Number(maxPages||1000)){
    const url=new URL('https://api.data.go.kr/openapi/tn_pubr_public_nutri_info_api');
    url.searchParams.set('serviceKey',key);url.searchParams.set('pageNo',String(pageNo));url.searchParams.set('numOfRows',String(Number(pageSize)||1000));url.searchParams.set('type','json');
    const response=await fetch(url);if(!response.ok)throw Object.assign(new Error(`DATA_GO_KR_HTTP_${response.status}`),{code:`DATA_GO_KR_HTTP_${response.status}`});
    const payload=await response.json(),pageRows=Adapters.unwrapRows(payload,'data-go-kr-standard');
    const header=payload?.response?.header;if(header&&String(header.resultCode??'00')!=='00')throw Object.assign(new Error(`DATA_GO_KR_${header.resultCode||'ERROR'}`),{code:`DATA_GO_KR_${header.resultCode||'ERROR'}`});
    if(totalCount===null){const n=Number(payload?.response?.body?.totalCount??payload?.totalCount);totalCount=Number.isFinite(n)?n:null;}
    rows.push(...pageRows);
    if(!pageRows.length||pageRows.length<(Number(pageSize)||1000)||(totalCount!==null&&rows.length>=totalCount))break;
    pageNo++;
  }
  return {response:{body:{items:rows,totalCount:totalCount??rows.length}},retrieval:{pages:pageNo,rows:rows.length,totalCount}};
}
function unwrapImportedRecords(payload){return Array.isArray(payload?.records)?payload.records:Array.isArray(payload)?payload:null;}
async function main(){
  const args=argsOf(process.argv.slice(2)),source=String(args.source||'').trim();
  if(!['kfind','data-go-kr-standard','usda-fdc'].includes(source))throw new Error('Use --source kfind, --source data-go-kr-standard, or --source usda-fdc');
  let payload;
  if(args.input)payload=readJson(args.input);
  else if(source==='usda-fdc'&&args.query)payload=await fetchUsda(String(args.query),process.env.USDA_FDC_API_KEY,args['page-size']);
  else if(source==='data-go-kr-standard')payload=await fetchDataGoKr(process.env.DATA_GO_KR_SERVICE_KEY,{pageSize:args['page-size'],maxPages:args['max-pages']});
  else throw new Error('K-FIND live calls require an approved portal key; export the JSON response and use --input.');

  const retrievedAt=new Date().toISOString(),alreadyNormalized=unwrapImportedRecords(payload),records=alreadyNormalized||Adapters.adaptMany(source,payload,{dataset:args.dataset,retrievedAt});
  const audit=Foundation.audit(records),result={version:'garang-official-food-import-v2',source,retrievedAt,count:records.length,audit:{pass:audit.pass,statusCounts:audit.statusCounts,errors:audit.errors,warnings:audit.warnings},records};
  if(args.output)writeJson(args.output,result);else if(!args.existing)process.stdout.write(JSON.stringify(result,null,2)+'\n');

  if(args.existing){
    const existing=readJson(args.existing),plan=Adapters.corpusUpgradePlan(existing,records),planOut={...plan,source,retrievedAt};
    if(args.plan)writeJson(args.plan,planOut);else process.stdout.write(JSON.stringify(planOut,null,2)+'\n');
  }
  if(!audit.pass)process.exitCode=2;
}
main().catch(error=>{console.error(`[official-food-import] ${error.code||error.message}`);process.exitCode=1;});
