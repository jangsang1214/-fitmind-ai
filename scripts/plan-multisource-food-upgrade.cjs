'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Foundation=require('../02_core/food-data-foundation-v2.js');
const Matcher=require('../02_core/food-corpus-multisource-match-v3.js');

function parseArgs(argv){
  const out={official:[]};
  for(let i=0;i<argv.length;i++){
    const token=argv[i];if(!token.startsWith('--'))continue;
    const key=token.slice(2),next=argv[i+1];
    const value=next&&!next.startsWith('--')?(i++,next):true;
    if(key==='official')out.official.push(value);else out[key]=value;
  }
  return out;
}
function readJson(file){return JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));}
function writeJson(file,value){const absolute=path.resolve(file);fs.mkdirSync(path.dirname(absolute),{recursive:true});fs.writeFileSync(absolute,JSON.stringify(value,null,2)+'\n');}
function compactPayloadRecords(payload){
  const source=payload?.source||{};
  if(!Array.isArray(payload?.records)||!source?.provider||!source?.dataset)return null;
  return payload.records.map(row=>Foundation.ingestExternal({
    foodId:`official:${source.dataset}:${row.recordId}`,
    name:row.name,
    category:row.category||null,
    aliases:row.aliases||[],
    serving:`${source.basisG||100}g`,
    basisG:Number(source.basisG)||100,
    nutrients:row.nutrients||{},
    quality:'verified',
    provenance:{provider:source.provider,dataset:source.dataset,recordId:row.recordId,url:source.url||null,sourceDate:source.sourceDate||null,retrievedAt:source.retrievedAt||null,label:source.label||null}
  }));
}
function recordsOf(payload){
  if(Array.isArray(payload))return payload;
  if(Array.isArray(payload?.records)){
    const compact=compactPayloadRecords(payload);
    return compact||payload.records;
  }
  throw new Error('OFFICIAL_JSON_RECORDS_REQUIRED');
}
function main(){
  const args=parseArgs(process.argv.slice(2));
  const existingFile=args.existing||'04_data/knowledge/food-db.json';
  if(!args.official.length)throw new Error('Use one or more --official <normalized-or-compact-json> inputs');
  const existing=readJson(existingFile),official=[];
  for(const file of args.official)official.push(...recordsOf(readJson(file)));
  const preserve=String(args.preserve||'라면').split(',').map(x=>x.trim()).filter(Boolean);
  const plan=Matcher.buildPlan(existing,official,{preserveNames:preserve});
  const report={version:'garang-food-multisource-upgrade-plan-v3',inputs:{existing:existingFile,official:args.official,preserve},summary:plan.summary,apply:plan.apply,review:plan.review,preserveExisting:plan.preserveExisting,alreadyVerified:plan.alreadyVerified};
  if(args.output)writeJson(args.output,report);else process.stdout.write(JSON.stringify(report,null,2)+'\n');
  if(args.write){
    const merged=Matcher.applyPlan(existing,plan);
    if(!Matcher.verifyIdentity(existing,merged))throw new Error('CANONICAL_IDENTITY_CHANGED');
    writeJson(args.write,merged);
  }
}

try{main();}catch(error){console.error(`[food-multisource-plan] ${error.code||error.message}`);process.exitCode=1;}
