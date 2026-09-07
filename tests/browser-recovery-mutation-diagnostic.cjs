'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const sourcePath=path.join(__dirname,'browser-authenticated-recovery-touch.test.cjs');
const tempPath=path.join(__dirname,'.browser-authenticated-recovery-touch.diag.cjs');
let source=fs.readFileSync(sourcePath,'utf8');

const contextNeedle="const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});";
if(!source.includes(contextNeedle))throw new Error('diagnostic context insertion point changed');
const moInit=`\n  await context.addInitScript(()=>{\n    const NativeMutationObserver=window.MutationObserver;\n    let sequence=0;\n    window.__garangMutationDiagnostic={armed:false,stats:[]};\n    class DiagnosticMutationObserver{\n      constructor(callback){\n        const stat={id:++sequence,total:0,armed:0,dropped:0,stack:String(new Error('MutationObserver created').stack||'')};\n        window.__garangMutationDiagnostic.stats.push(stat);\n        this.__native=new NativeMutationObserver((records)=>{\n          stat.total++;\n          if(window.__garangMutationDiagnostic.armed){\n            stat.armed++;\n            if(stat.armed>40){\n              stat.dropped++;\n              if(stat.dropped===1)console.log('[recovery-mo-loop] '+JSON.stringify({id:stat.id,armed:stat.armed,stack:stat.stack}));\n              return;\n            }\n          }\n          return callback(records,this);\n        });\n      }\n      observe(...args){return this.__native.observe(...args);}\n      disconnect(){return this.__native.disconnect();}\n      takeRecords(){return this.__native.takeRecords();}\n    }\n    window.MutationObserver=DiagnosticMutationObserver;\n  });`;
source=source.replace(contextNeedle,contextNeedle+moInit);

const armNeedle="stage('before navigation diagnostic');";
if(!source.includes(armNeedle))throw new Error('diagnostic arm insertion point changed');
source=source.replace(armNeedle,"await page.evaluate(()=>{window.__garangMutationDiagnostic.armed=true;for(const stat of window.__garangMutationDiagnostic.stats){stat.armed=0;stat.dropped=0;}window.__garangSavedScrollIntoView=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(){console.log('[recovery-diag] scrollIntoView suppressed for isolation');};});"+armNeedle);

const reportNeedle="await sleep(300);await heartbeat(page,'second navigation heartbeat after recovery cancel');";
if(!source.includes(reportNeedle))throw new Error('diagnostic report insertion point changed');
source=source.replace(reportNeedle,reportNeedle+"const moReport=await page.evaluate(()=>{if(window.__garangSavedScrollIntoView){Element.prototype.scrollIntoView=window.__garangSavedScrollIntoView;delete window.__garangSavedScrollIntoView;}return window.__garangMutationDiagnostic.stats.map(({id,total,armed,dropped,stack})=>({id,total,armed,dropped,stack}));});console.log('[recovery-mo-report] '+JSON.stringify(moReport));");

fs.writeFileSync(tempPath,source);
const child=spawn(process.execPath,[tempPath],{cwd:root,stdio:'inherit'});
child.on('exit',code=>{try{fs.unlinkSync(tempPath);}catch{}process.exit(code??1);});
child.on('error',error=>{try{fs.unlinkSync(tempPath);}catch{}console.error(error);process.exit(1);});
