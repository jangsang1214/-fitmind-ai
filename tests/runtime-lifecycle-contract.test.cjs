'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('01_app/app.js');
const files={
 router:read('06_features/ui/runtime/garang-router-v1.js'),
 brand:read('06_features/ui/runtime/garang-brand-runtime-v2.js'),
 polish:read('06_features/ui/runtime/garang-polish-v3.js'),
 shell:read('06_features/ui/runtime/garang-coach-shell-v1.js'),
 agent:read('06_features/ui/runtime/garang-coach-agent-v4.js'),
 decision:read('06_features/ui/runtime/garang-coach-decision-v1.js'),
 profile:read('06_features/ui/runtime/garang-coach-profile-v2.js'),
 privacy:read('06_features/ui/runtime/garang-privacy-security-v1.js'),
 today:read('06_features/ui/runtime/garang-today-anatomy-v1.js'),
 exp3:read('06_features/ui/runtime/garang-experience-v3.js'),
 exp4:read('06_features/ui/runtime/garang-experience-v4.js')
};
assert.ok(app.includes("emitLifecycle('garang:screen-rendered'"),'screen render lifecycle missing');
assert.ok(app.includes("emitLifecycle('garang:state-updated'"),'state lifecycle missing');
assert.ok(app.includes("emitLifecycle('garang:state-hydrated'"),'hydration lifecycle missing');
assert.equal(app.includes("state.syncState='synced';setSync('synced');render();"),false,'hydration must not rebuild active Coach');
for(const [name,src] of Object.entries(files)){
 assert.equal(/\.observe\(document\.body\s*,\s*\{[^}]*subtree\s*:\s*true/s.test(src),false,`${name} must not broadly observe body`);
 if(['shell','agent','decision','profile','privacy','today','exp3'].includes(name))assert.equal(/\.observe\(main\s*,\s*\{[^}]*subtree\s*:\s*true/s.test(src),false,`${name} must not broadly observe #main`);
}
assert.equal(files.privacy.includes('new MutationObserver'),false,'privacy Settings mounting must be lifecycle-owned, not observer-owned');
assert.equal(files.brand.includes('setTimeout(jump'),false,'Coach scroll owner must not schedule timeout cascades');
assert.equal(files.brand.includes('[32,80,160,320,600]'),false,'legacy repeated scroll cascade must be absent');
assert.equal(files.polish.includes('hardBottom'),false,'polish must not own Coach scrolling');
assert.equal(files.polish.includes('.g2-chat-scroll'),false,'polish must not touch Coach scroller');
for(const name of ['brand','shell','agent','decision','profile','privacy','today','exp3','exp4'])assert.ok(files[name].includes('garang:screen-rendered')||files[name].includes('garang:coach-mounted'),`${name} must use lifecycle ownership`);
assert.ok(files.brand.includes('garang:coach-message-rendered'),'Coach owner must publish message lifecycle');
assert.ok(files.decision.includes('garang:coach-decision-rendered'),'Decision owner must publish card lifecycle');
assert.ok(files.router.includes('window.GarangRouter'),'canonical router missing');
assert.ok(files.shell.includes("GarangRouter?.navigate"),'Coach shell must delegate routes');
assert.equal(files.shell.includes(".garang-decision-card"),false,'Coach shell must not own decision subtree');
assert.equal(files.shell.includes(".g4-prompt-strip"),false,'Coach shell must not own prompt subtree');
assert.equal(files.shell.includes(".g2-message-text"),false,'Coach shell must not own message subtree');
assert.ok(files.agent.includes("data-garang-prompt-id"),'Agent must own canonical prompts');
assert.equal(files.profile.includes('.garang-decision-signals'),false,'Coach profile must not rewrite decision subtree');
console.log('runtime-lifecycle-contract: PASS');
