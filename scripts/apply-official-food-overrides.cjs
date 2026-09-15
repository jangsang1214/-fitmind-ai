'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Safe=require('../02_core/food-corpus-safe-overrides-v1.js');

function argsOf(argv){const out={};for(let i=0;i<argv.length;i++){const token=argv[i];if(!token.startsWith('--'))continue;const key=token.slice(2),next=argv[i+1];if(next&&!next.startsWith('--')){out[key]=next;i++;}else out[key]=true;}return out;}
function readText(file){return fs.readFileSync(path.resolve(file),'utf8');}
function readJson(file){return JSON.parse(readText(file));}
function writeJson(file,value){const resolved=path.resolve(file);fs.mkdirSync(path.dirname(resolved),{recursive:true});fs.writeFileSync(resolved,JSON.stringify(value,null,2)+'\n');}
function writeText(file,value){const resolved=path.resolve(file);fs.mkdirSync(path.dirname(resolved),{recursive:true});fs.writeFileSync(resolved,value);}
function findObjectRange(text,foodId){
  const marker=`\n  {\n    "food_id": "${String(foodId).replace(/["\\]/g,'\\$&')}",`;
  const markerAt=text.indexOf(marker);
  if(markerAt<0)throw new Error(`FOOD_OBJECT_NOT_FOUND:${foodId}`);
  const start=markerAt+3;
  let depth=0,inString=false,escaped=false;
  for(let i=start;i<text.length;i++){
    const ch=text[i];
    if(inString){if(escaped){escaped=false;continue;}if(ch==='\\'){escaped=true;continue;}if(ch==='"')inString=false;continue;}
    if(ch==='"'){inString=true;continue;}
    if(ch==='{')depth++;
    else if(ch==='}'){
      depth--;
      if(depth===0)return {start,end:i+1};
    }
  }
  throw new Error(`FOOD_OBJECT_UNTERMINATED:${foodId}`);
}
function indentObject(value){return JSON.stringify(value,null,2).split('\n').map(line=>`  ${line}`).join('\n');}
function applyTargetedText(existingText,existingRows,plan){
  const proposals=[...(plan?.proposals||[])].sort((a,b)=>findObjectRange(existingText,b.targetFoodId).start-findObjectRange(existingText,a.targetFoodId).start);
  let output=existingText;
  const byId=new Map(existingRows.map(row=>[String(row.food_id||row.foodId||row.id||''),row]));
  const mergedById=new Map(Safe.applyPlan(existingRows,plan).map(row=>[String(row.food_id||row.foodId||row.id||''),row]));
  for(const proposal of proposals){
    const id=String(proposal.targetFoodId),before=byId.get(id),after=mergedById.get(id);
    if(!before||!after)throw new Error(`FOOD_TARGET_MISSING:${id}`);
    const range=findObjectRange(output,id);
    output=output.slice(0,range.start)+indentObject(after)+output.slice(range.end);
  }
  return output;
}
function main(){
  const args=argsOf(process.argv.slice(2));
  const existingPath=args.existing||'04_data/knowledge/food-db.json';
  const officialPath=args.official||'04_data/knowledge/kfind-home-analyzed-v1.json';
  const reportPath=args.report||'tmp/official-food-safe-merge-report.json';
  const existingText=readText(existingPath),existing=JSON.parse(existingText),official=readJson(officialPath),result=Safe.merge(existing,official),summary=result.plan.summary;
  writeJson(reportPath,{version:Safe.VERSION,generatedAt:new Date().toISOString(),existingPath,officialPath,summary,manualReview:result.plan.manualReview,unmatchedTargets:result.plan.unmatchedTargets});
  const targetedText=applyTargetedText(existingText,existing,result.plan);
  if(args.output)writeText(args.output,targetedText);
  if(args.write){writeText(existingPath,targetedText);process.stdout.write(`[official-food-safe-merge] wrote ${existingPath}; proposals=${summary.safeProposals}\n`);}
  process.stdout.write(JSON.stringify(summary,null,2)+'\n');
}
main();
