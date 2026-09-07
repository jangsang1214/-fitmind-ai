'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const manifest=JSON.parse(read('runtime-manifest.json'));
const html=read('index.html');
const contract=manifest.runtimeContract;
assert.ok(contract&&contract.status==='frozen','runtime contract must be frozen');
assert.equal(contract.version,1);

const localScripts=[...html.matchAll(/<script\s+[^>]*src=["']\.\/([^"'?]+)(?:\?[^"']*)?["'][^>]*>/gi)].map(m=>m[1]);
const localStyles=[...html.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']\.\/([^"'?]+)(?:\?[^"']*)?["'][^>]*>/gi)].map(m=>m[1]);
assert.deepEqual(localScripts,manifest.scripts,'runtime-manifest scripts must exactly match boot order');
assert.deepEqual(localStyles,manifest.styles,'runtime-manifest styles must exactly match boot order');
assert.equal(new Set(localScripts).size,localScripts.length,'active scripts must not be duplicated');
assert.equal(new Set(localStyles).size,localStyles.length,'active styles must not be duplicated');
assert.equal(localScripts.some(p=>/(^|\/)archive\//i.test(p)),false,'archive scripts must never boot');
assert.equal(localStyles.some(p=>/(^|\/)archive\//i.test(p)),false,'archive styles must never boot');

for(const [capability,owner] of Object.entries(contract.singleOwners||{})){
  assert.ok(localScripts.includes(owner),`${capability} owner must be an active script: ${owner}`);
}
assert.equal(new Set(Object.keys(contract.singleOwners||{})).size,Object.keys(contract.singleOwners||{}).length);
assert.equal(new Set(contract.lifecycleEvents||[]).size,(contract.lifecycleEvents||[]).length,'lifecycle events must be unique');

const riskyName=/\/(?:[^/]*(?:hotfix|fix|safety|stability)[^/]*)\.js$/i;
const legacyNamed=localScripts.filter(p=>riskyName.test(p)).sort();
assert.deepEqual(legacyNamed,[...(contract.legacyNamedCanonical||[])].sort(),'no new hotfix/fix/safety/stability runtime may become active without explicit contract review');

const broad=[];const docWide=[];
for(const file of localScripts.filter(p=>p.startsWith('06_features/ui/')&&p.endsWith('.js'))){
  const src=read(file).replace(/\s+/g,' ');
  if(/\.observe\(\s*document\.body\s*,\s*\{[^}]*subtree\s*:\s*true/i.test(src)||/\.observe\(\s*(?:main|document\.getElementById\(['\"]main['\"]\))\s*,\s*\{[^}]*subtree\s*:\s*true/i.test(src))broad.push(file);
  if(/\.observe\(\s*document\.documentElement\s*,\s*\{[^}]*subtree\s*:\s*true/i.test(src))docWide.push(file);
}
assert.deepEqual(broad,[],'broad body/#main observer ownership is forbidden');
assert.deepEqual(docWide.sort(),[...(contract.documentWideObserverAllowlist||[])].sort(),'document-wide observers must stay on the frozen adapter allowlist');
console.log('runtime-freeze-contract-v1: PASS',JSON.stringify({scripts:localScripts.length,styles:localStyles.length,docWide}));
