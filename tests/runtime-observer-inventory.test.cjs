'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

/* Release invariant: every booted UI runtime is tracked and cannot reintroduce broad DOM repair ownership. */
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const bootScripts=[...html.matchAll(/<script\s+[^>]*src=["']\.\/([^"'?]+)(?:\?[^"']*)?["'][^>]*>/gi)].map(match=>match[1]);
const bootUi=[...new Set(bootScripts.filter(p=>p.startsWith('06_features/ui/')&&p.endsWith('.js')))];
const manifestUi=[...new Set(manifest.scripts.filter(p=>p.startsWith('06_features/ui/')&&p.endsWith('.js')))];

assert.deepEqual([...manifestUi].sort(),[...bootUi].sort(),'runtime-manifest UI scripts must exactly match the UI runtimes actually booted by index.html');

const findings=[];
const documentWide=[];
const coachScrollOwners=[];
for(const file of bootUi){
  const src=fs.readFileSync(path.join(root,file),'utf8');
  const compact=src.replace(/\s+/g,' ');
  const broadBody=/\.observe\(\s*document\.body\s*,\s*\{[^}]*childList\s*:\s*true[^}]*subtree\s*:\s*true/i.test(compact);
  const broadMain=/\.observe\(\s*main\s*,\s*\{[^}]*childList\s*:\s*true[^}]*subtree\s*:\s*true/i.test(compact)
    ||/\.observe\(\s*document\.getElementById\(['\"]main['\"]\)\s*,\s*\{[^}]*childList\s*:\s*true[^}]*subtree\s*:\s*true/i.test(compact);
  const broadDocument=/\.observe\(\s*document\.documentElement\s*,\s*\{[^}]*subtree\s*:\s*true[^}]*childList\s*:\s*true/i.test(compact)
    ||/\.observe\(\s*document\.documentElement\s*,\s*\{[^}]*childList\s*:\s*true[^}]*subtree\s*:\s*true/i.test(compact);
  if(broadBody||broadMain)findings.push({file,broadBody,broadMain});
  if(broadDocument)documentWide.push(file);
  if(src.includes('.g2-chat-scroll')&&src.includes('scrollTop'))coachScrollOwners.push(file);
}

assert.deepEqual(findings,[],`broad body/#main UI MutationObserver ownership remains:\n${JSON.stringify(findings,null,2)}`);
assert.deepEqual(documentWide.sort(),[
  '06_features/ui/i18n/runtime.js',
  '06_features/ui/runtime/garang-units-runtime.js'
].sort(),`only translation/unit text adapters may observe the whole document, and their writes must remain idempotent:\n${JSON.stringify(documentWide,null,2)}`);
assert.deepEqual(coachScrollOwners,['06_features/ui/runtime/garang-brand-runtime-v2.js'],`Coach scrolling must have one canonical JS owner:\n${JSON.stringify(coachScrollOwners,null,2)}`);
console.log('runtime-observer-inventory: PASS',JSON.stringify({uiRuntimeCount:bootUi.length,broadBodyMain:findings.length,documentWide,coachScrollOwners}));
