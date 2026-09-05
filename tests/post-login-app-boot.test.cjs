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
const sanitizer=html.indexOf('./06_features/ui/runtime/garang-state-sanitizer-v1.js');
const syncRuntime=html.indexOf('./06_features/ui/runtime/garang-sync-durability-v1.js');
const app=html.indexOf('./01_app/app.js');
assert.ok(sanitizer>0&&syncRuntime>sanitizer&&app>syncRuntime,'state sanitizer and sync runtime must load before canonical app boot');
assert.ok(/\.\/01_app\/app\.js\?v=[^"']+/.test(html),'canonical app boot must remain cache-busted and wired');
assert.ok(/const CACHE='garang-[^']+';/.test(sw),'service worker must use a versioned GARANG shell cache');
assert.ok(sw.includes('./06_features/ui/runtime/garang-state-sanitizer-v1.js'),'service worker shell must include state sanitizer');
console.log('post-login-app-boot: PASS');
