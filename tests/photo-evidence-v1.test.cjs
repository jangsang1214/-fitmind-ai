const assert=require('node:assert/strict');
const fs=require('node:fs');

const runtime=fs.readFileSync('06_features/ui/runtime/garang-photo-evidence-v1.js','utf8');
const app=fs.readFileSync('01_app/app.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert.match(runtime,/garang-photo-evidence-v1/);
assert.match(runtime,/MAX_FILE_BYTES=8\*1024\*1024/);
assert.match(runtime,/image\/jpeg.*image\/png.*image\/webp.*image\/heic.*image\/heif/s);
assert.match(runtime,/storage:'device-indexeddb'/);
assert.match(runtime,/localOnly:true/);
assert.match(runtime,/userConfirmed:true/);
assert.doesNotMatch(runtime,/fetch\s*\(/,'Photo Evidence v1 must not upload binary media over the network');
assert.match(app,/photoEvidence:evidence/,'workout and meal records must retain evidence metadata');
assert.match(app,/GarangPhotoEvidence\.store/,'record save must persist evidence bytes outside JSON state');
assert.match(app,/data-photo-evidence=/,'saved records must expose a photo retrieval action');
assert.match(html,/id="workoutPhotoPicker"[^>]+capture="environment"/);
assert.match(html,/garang-photo-evidence-v1\.css/);
assert.match(html,/garang-photo-evidence-v1\.js/);

console.log('photo evidence v1 contract: PASS');
