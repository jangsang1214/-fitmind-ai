'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const sourcePath=path.join(__dirname,'browser-authenticated-recovery-touch.test.cjs');
const tempPath=path.join(__dirname,'.browser-authenticated-recovery-touch.diag.cjs');
let source=fs.readFileSync(sourcePath,'utf8');

const consoleNeedle="if(text.startsWith('[recovery-mock]')||text.startsWith('[recovery-diag]'))console.log(text);";
if(!source.includes(consoleNeedle))throw new Error('diagnostic console insertion point changed');
source=source.replace(consoleNeedle,"if(text.startsWith('[recovery-'))console.log(text);");

const armNeedle="stage('before navigation diagnostic');";
if(!source.includes(armNeedle))throw new Error('diagnostic arm insertion point changed');
const passiveArm=`await page.evaluate(()=>{\n    const root=document.getElementById('main')||document.body;\n    const stats={callbacks:0,records:0,childList:0,attributes:0,characterData:0,maxBatch:0};\n    const observer=new MutationObserver(records=>{\n      stats.callbacks+=1;stats.records+=records.length;stats.maxBatch=Math.max(stats.maxBatch,records.length);\n      for(const record of records){if(record.type==='childList')stats.childList+=1;else if(record.type==='attributes')stats.attributes+=1;else if(record.type==='characterData')stats.characterData+=1;}\n    });\n    observer.observe(root,{subtree:true,childList:true,attributes:true,characterData:true});\n    window.__garangExecutionDiagnostic={stats,observer};\n  });`;
source=source.replace(armNeedle,passiveArm+armNeedle);

const reportNeedle="await sleep(300);await heartbeat(page,'second navigation heartbeat after recovery cancel');";
if(!source.includes(reportNeedle))throw new Error('diagnostic report insertion point changed');
const passiveReport=`const executionReport=await page.evaluate(()=>{const diagnostic=window.__garangExecutionDiagnostic;diagnostic?.observer?.disconnect();return diagnostic?.stats||null;});assert.ok(executionReport,'passive recovery diagnostic must produce stats');assert.ok(executionReport.callbacks<500,\`recovery mutation callback storm: \${JSON.stringify(executionReport)}\`);assert.ok(executionReport.records<5000,\`recovery mutation record storm: \${JSON.stringify(executionReport)}\`);console.log('[recovery-exec-report] '+JSON.stringify(executionReport));`;
source=source.replace(reportNeedle,reportNeedle+passiveReport);

fs.writeFileSync(tempPath,source);
const child=spawn(process.execPath,[tempPath],{cwd:root,stdio:'inherit'});
child.on('exit',code=>{try{fs.unlinkSync(tempPath);}catch{}process.exit(code??1);});
child.on('error',error=>{try{fs.unlinkSync(tempPath);}catch{}console.error(error);process.exit(1);});
