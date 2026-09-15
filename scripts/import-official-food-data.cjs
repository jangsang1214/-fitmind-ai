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
async function main(){
  const args=argsOf(process.argv.slice(2)),source=String(args.source||'').trim();
  if(!['kfind','usda-fdc'].includes(source))throw new Error('Use --source kfind or --source usda-fdc');
  let payload;
  if(args.input)payload=readJson(args.input);
  else if(source==='usda-fdc'&&args.query)payload=await fetchUsda(String(args.query),process.env.USDA_FDC_API_KEY,args['page-size']);
  else throw new Error(source==='kfind'?'K-FIND live calls require an approved portal key; export the JSON response and use --input.':'Provide --input or --query with USDA_FDC_API_KEY.');

  const retrievedAt=new Date().toISOString(),records=Adapters.adaptMany(source,payload,{dataset:args.dataset,retrievedAt});
  const audit=Foundation.audit(records),result={version:'garang-official-food-import-v2',source,retrievedAt,count:records.length,audit:{pass:audit.pass,statusCounts:audit.statusCounts,errors:audit.errors,warnings:audit.warnings},records};
  if(args.output)writeJson(args.output,result);else process.stdout.write(JSON.stringify(result,null,2)+'\n');

  if(args.existing){
    const existing=readJson(args.existing),proposal=Adapters.exactMatchProposal(existing,records),proposalOut={...proposal,source,retrievedAt};
    if(args.proposal)writeJson(args.proposal,proposalOut);else process.stderr.write(JSON.stringify(proposalOut.summary)+'\n');
  }
  if(!audit.pass)process.exitCode=2;
}
main().catch(error=>{console.error(`[official-food-import] ${error.code||error.message}`);process.exitCode=1;});
