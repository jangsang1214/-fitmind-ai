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
const planner=read('06_features/ui/runtime/garang-plan-execution-ui-v1.js');
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

test('plan execution stays read-only over the frozen state bridge',()=>{
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

test('default planner UI is deliberately minimal and hides deep analytics',()=>{
  assert.match(ui,/gx-hero/);assert.match(ui,/gx-timeline/);assert.match(ui,/gx-summary-row/);assert.match(ui,/gx-insight/);
  assert.match(ui,/data-gx-details/);assert.match(ui,/dropletIcon\('\+'\)/);assert.match(ui,/role="dialog"/);
  assert.doesNotMatch(ui,/gx-score-pair/);assert.doesNotMatch(ui,/gx-ring/);assert.doesNotMatch(ui,/gx-status-row/);assert.doesNotMatch(ui,/gx-week-grid/);
  assert.match(css,/\.gx-drop-button/);assert.match(css,/\.gx-detail-sheet/);assert.match(css,/\.gx-summary-row/);
  assert.match(css,/#main\[data-garang-screen="planner"\]>\.page-head h1\{display:none\}/,'Planner keeps the small kicker but must not render the large page title');
});

test('goal-fit feature follows the premium accumulation hierarchy',()=>{
  assert.ok(coreLoop.indexOf('gcl-accum-metrics')<coreLoop.lastIndexOf('goalHtml'));
});

test('planner premium shell keeps goal fit compact inside droplet details',()=>{
  assert.match(planner,/GarangGoalAlignment/);
  assert.match(planner,/gx-detail-goal-fit/);
  assert.match(planner,/goalRows/);
  assert.doesNotMatch(planner,/ACT \/ 행동/);
});

test('deep goal evidence remains available behind the droplet detail control',()=>{
  assert.match(ui,/goalAlignment/);assert.match(ui,/calorieTarget/);assert.match(ui,/proteinTarget/);assert.match(ui,/confidence/);
  assert.match(ui,/4주 누적|4-week accumulation/);assert.match(ui,/planItems/);assert.match(ui,/accumulationRows/);
  assert.match(ui,/aria-expanded="false"/);assert.match(ui,/Escape/);
});

test('mobile execution UI stays bounded and bottom sheet is safe-area aware',()=>{
  assert.match(css,/@media\(max-width:360px\)/);assert.match(css,/minmax\(0,1fr\)/);assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/max-height:82svh/);assert.match(css,/body\.gx-sheet-open\{[^}]*overflow-y:hidden!important/);
});

test('planner week strip is ordered Monday through Sunday',()=>{
  assert.match(ui,/function mondayOf\(date\)/);
  assert.match(ui,/function calendarWeekRows\(state,endDate\)/);
  assert.match(ui,/Array\.from\(\{length:7\},\(_,index\)=>Core\.daily\(state,Core\.dateAdd\(monday,index\)\)\)/);
  assert.match(ui,/rows:calendarWeekRows\(state,today\)/);
});

console.log(`${tests.length} plan execution UI tests passed`);
