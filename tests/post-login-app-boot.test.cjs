'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'02_core/sw-runtime.js'),'utf8');

assert.ok(!html.includes('garang-boot-safety-v1.js'),'boot safety runtime must stay out of the app boot path');
assert.ok(!html.includes('garang-interaction-safety-v1.css'),'interaction safety overlay CSS must stay out of the app boot path');
assert.ok(!html.includes('garang-lifetime-history-v1.js'),'lifetime runtime must stay out of the app boot path');
assert.ok(html.includes('./06_features/ui/runtime/garang-sync-durability-v1.js?v=1.0.0'),'known-good sync runtime must remain wired');
assert.ok(html.includes('./01_app/app.js?v=0.11.0-beta.5-stability1'),'canonical app boot must remain wired');
assert.ok(sw.includes('garang-known-good-boot-rollback-v5-20260906'),'service worker must force replacement of the broken boot shell');
console.log('post-login-app-boot: PASS');
