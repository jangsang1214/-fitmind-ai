'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const manifest=JSON.parse(read('runtime-manifest.json'));
const ui=read('06_features/ui/runtime/garang-plan-execution-ui-v1.js');
const coreLoop=read('06_features/ui/runtime/garang-core-loop-v1.js');
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

test('the canonical accumulation surface has one explicit owner',()=>{
  assert.equal(manifest.runtimeContract.singleOwners.accumulationSurface,'06_features/ui/runtime/garang-plan-execution-ui-v1.js');
  assert.match(ui,/function buildAccumulation\(state\)/);
  assert.match(ui,/id='garangAccumulationOverview'/);
  assert.doesNotMatch(coreLoop,/gcl-accum-metrics/,'Core Loop must not paint a second accumulation surface');
  assert.match(coreLoop,/function enhanceAccumulation\(\)/);
});

test('plan execution stays read-only over the frozen state bridge',()=>{
  assert.match(ui,/GarangAgentStateBridge/);assert.match(ui,/Bridge\.ready\(\)\?Bridge\.getState\(\)/);
  assert.doesNotMatch(ui,/Bridge\.getLiveState\(/);assert.doesNotMatch(ui,/Bridge\.applyWrite\(/);
  assert.doesNotMatch(ui,/localStorage\./);assert.doesNotMatch(ui,/sessionStorage\./);
});

test('planner and accumulation are enhanced without taking screen ownership',()=>{
  assert.match(ui,/currentScreen==='planner'/);assert.match(ui,/currentScreen==='progress'/);
  assert.match(ui,/garang:screen-rendered/);assert.doesNotMatch(ui,/innerHTML\s*=\s*buildPlanner\(/);
  assert.equal(manifest.runtimeContract.singleOwners.screenRender,'01_app/app.js');
  assert.equal(manifest.runtimeContract.singleOwners.featureRouting,'06_features/ui/runtime/garang-router-v1.js');
});

test('default surfaces separate plan execution from recording rhythm',()=>{
  assert.match(ui,/data-gx-summary-kind="\$\{planner\?'plan':'recording'\}"/);
  assert.match(ui,/data-gx-day-kind="\$\{recording\?'recording':'plan'\}"/);
  assert.match(ui,/\$\{c\.today\} \$\{recorded\} \/ 4 \$\{c\.signals\}/);
  assert.match(ui,/\$\{c\.today\} \$\{day\.plan\.executed\} \/ \$\{day\.plan\.planned\}/);
  assert.doesNotMatch(ui,/오늘 \$\{done\} \/ \$\{rows\.length\} .*완료/);
});

test('goal fit is quiet by default and evidence stays behind the droplet',()=>{
  assert.match(ui,/GarangGoalAlignment/);assert.match(ui,/function goalDetails\(goal,c,lang\)/);assert.match(ui,/gx-detail-domains/);
  assert.match(ui,/data-gx-details/);assert.match(ui,/dropletIcon\('\+'\)/);assert.match(ui,/role="dialog"/);
  assert.match(ui,/data-gx-open-planner/);assert.match(ui,/data-gx-plan-slot/);
  assert.doesNotMatch(ui,/ACT \/ 행동/);
  assert.doesNotMatch(ui,/gx-score-pair/);assert.doesNotMatch(ui,/gx-ring/);assert.doesNotMatch(ui,/gx-status-row/);assert.doesNotMatch(ui,/gx-week-grid/);
});

test('first-record CTA uses the canonical route and opens the real Record sheet',()=>{
  assert.match(ui,/data-gcl-first-record/);assert.match(ui,/afterRoute\('log'/);assert.match(ui,/GarangSimplifiedShell\?\.openRecordSheet/);
  assert.match(coreLoop,/data-gcl-first-record/,'the legacy handler remains as a compatibility fallback');
});

test('Planner composer is moved into the droplet and the duplicate Agent Write card is hidden',()=>{
  assert.match(ui,/function movePlannerComposer\(panel,main\)/);assert.match(ui,/slot=panel\.querySelector\('\[data-gx-plan-slot\]'\)/);
  assert.match(ui,/agent\.hidden=true/);assert.match(ui,/restorePlannerComposer/);
  assert.match(css,/\.gx-plan-slot \.card\{margin:0;padding:0;background:transparent;border:0;box-shadow:none\}/);
  assert.match(css,/\.gx-plan-slot input,\.gx-plan-slot select,\.gx-plan-slot textarea\{display:block;width:100%/);
});

test('mobile execution UI stays bounded and bottom sheet is safe-area aware',()=>{
  assert.match(css,/@media\(max-width:360px\)/);assert.match(css,/minmax\(0,1fr\)/);assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/max-height:82svh/);assert.match(css,/body\.gx-sheet-open\{[^}]*overflow-y:hidden!important/);
  assert.match(css,/@media\(max-width:560px\)/,'the moved date/time fields must collapse before they can overflow');
});

test('progress uses its own accumulation builder instead of reusing the Planner layer',()=>{
  assert.match(ui,/currentScreen==='progress'/);assert.match(ui,/const panel=buildAccumulation\(s\)/);
  assert.doesNotMatch(ui,/currentScreen==='progress'[\s\S]*const panel=buildPlanner\(s\)/);
  assert.doesNotMatch(ui,/data-gx-planner-shell/);
});

test('planner week strip is ordered Monday through Sunday',()=>{
  assert.match(ui,/function mondayOf\(date\)/);
  assert.match(ui,/function calendarWeekRows\(state,endDate\)/);
  assert.match(ui,/Array\.from\(\{length:7\},\(_,index\)=>Core\.daily\(state,Core\.dateAdd\(monday,index\)\)\)/);
  assert.match(ui,/rows=calendarWeekRows\(state,endDate\)/);
});

test('cache keys identify the truth-surface release',()=>{
  assert.match(index,/garang-plan-execution-v1\.css\?v=1\.1\.0-truth-surface/);
  assert.match(index,/garang-plan-execution-ui-v1\.js\?v=1\.1\.0-truth-surface/);
  assert.match(index,/garang-core-loop-v1\.js\?v=1\.1\.1-no-duplicate-accumulation/);
});

console.log(`${tests.length} plan execution UI tests passed`);
