'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Safe=require('../02_core/food-corpus-safe-overrides-v1.js');

function argsOf(argv){const out={};for(let i=0;i<argv.length;i++){const token=argv[i];if(!token.startsWith('--'))continue;const key=token.slice(2),next=argv[i+1];if(next&&!next.startsWith('--')){out[key]=next;i++;}else out[key]=true;}return out;}
function readJson(file){return JSON.parse(fs.readFileSync(path.resolve(file),'utf8'));}
function writeJson(file,value){const resolved=path.resolve(file);fs.mkdirSync(path.dirname(resolved),{recursive:true});fs.writeFileSync(resolved,JSON.stringify(value,null,2)+'\n');}
function main(){
  const args=argsOf(process.argv.slice(2));
  const existingPath=args.existing||'04_data/knowledge/food-db.json';
  const officialPath=args.official||'04_data/knowledge/kfind-home-analyzed-v1.json';
  const reportPath=args.report||'tmp/official-food-safe-merge-report.json';
  const existing=readJson(existingPath),official=readJson(officialPath),result=Safe.merge(existing,official),summary=result.plan.summary;
  writeJson(reportPath,{version:Safe.VERSION,generatedAt:new Date().toISOString(),existingPath,officialPath,summary,manualReview:result.plan.manualReview,unmatchedTargets:result.plan.unmatchedTargets});
  if(args.output)writeJson(args.output,result.foods);
  if(args.write){writeJson(existingPath,result.foods);process.stdout.write(`[official-food-safe-merge] wrote ${existingPath}\n`);}
  process.stdout.write(JSON.stringify(summary,null,2)+'\n');
  if(summary.safeProposals<1)process.exitCode=2;
}
main();
