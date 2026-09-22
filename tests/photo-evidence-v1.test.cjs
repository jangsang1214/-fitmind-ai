const assert=require('node:assert/strict');
const fs=require('node:fs');

const runtime=fs.readFileSync('06_features/ui/runtime/garang-photo-evidence-v1.js','utf8');
const app=fs.readFileSync('01_app/app.js','utf8');
const css=fs.readFileSync('03_styles/runtime/garang-photo-evidence-v1.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const workoutLibrary=fs.readFileSync('06_features/ui/runtime/garang-workout-library-v2.js','utf8');

assert.match(runtime,/garang-photo-evidence-v1\.5/);
assert.match(runtime,/MAX_FILE_BYTES=8\*1024\*1024/);
assert.match(runtime,/image\/jpeg.*image\/png.*image\/webp.*image\/heic.*image\/heif/s);
assert.match(runtime,/storage:'device-indexeddb'/);
assert.match(runtime,/localOnly:true/);
assert.match(runtime,/userConfirmed:true/);
assert.doesNotMatch(runtime,/fetch\s*\(/,'Photo Evidence must not upload binary media over the network');
assert.match(runtime,/context=\{\}/,'viewer must accept record context without changing storage ownership');
assert.match(runtime,/MEAL EVIDENCE/);
assert.match(runtime,/WORKOUT EVIDENCE/);
assert.match(runtime,/사진 원본은 현재 기기에 저장됩니다/);

assert.match(app,/photoEvidence:evidence/,'workout and meal records must retain evidence metadata');
assert.ok((app.match(/api\.store\(evidenceId,draft\.file\)/g)||[]).length>=2,'workout and nutrition saves must persist evidence bytes outside JSON state');
assert.match(app,/data-photo-evidence=/,'saved records must expose a photo retrieval action');
assert.match(app,/오늘의 운동을 남겨보세요/);
assert.match(app,/MEAL EVIDENCE/);
assert.match(app,/GARANG 추정값/);
assert.match(app,/PHOTO EVIDENCE/);
assert.match(app,/data-photo-evidence-meta=/);
assert.match(app,/세션 저장 시 사진도 함께 기록됩니다/);
assert.match(app,/이 식사의 분석 기준 사진/);

assert.match(css,/photo-evidence-record/);
assert.match(css,/garang-photo-evidence-meta/);
assert.match(css,/photo-evidence-actions button\{min-height:44px\}/);
assert.match(css,/safe-area-inset-top/);
assert.match(css,/@media\(max-width:360px\)/);

assert.match(html,/id="workoutPhotoPicker"[^>]+capture="environment"/);
assert.match(html,/garang-photo-evidence-v1\.css\?v=1\.5\.0/);
assert.match(html,/garang-photo-evidence-v1\.js\?v=1\.5\.0/);

console.log('photo evidence v1.5 design contract: PASS');
