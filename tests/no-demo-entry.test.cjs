'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('01_app/app.js','utf8');
assert.equal(html.includes('id="demoBtn"'),false);assert.equal(html.includes('데모로 시작하기'),false);assert.equal(html.includes('로그인 없이도 로컬 데모'),false);
for(const forbidden of ["const DEMO_KEY","getItem('garang_demo')","demo_started","$('demoBtn').onclick"])assert.equal(app.includes(forbidden),false,forbidden);
assert.match(app,/storageKey=SIGNED_OUT_KEY/);
const browserFiles=fs.readdirSync('tests').filter(name=>/^browser-.*\.test\.cjs$/.test(name));
for(const file of browserFiles){const source=fs.readFileSync(`tests/${file}`,'utf8');assert.equal(/localStorage\.setItem\(['"]garang_demo['"]/.test(source),false,`${file} must not use the retired demo flag as an auth fixture`);}
console.log('signed-out demo entry removal: PASS',JSON.stringify({browserFiles:browserFiles.length}));
