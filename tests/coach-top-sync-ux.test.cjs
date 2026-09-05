'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};

test('Coach decision renders at conversation top instead of being composer-owned',()=>{
 const source=read('06_features/ui/runtime/garang-coach-decision-v1.js');
 assert.ok(source.includes("root.querySelector('.g2-chat-head,.coach-app-head')"));
 assert.ok(source.includes("root.querySelector('.garang-decision-card')"));
 assert.ok(source.includes('head.parentNode.insertBefore(card,head.nextSibling)'));
 assert.equal(source.includes("wrap.querySelector('.garang-decision-card')"),false);
});

test('assistant GARANG avatar opens the existing read-only Coach detail panel',()=>{
 const source=read('06_features/ui/runtime/garang-coach-avatar-profile-v1.js');
 assert.ok(source.includes('.g2-message.assistant .g2-avatar'));
 assert.ok(source.includes('.gpt-message.assistant .gpt-avatar'));
 assert.ok(source.includes("root.querySelector('.gcp-profile-trigger')"));
 assert.ok(source.includes("avatar.addEventListener('click'"));
 assert.equal(/applyWrite\s*\(/.test(source),false);
 assert.equal(/localStorage\.setItem\s*\(/.test(source),false);
});

test('background cloud sync toast chatter is suppressed while manual sync feedback remains possible',()=>{
 const source=read('06_features/ui/runtime/garang-sync-quiet-ux-v1.js');
 assert.ok(source.includes("event.target?.closest?.('#syncBadge')"));
 assert.ok(source.includes('event.isTrusted'));
 assert.ok(source.includes('manualUntil'));
 for(const message of ['클라우드 동기화를 다시 확인합니다.','동기화가 완료되었습니다.','클라우드 연결을 확인 중입니다. 기록은 기기에 안전하게 저장됩니다.','클라우드 동기화는 백그라운드에서 다시 시도합니다.'])assert.ok(source.includes(message));
 assert.ok(source.includes("toast.classList.remove('show')"));
});

test('live shell, manifest and PWA cache include the new Coach and sync UX runtimes',()=>{
 const html=read('index.html'),manifest=read('runtime-manifest.json'),sw=read('02_core/sw-runtime.js');
 for(const file of ['garang-sync-quiet-ux-v1.js','garang-coach-avatar-profile-v1.js']){
  assert.ok(html.includes(file),`index ${file}`);assert.ok(manifest.includes(file),`manifest ${file}`);assert.ok(sw.includes(file),`sw ${file}`);
 }
 assert.ok(sw.includes('garang-coach-top-decision-sync-quiet-v1-20260906'));
});
console.log(`${passed} Coach top/sync UX tests passed`);
