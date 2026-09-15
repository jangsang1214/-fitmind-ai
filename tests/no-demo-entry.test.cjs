'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('01_app/app.js','utf8');
assert.equal(html.includes('id="demoBtn"'),false);assert.equal(html.includes('데모로 시작하기'),false);assert.equal(html.includes('로그인 없이도 로컬 데모'),false);
for(const forbidden of ["const DEMO_KEY","getItem('garang_demo')","demo_started","$('demoBtn').onclick"])assert.equal(app.includes(forbidden),false,forbidden);
assert.match(app,/storageKey=SIGNED_OUT_KEY/);console.log('signed-out demo entry removal: PASS');
