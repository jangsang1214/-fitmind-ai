'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),repoRoot=path.resolve(root,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const runtime=[path.join(root,'index.js'),...walk(path.join(root,'src')).filter(file=>/\.(?:js|cjs)$/.test(file))];
const violations=[];
for(const file of runtime){const source=fs.readFileSync(file,'utf8');for(const match of source.matchAll(/require\(['"](\.\.[^'"]+)['"]\)/g)){const resolved=path.resolve(path.dirname(file),match[1]);if(!resolved.startsWith(root+path.sep))violations.push({file:path.relative(root,file),require:match[1]});}}
assert.deepEqual(violations,[],'Firebase Functions runtime must be self-contained inside functions/ deploy source');
const indexSource=fs.readFileSync(path.join(root,'index.js'),'utf8'),providerSource=fs.readFileSync(path.join(root,'src','llm-provider.cjs'),'utf8'),activationSource=fs.readFileSync(path.join(repoRoot,'.github','workflows','production-coach-activation.yml'),'utf8');
assert.match(providerSource,/const DEFAULT_TIMEOUT_MS=25000;/,'production LLM provider attempt timeout must remain 25 seconds');
assert.match(providerSource,/Math\.min\(2,Number\(options\.maxAttempts\)\|\|2\)/,'production LLM provider must keep one bounded transient retry');
assert.match(indexSource,/GARANG_LLM_TIMEOUT_MS\)\|\|25000/,'production Coach provider config must default to 25 seconds per attempt');
assert.match(indexSource,/timeoutSeconds:60/,'Firebase api Function timeout must leave headroom for one bounded retry');
assert.match(indexSource,/COACH_WINDOW_LIMIT=40,COACH_DAILY_LIMIT=200/,'production Coach quota must support conversational usage while remaining bounded');
assert.match(activationSource,/\- functions\/\*\*/,'production activation must trigger when approved Functions source changes');
assert.match(activationSource,/\- firebase\.json/,'production activation must trigger when approved Firebase runtime config changes');
console.log('functions deploy-source-boundary: PASS',JSON.stringify({runtimeFiles:runtime.length,providerTimeoutMs:25000,maxAttempts:2,functionTimeoutSeconds:60,windowLimit:40,dailyLimit:200}));
