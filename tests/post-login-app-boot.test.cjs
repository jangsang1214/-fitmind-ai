'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sw=fs.readFileSync(path.join(root,'02_core/sw-runtime.js'),'utf8');
assert.ok(!html.includes('garang-boot-safety-v1.js'));assert.ok(!html.includes('garang-interaction-safety-v1.css'));assert.ok(!html.includes('garang-lifetime-history-v1.js'));
const history=html.indexOf('./02_core/history-persistence-v2.js'),sanitizer=html.indexOf('./06_features/ui/runtime/garang-state-sanitizer-v1.js'),syncRuntime=html.indexOf('./06_features/ui/runtime/garang-sync-durability-v1.js'),app=html.indexOf('./01_app/app.js');
assert.ok(history>0&&sanitizer>history&&syncRuntime>sanitizer&&app>syncRuntime,'history, sanitizer and sync runtime must load before canonical app boot');
assert.ok(/\.\/01_app\/app\.js\?v=[^"']+/.test(html));
assert.ok(sw.includes("CACHE_PREFIX='garang-app-shell-'"));assert.ok(sw.includes('html.matchAll(/(?:src|href)'),'service worker must precache exact versioned assets discovered from index');
console.log('post-login-app-boot: PASS');
