const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const runtime=read('06_features/ui/runtime/garang-collapsible-intelligence-ui-v1.js');
const index=read('index.html');
const workoutUI=read('06_features/ui/runtime/garang-workout-intelligence-ui-v1.js');
const decisionUI=read('06_features/ui/runtime/garang-coach-decision-v1.js');

const tests=[];
function test(name,fn){fn();tests.push(name);console.log('PASS',name);}

test('Daily Workout becomes compact by default and can expand/collapse again',()=>{
  assert.match(workoutUI,/garang-daily-workout/);
  assert.match(runtime,/enhanceDaily/);
  assert.match(runtime,/readOpen\('daily',false\)/);
  assert.match(runtime,/gci-collapse-body/);
  assert.match(runtime,/간소화/);
  assert.match(runtime,/더보기/);
});

test('set-by-set entry keeps native reversible details behavior with visible plus/minus state',()=>{
  assert.match(workoutUI,/garang-set-builder/);
  assert.match(runtime,/enhanceSets/);
  assert.match(runtime,/details\.open=readOpen\('sets',false\)/);
  assert.match(runtime,/details\.open\?'−':'\+'/);
  assert.match(runtime,/addEventListener\('toggle'/);
});

test('Coach decision data is compact by default but all existing decision content stays in the expandable body',()=>{
  assert.match(decisionUI,/garang-decision-summary/);
  assert.match(decisionUI,/garang-decision-signals/);
  assert.match(decisionUI,/garang-decision-foot/);
  assert.match(runtime,/enhanceDecision/);
  assert.match(runtime,/readOpen\('decision',false\)/);
  assert.match(runtime,/wrapAfter\(card,head\)/);
});

test('expanded state is session-scoped and does not mutate GARANG application data',()=>{
  assert.match(runtime,/sessionStorage\.getItem\(STORE_PREFIX\+key\)/);
  assert.match(runtime,/sessionStorage\.setItem\(STORE_PREFIX\+key/);
  assert.doesNotMatch(runtime,/localStorage\.setItem/);
  assert.doesNotMatch(runtime,/GarangAgentStateBridge\.applyWrite/);
});

test('collapsible enhancement loads after Workout Intelligence and Coach Decision runtimes',()=>{
  const workout=index.indexOf('garang-workout-intelligence-ui-v1.js');
  const decision=index.indexOf('garang-coach-decision-v1.js');
  const compact=index.indexOf('garang-collapsible-intelligence-ui-v1.js');
  assert.ok(workout>=0&&decision>=0&&compact>=0);
  assert.ok(compact>workout);
  assert.ok(compact>decision);
});

console.log(`${tests.length} collapsible intelligence UI tests passed`);
