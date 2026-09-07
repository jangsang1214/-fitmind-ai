'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('01_app/app.js');
const files={brand:read('06_features/ui/runtime/garang-brand-runtime-v2.js'),polish:read('06_features/ui/runtime/garang-polish-v3.js'),shell:read('06_features/ui/runtime/garang-coach-home-hotfix.js'),agent:read('06_features/ui/runtime/garang-coach-agent-v4.js'),decision:read('06_features/ui/runtime/garang-coach-decision-v1.js'),profile:read('06_features/ui/runtime/garang-coach-profile-stability-v1.js'),item4:read('06_features/ui/runtime/garang-coach-item4-final.js'),privacy:read('06_features/ui/runtime/garang-privacy-security-v1.js'),exp3:read('06_features/ui/runtime/garang-experience-v3.js'),exp4:read('06_features/ui/runtime/garang-experience-v4.js')};
assert.ok(app.includes("emitLifecycle('garang:screen-rendered'"),'screen render lifecycle missing');
assert.ok(app.includes("emitLifecycle('garang:state-updated'"),'state lifecycle missing');
assert.ok(app.includes("emitLifecycle('garang:state-hydrated'"),'hydration lifecycle missing');
assert.equal(app.includes("state.syncState='synced';setSync('synced');render();"),false,'hydration must not rebuild active Coach');
for(const [name,src] of Object.entries(files)){
  assert.equal(/\.observe\(document\.body\s*,\s*\{[^}]*subtree\s*:\s*true/s.test(src),false,`${name} must not broadly observe body`);
  if(['shell','agent','decision','profile','item4','privacy','exp3'].includes(name)) assert.equal(/\.observe\(main\s*,\s*\{[^}]*subtree\s*:\s*true/s.test(src),false,`${name} must not broadly observe #main`);
}
assert.equal(files.privacy.includes('new MutationObserver'),false,'privacy Settings mounting must be lifecycle-owned, not observer-owned');
assert.equal(files.brand.includes('setTimeout(jump'),false,'Coach scroll owner must not schedule timeout cascades');
assert.equal(files.brand.includes('[32,80,160,320,600]'),false,'legacy repeated scroll cascade must be absent');
assert.equal(files.polish.includes('hardBottom'),false,'polish must not own Coach scrolling');
assert.equal(files.polish.includes('.g2-chat-scroll'),false,'polish must not touch Coach scroller');
for(const name of ['brand','shell','agent','decision','profile','item4','privacy','exp3','exp4']) assert.ok(files[name].includes('garang:screen-rendered')||files[name].includes('garang:coach-mounted'),`${name} must use lifecycle ownership`);
assert.ok(files.brand.includes('garang:coach-message-rendered'),'Coach owner must publish message lifecycle');
assert.ok(files.decision.includes('garang:coach-decision-rendered'),'Decision owner must publish card lifecycle');
console.log('runtime-lifecycle-contract: PASS');
