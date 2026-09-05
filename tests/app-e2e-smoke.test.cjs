'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'runtime-manifest.json'),'utf8'));
const app=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'02_core/sw-runtime.js'),'utf8');
const requiredScripts=['02_core/data-schema.js','02_core/sync-durability.js','02_core/privacy-security.js','06_features/ui/runtime/garang-sync-durability-v1.js','01_app/app.js','06_features/ui/runtime/garang-privacy-security-v1.js'];
for(const file of requiredScripts){assert.ok(manifest.scripts.includes(file),`manifest missing ${file}`);assert.ok(html.includes('./'+file),`index missing ${file}`);assert.ok(sw.includes('./'+file),`service worker missing ${file}`);}
const indexOf=file=>html.indexOf('./'+file);
assert.ok(indexOf('02_core/sync-durability.js')<indexOf('01_app/app.js'),'sync core must load before app');
assert.ok(indexOf('02_core/privacy-security.js')<indexOf('01_app/app.js'),'privacy core must load before app');
for(const route of ['today','coach','log','progress','workout','nutrition','running','body','planner','memory','profile','settings','onboarding'])assert.ok(app.includes(`${route}:`),`route handler missing ${route}`);
for(const id of ['syncBadge','settingsTopBtn','profileTopBtn','logoutBtn','mediaPicker','mealScanPicker','bodyScanPicker'])assert.match(html,new RegExp(`id=["']${id}["']`),`shell id missing ${id}`);
const privacy=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-privacy-security-v1.js'),'utf8');
for(const token of ['privacyGlobalLearning','privacyAnalytics','savePrivacyConsent','deleteAccountSecure','reauthenticateWithCredential','reauthenticateWithPopup'])assert.ok(privacy.includes(token),token);
console.log('app-e2e-smoke: PASS');
