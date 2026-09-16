'use strict';

const fs=require('node:fs');
const assert=require('node:assert/strict');

const source=fs.readFileSync('06_features/ui/runtime/garang-coach-multimodal-v1.js','utf8');

assert.match(source,/composer\.classList\.add\('g6-photo-composer'\)/,'Coach composer must own multimodal attachment UI');
assert.match(source,/button\.textContent='\+'/,'photo attachment entry must be a compact plus button');
assert.match(source,/composer\.appendChild\(button\)/,'plus button must live inside the Coach composer');
assert.match(source,/composer\.appendChild\(input\)/,'hidden file picker must remain owned by the Coach composer');
assert.match(source,/composer\.appendChild\(box\)/,'photo preview must render inside the Coach composer');
assert.doesNotMatch(source,/g6-photo-tools/,'legacy standalone photo tools row must not return');
assert.doesNotMatch(source,/g6-photo-note/,'legacy standalone photo note must not return');
assert.match(source,/image\/jpeg,image\/png,image\/webp/,'picker must remain limited to supported image formats');
assert.match(source,/MAX_FILE_BYTES=8\*1024\*1024/,'8 MB input boundary must remain intact');
assert.match(source,/consumeForRequest\(\).*clear\(\)/s,'photo draft must remain one-request ephemeral');
assert.match(source,/document\.querySelectorAll\('\.g2-composer\.g6-has-photo'\)/,'clearing draft must reset composer photo presentation');
assert.match(source,/not saved after the next request/,'composer control must preserve ephemeral privacy cue');

console.log('coach multimodal composer UI contract: PASS');
