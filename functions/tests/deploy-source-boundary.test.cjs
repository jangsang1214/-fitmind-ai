'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),repoRoot=path.resolve(root,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const runtime=[path.join(root,'index.js'),...walk(path.join(root,'src')).filter(file=>/\.(?:js|cjs)$/.test(file))];
const violations=[];
for(const file of runtime){const source=fs.readFileSync(file,'utf8');for(const match of source.matchAll(/require\(['"](\.\.[^'"]+)['"]\)/g)){const resolved=path.resolve(path.dirname(file),match[1]);if(!resolved.startsWith(root+path.sep))violations.push({file:path.relative(root,file),require:match[1]});}}
assert.deepEqual(violations,[],'Firebase Functions runtime must be self-contained inside functions/ deploy source');
const indexSource=fs.readFileSync(path.join(root,'index.js'),'utf8'),providerSource=fs.readFileSync(path.join(root,'src','llm-provider.cjs'),'utf8'),activationSource=fs.readFileSync(path.join(repoRoot,'.github','workflows','production-coach-activation.yml'),'utf8');
assert.match(providerSource,/const DEFAULT_TIMEOUT_MS=20000;/,'production LLM provider default timeout must remain 20 seconds');
assert.match(indexSource,/GARANG_LLM_TIMEOUT_MS\)\|\|20000/,'production Coach provider config must default to 20 seconds');
assert.match(indexSource,/timeoutSeconds:30/,'Firebase api Function timeout must leave headroom above the provider timeout');
assert.match(activationSource,/\- functions\/\*\*/,'production activation must trigger when approved Functions source changes');
assert.match(activationSource,/\- firebase\.json/,'production activation must trigger when approved Firebase runtime config changes');
console.log('functions deploy-source-boundary: PASS',JSON.stringify({runtimeFiles:runtime.length,providerTimeoutMs:20000,functionTimeoutSeconds:30}));
