'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('01_app/app.js','utf8');
const version=fs.readFileSync('07_config/version.js','utf8');
const wanted=fs.readFileSync('06_features/ui/runtime/garang-wanted-submission-v1.js','utf8');
const wantedCss=fs.readFileSync('03_styles/runtime/garang-wanted-submission-v1.css','utf8');
const wantedDataset=JSON.parse(fs.readFileSync('04_data/wanted/wanted-14day-synthetic-v1.json','utf8'));

// Commercial auth surface remains unchanged: no retired demo entry or retired demo flag in canonical index/app.
assert.equal(html.includes('id="demoBtn"'),false);assert.equal(html.includes('데모로 시작하기'),false);assert.equal(html.includes('로그인 없이도 로컬 데모'),false);
for(const forbidden of ["const DEMO_KEY","getItem('garang_demo')","demo_started","$('demoBtn').onclick"])assert.equal(app.includes(forbidden),false,forbidden);
assert.match(app,/storageKey=SIGNED_OUT_KEY/);

// Wanted judging mode is an explicit derivative layer pinned to the verified commercial snapshot.
assert.match(version,/GARANG_WANTED_SUBMISSION/);
assert.match(version,/b863a7634bd64b03a6e6f3772950c43cc81afb6f/);
assert.match(version,/garang-wanted-submission-v1\.js/);
assert.match(version,/garang-wanted-submission-v1\.css/);
assert.match(wanted,/60초 심사 체험/);
assert.match(wanted,/garang_wanted_demo_active_v1/);
assert.match(wanted,/JUDGING MODE · 14 DAYS SYNTHETIC DATA/);
assert.match(wanted,/wanted-14day-synthetic-v1\.json/);
assert.match(wanted,/deterministic intelligence/);
assert.equal(wantedDataset.synthetic,true);
assert.equal(wantedDataset.spanDays,14);
assert.equal(wanted.includes("localStorage.setItem('garang_demo'"),false);
assert.equal(wanted.includes('GARANG_FIREBASE_CONFIG='),false);
assert.equal(wanted.includes('apiKey:'),false);
assert.ok(wantedCss.includes('.wanted-demo-guide'));

const browserFiles=fs.readdirSync('tests').filter(name=>/^browser-.*\.test\.cjs$/.test(name));
for(const file of browserFiles){const source=fs.readFileSync(`tests/${file}`,'utf8');assert.equal(/localStorage\.setItem\(['"]garang_demo['"]/.test(source),false,`${file} must not use the retired demo flag as an auth fixture`);}
console.log('commercial auth + Wanted 14-day derivative judging contract: PASS',JSON.stringify({browserFiles:browserFiles.length}));
