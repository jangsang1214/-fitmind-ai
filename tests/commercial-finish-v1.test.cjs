'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const css=read('03_styles/runtime/garang-experience-v4.css');
const index=read('index.html');
const manifest=JSON.parse(read('runtime-manifest.json'));

const tests=[];
const test=(name,fn)=>{fn();tests.push(name);console.log(`PASS ${name}`);};

test('commercial experience layer remains active before the physical app-shell owner',()=>{
  const experience='03_styles/runtime/garang-experience-v4.css';
  const shell='03_styles/runtime/garang-app-shell-v1.css';
  assert.ok(manifest.styles.includes(experience),'commercial experience stylesheet must stay in runtime manifest');
  assert.ok(manifest.styles.includes(shell),'app-shell owner must stay in runtime manifest');
  assert.ok(manifest.styles.indexOf(experience)<manifest.styles.indexOf(shell),'app-shell geometry owner must load after experience polish');
  assert.ok(index.indexOf('garang-experience-v4.css')<index.indexOf('garang-app-shell-v1.css'),'index load order must match runtime ownership');
});

test('keyboard focus has one visible design-system ring',()=>{
  assert.match(css,/:where\(button,input,select,textarea,a,\[tabindex\]\):focus-visible/);
  assert.match(css,/outline:2px solid var\(--garang-focus\)!important/);
  assert.match(css,/--garang-focus:#baa16f/);
});

test('WebKit form focus fallback cannot be suppressed by legacy outline reset',()=>{
  assert.match(css,/#appView :where\(input,select,textarea\):focus/);
  assert.match(css,/#authView :where\(input,select,textarea\):focus/);
  assert.match(css,/outline:2px solid var\(--garang-focus\)!important/);
});

test('disabled and busy controls expose deterministic interaction states',()=>{
  assert.match(css,/:where\(button,input,select,textarea\):disabled/);
  assert.match(css,/\[aria-disabled="true"\]/);
  assert.match(css,/\[aria-busy="true"\]/);
  assert.match(css,/pointer-events:none!important/);
});

test('mobile form controls prevent iOS focus zoom without changing desktop density',()=>{
  assert.match(css,/@media\(max-width:799px\)/);
  assert.match(css,/:where\(input:not\(\[type="range"\]\),select,textarea\)\{font-size:16px!important\}/);
});

test('coarse-pointer primary actions use a 44px minimum touch contract',()=>{
  assert.match(css,/--garang-touch-min:44px/);
  assert.match(css,/@media\(pointer:coarse\)/);
  assert.match(css,/min-height:var\(--garang-touch-min\)/);
  assert.doesNotMatch(css,/\*\s*\{[^}]*min-height:var\(--garang-touch-min\)/s,'touch target rule must not inflate every element');
});

test('reduced-motion users bypass legacy and current animation layers',()=>{
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/animation-duration:\.001ms!important/);
  assert.match(css,/transition-duration:\.001ms!important/);
});

test('long user content cannot create horizontal viewport overflow',()=>{
  assert.match(css,/overflow-wrap:anywhere/);
  assert.match(css,/word-break:break-word/);
});

test('higher contrast remains inside the GARANG token system',()=>{
  assert.match(css,/@media\(prefers-contrast:more\)/);
  assert.match(css,/--line:#4b4740/);
  assert.match(css,/--muted:#b4ada4/);
});

test('commercial polish does not replace frozen runtime ownership',()=>{
  assert.equal(manifest.runtimeContract.status,'frozen');
  assert.equal(manifest.runtimeContract.singleOwners.screenRender,'01_app/app.js');
  assert.equal(manifest.runtimeContract.singleOwners.featureRouting,'06_features/ui/runtime/garang-router-v1.js');
  assert.equal(manifest.runtimeContract.singleOwners.coachDom,'06_features/ui/runtime/garang-brand-runtime-v2.js');
});

console.log(`${tests.length} commercial finish tests passed`);
