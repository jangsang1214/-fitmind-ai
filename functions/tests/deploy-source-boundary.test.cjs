'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);}
const runtime=[path.join(root,'index.js'),...walk(path.join(root,'src')).filter(file=>/\.(?:js|cjs)$/.test(file))];
const violations=[];
for(const file of runtime){const source=fs.readFileSync(file,'utf8');for(const match of source.matchAll(/require\(['"](\.\.[^'"]+)['"]\)/g)){const resolved=path.resolve(path.dirname(file),match[1]);if(!resolved.startsWith(root+path.sep))violations.push({file:path.relative(root,file),require:match[1]});}}
assert.deepEqual(violations,[],'Firebase Functions runtime must be self-contained inside functions/ deploy source');
console.log('functions deploy-source-boundary: PASS',JSON.stringify({runtimeFiles:runtime.length}));
