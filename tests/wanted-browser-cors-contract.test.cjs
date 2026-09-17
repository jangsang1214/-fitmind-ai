'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,'../functions/index.js'),'utf8');
assert.match(source,/const WANTED_PUBLIC_ORIGIN='https:\/\/garang-wanted-2026-jangsang1214\.vercel\.app'/);
assert.match(source,/function wantedCoachCors\(/);
assert.match(source,/request\.path!=='\/wanted\/coach'/);
assert.match(source,/Access-Control-Allow-Origin/);
assert.match(source,/Access-Control-Allow-Methods','POST, OPTIONS'/);
assert.match(source,/Access-Control-Allow-Headers','Content-Type'/);
assert.match(source,/request\.method==='OPTIONS'/);
assert.match(source,/origin!==WANTED_PUBLIC_ORIGIN.*status\(403\)/s);
assert.match(source,/status\(204\)\.end\(\)/);
assert.match(source,/app\.use\(wantedCoachCors\)/);
assert.match(source,/exports\.api=onRequest\(\{region:'asia-northeast3',cors:false/);
console.log('Wanted browser CORS contract: PASS');
