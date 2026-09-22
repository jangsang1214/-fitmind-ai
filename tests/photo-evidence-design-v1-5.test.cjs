'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const app=fs.readFileSync('01_app/app.js','utf8');
const css=fs.readFileSync('03_styles/runtime/garang-photo-evidence-v1.css','utf8');
const runtime=fs.readFileSync('06_features/ui/runtime/garang-photo-evidence-v1.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const workoutLibrary=fs.readFileSync('06_features/ui/runtime/garang-workout-library-v2.js','utf8');

assert.match(app,/오늘의 운동을 남겨보세요/,'Workout Evidence must communicate action evidence, not upload mechanics');
assert.match(app,/사진은 운동 기록과 함께 저장됩니다/);
assert.match(app,/식사를 사진으로 기록하세요/,'Nutrition Evidence must share the same evidence language');
assert.match(app,/분석 후 저장 전에 직접 확인할 수 있습니다/);
assert.match(app,/사진 인식 결과를 Food DB와 연결했습니다\. 저장 전 음식과 양을 확인하세요\./,'Meal analysis must stay explicitly user-confirmed');
assert.match(app,/확인하고 식사에 추가/,'Meal Scan must require explicit confirmation before joining the meal draft');
assert.match(app,/PHOTO EVIDENCE/,'Saved records must visibly communicate photo evidence');
assert.match(app,/오늘의 운동 사진이 함께 기록됨/);
assert.match(app,/이 식사의 분석 기준 사진/);
assert.match(app,/data-photo-evidence-meta=/,'Evidence viewer must receive record context');
assert.match(app,/currentCert\.workout\?[^]*GARANG VERIFIED/,'Share/export affordance must only surface after a saved workout photo exists');
assert.doesNotMatch(app,/큰 점선|업로드하세요|UPLOAD PHOTO/i,'Evidence UI must not regress into generic upload-widget language');

assert.match(css,/photo-evidence-head/);
assert.match(css,/photo-evidence-record/);
assert.match(css,/min-height:44px/,'Photo actions must remain touch safe');
assert.match(css,/env\(safe-area-inset-top\)/);
assert.match(css,/env\(safe-area-inset-bottom\)/);
assert.match(css,/rgba\(186,161,111/,'Evidence accent must stay in restrained GARANG brass family');
assert.doesNotMatch(css,/#[0-9a-fA-F]{6}[^\n]*(?:green|lime)/,'Evidence design must not depend on social/success green styling');

assert.match(runtime,/garang-photo-evidence-v1\.5/);
assert.match(runtime,/async function show\(id,title='기록 사진',meta=''\)/);
assert.match(runtime,/garang-photo-evidence-dialog-meta/);
assert.match(runtime,/사진 원본은 현재 기기에 저장됩니다/);

assert.match(html,/garang-photo-evidence-v1\.css\?v=1\.6\.0-meal-scan/);
assert.match(html,/garang-photo-evidence-v1\.js\?v=1\.5\.0/);
assert.match(workoutLibrary,/!card \|\| card\.classList\.contains\('photo-evidence-card'\)/,'Legacy workout certification polish must not rewrite Photo Evidence');

console.log('photo evidence design v1.5 contract: PASS');
