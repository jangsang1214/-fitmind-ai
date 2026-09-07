'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const runtime=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-coach-decision-v1.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.ok(runtime.includes("VERSION='garang-coach-decision-v1.3'"),'compact Coach decision runtime v1.3 must be active');
assert.ok(runtime.includes('garang-decision-toggle'),'decision must use a compact toggle row');
assert.ok(runtime.includes('aria-expanded'),'decision detail disclosure must be accessible');
assert.ok(runtime.includes('garang-decision-details')&&runtime.includes('[hidden]{display:none!important}'),'details must be collapsed by default');
assert.ok(runtime.includes('height:44px!important'),'mobile decision strip must stay compact');
assert.ok(runtime.includes('min-height:0!important')&&runtime.includes('height:auto!important'),'decision container must resist inherited oversized card heights');
assert.ok(runtime.includes('garang-has-decision-card')&&runtime.includes('grid-template-rows:auto auto minmax(0,1fr) auto!important'),'decision card must own its own grid row instead of consuming the chat 1fr track');
assert.ok(runtime.includes("card.dataset.expanded='false'"),'new decision cards must start collapsed');
assert.ok(runtime.includes("input.value='오늘 계획을 만들어줘'"),'plan proposal action must remain wired through the existing Coach flow');
assert.equal(runtime.includes('>+</'),false,'ambiguous plus-only decision action must not return');
assert.ok(html.includes('garang-coach-decision-v1.js?v=1.3.1-hydration-continuity'),'index must load the hydration-continuity Coach decision asset');
console.log('coach-decision-compact-ui: PASS');
