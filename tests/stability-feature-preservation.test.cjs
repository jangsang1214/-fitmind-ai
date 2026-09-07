'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const html=read('index.html');
const app=read('01_app/app.js');
const manifest=JSON.parse(read('runtime-manifest.json'));
const agent=read('06_features/final/agent-state-hook-v1.js');
const coach=read('06_features/ui/runtime/garang-brand-runtime-v2.js');
const decision=read('06_features/ui/runtime/garang-coach-decision-v1.js');
const recovery=read('06_features/ui/runtime/garang-data-migration-v2.js');
const settings=read('06_features/ui/runtime/garang-settings-touch-safety-v1.js');

for(const route of ['today','coach','workout','body','progress']){
  assert.ok(html.includes(`data-page="${route}"`),`bottom navigation route must remain: ${route}`);
}
for(const id of ['menuBtn','syncBadge','settingsTopBtn','profileTopBtn','logoutBtn','main','bottomNav']){
  assert.ok(html.includes(`id="${id}"`),`global control must remain: ${id}`);
}
for(const file of [
  '01_app/app.js',
  '06_features/final/agent-state-hook-v1.js',
  '06_features/ui/runtime/garang-data-migration-v2.js',
  '06_features/ui/runtime/garang-settings-touch-safety-v1.js',
  '06_features/ui/runtime/garang-brand-runtime-v2.js',
  '06_features/ui/runtime/garang-coach-agent-v4.js',
  '06_features/ui/runtime/garang-coach-decision-v1.js',
  '06_features/ui/runtime/garang-coach-item4-final.js'
]){
  assert.ok(manifest.scripts.includes(file),`runtime manifest must retain ${file}`);
}
for(const token of [
  "$('settingsTopBtn').onclick=()=>go('settings')",
  "$('profileTopBtn').onclick=()=>go('profile')",
  "function cloudLoadAndMerge()",
  "function saveState(",
  "function go(page)",
  "function render()"
])assert.ok(app.includes(token),`core app behavior contract missing: ${token}`);

for(const token of ['createPlan','updatePlan','saveMemory','deleteRecord','updateGoal']){
  assert.ok(agent.includes(`case '${token}'`),`Agent write capability must remain: ${token}`);
}
assert.ok(agent.includes("garang_user_${uid}_v3"),'authenticated Agent storage must remain account-pinned');

for(const token of ['g2-send','g2-new-chat','g2-mobile-threads','g2-thread-list','garang_coach_threads_v2::']){
  assert.ok(coach.includes(token),`Coach capability must remain: ${token}`);
}
assert.ok(decision.includes('garang-decision-toggle'),'GARANG decision disclosure must remain');
assert.ok(decision.includes('garang-decision-action'),'GARANG decision plan action must remain');

for(const token of ['scanData','restoreReport','data-recovery-rescan','data-recovery-export','data-recovery-restore']){
  assert.ok(recovery.includes(token),`data recovery capability must remain: ${token}`);
}
assert.ok(settings.includes('GarangSettingsTouchSafety'),'Settings mobile safety contract must remain');

for(const picker of ['mediaPicker','mealScanPicker','bodyScanPicker']){
  assert.ok(html.includes(`id="${picker}"`),`media/data input must remain: ${picker}`);
}

console.log('stability-feature-preservation: PASS');
