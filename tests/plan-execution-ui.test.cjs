'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const manifest=JSON.parse(read('runtime-manifest.json'));
const ui=read('06_features/ui/runtime/garang-plan-execution-ui-v1.js');
const css=read('03_styles/runtime/garang-plan-execution-v1.css');
const tests=[];
const test=(name,fn)=>{fn();tests.push(name);console.log(`PASS ${name}`);};

test('plan execution core boots before its UI and matches runtime manifest',()=>{
  const core='02_core/plan-execution-v1.js',screen='06_features/ui/runtime/garang-plan-execution-ui-v1.js',style='03_styles/runtime/garang-plan-execution-v1.css';
  assert.ok(manifest.scripts.includes(core));assert.ok(manifest.scripts.includes(screen));assert.ok(manifest.styles.includes(style));
  assert.ok(manifest.scripts.indexOf(core)<manifest.scripts.indexOf(screen));
  assert.ok(index.indexOf('plan-execution-v1.js')<index.indexOf('garang-plan-execution-ui-v1.js'));
  assert.ok(index.includes('garang-plan-execution-v1.css'));
});

test('preview layer stays read-only over the frozen state bridge',()=>{
  assert.match(ui,/GarangAgentStateBridge/);assert.match(ui,/Bridge\.getState\(\)/);
  assert.doesNotMatch(ui,/Bridge\.getLiveState\(/);assert.doesNotMatch(ui,/Bridge\.applyWrite\(/);
  assert.doesNotMatch(ui,/localStorage\./);assert.doesNotMatch(ui,/sessionStorage\./);
});

test('planner and progress are enhanced without taking screen ownership',()=>{
  assert.match(ui,/currentScreen==='planner'/);assert.match(ui,/currentScreen==='progress'/);
  assert.match(ui,/garang:screen-rendered/);assert.doesNotMatch(ui,/innerHTML\s*=\s*buildPlanner\(/);
  assert.equal(manifest.runtimeContract.singleOwners.screenRender,'01_app/app.js');
  assert.equal(manifest.runtimeContract.singleOwners.featureRouting,'06_features/ui/runtime/garang-router-v1.js');
});

test('execution and goal alignment remain visibly separate',()=>{
  assert.match(ui,/ring\(day\.plan\.rate,c\.plan\)/);assert.match(ui,/ring\(day\.goalAlignment,c\.goal\)/);
  assert.match(ui,/calorieTarget/);assert.match(ui,/protein/);
});

test('mobile execution UI keeps narrow layouts bounded',()=>{
  assert.match(css,/@media\(max-width:360px\)/);assert.match(css,/minmax\(0,1fr\)/);assert.match(css,/overflow-x:auto/);
});

console.log(`${tests.length} plan execution UI tests passed`);
