'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8'));
const uiScripts=manifest.scripts.filter(p=>p.startsWith('06_features/ui/')&&p.endsWith('.js'));
const findings=[];
const coachScrollOwners=[];

for(const file of uiScripts){
  const src=fs.readFileSync(path.join(root,file),'utf8');
  const compact=src.replace(/\s+/g,' ');
  const broadBody=/\.observe\(\s*document\.body\s*,\s*\{[^}]*childList\s*:\s*true[^}]*subtree\s*:\s*true/i.test(compact);
  const broadMain=/\.observe\(\s*main\s*,\s*\{[^}]*childList\s*:\s*true[^}]*subtree\s*:\s*true/i.test(compact)
    ||/\.observe\(\s*document\.getElementById\(['\"]main['\"]\)\s*,\s*\{[^}]*childList\s*:\s*true[^}]*subtree\s*:\s*true/i.test(compact);
  if(broadBody||broadMain)findings.push({file,broadBody,broadMain});
  if(src.includes('.g2-chat-scroll')&&src.includes('scrollTop'))coachScrollOwners.push(file);
}

assert.deepEqual(findings,[],`broad UI MutationObserver ownership remains:\n${JSON.stringify(findings,null,2)}`);
assert.deepEqual(coachScrollOwners,['06_features/ui/runtime/garang-brand-runtime-v2.js'],`Coach scrolling must have one canonical JS owner:\n${JSON.stringify(coachScrollOwners,null,2)}`);
console.log('runtime-observer-inventory: PASS',JSON.stringify({uiRuntimeCount:uiScripts.length,broadObservers:findings.length,coachScrollOwners}));
