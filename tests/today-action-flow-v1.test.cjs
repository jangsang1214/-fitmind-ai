'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Flow=require('../06_features/ui/runtime/garang-today-action-flow-v1.js');
const PlanExecution=require('../02_core/plan-execution-v1.js');
const root=path.resolve(__dirname,'..');
const date=Flow.todayLocal();
function base(){return {meta:{schemaVersion:5},profile:{age:27,height:174,weight:70,gender:'male',goal:'근육 증가'},onboarding:{complete:true,goal:'근육 증가'},preferences:{language:'ko',unit:'metric'},planner:[],workouts:[],meals:[],runs:[],body:[],checkins:[],dailyCheckins:[],aiChat:[],actionLog:[],errors:[],analytics:{events:[]},memory:{entries:[],facts:[],preferences:[],goals:[],events:[]}};}
function model(state){return Flow.deriveModel(state,{date,lang:'ko',PlanExecution});}
{
 const state=base(),before=JSON.stringify(state),m=model(state);
 assert.equal(m.route,'planner');assert.equal(m.action,null);assert.match(m.headline,/방향/);assert.equal(JSON.stringify(state),before,'Today flow must be read-only');
 assert.equal(m.bodyEvidence,false);assert.equal(m.signalScore,0);
}
{
 const state=base();state.planner=[{id:'p1',date,type:'workout',title:'상체 50분',completed:false},{id:'p2',date,type:'nutrition',title:'식단',completed:true}];
 const m=model(state);assert.equal(m.planned,2);assert.equal(m.executed,1);assert.equal(m.remaining,1);assert.equal(m.route,'planner');assert.match(m.support,/상체 50분/);assert.equal(m.progress,50);assert.equal(m.signalScore,50);
}
{
 const state=base();state.planner=[{id:'p1',date,type:'workout',title:'상체',completed:true}];
 const m=model(state);assert.equal(m.route,'nutrition');assert.match(m.cta,/식단/);
}
{
 const state=base();state.planner=[{id:'p1',date,type:'nutrition',title:'식단',completed:true}];state.meals=[{id:'m1',date,kcal:2200,protein:120}];
 const m=model(state);assert.equal(m.route,null);assert.equal(m.action,'open-checkin');assert.match(m.rows.find(row=>row.key==='nutrition').value,/2,200 kcal/);
}
{
 const state=base();state.planner=[{id:'p1',date,type:'nutrition',title:'식단',completed:true}];state.meals=[{id:'m1',date,kcal:2200,protein:120}];state.checkins=[{id:'c1',date,sleep:7.5,energy:4,soreness:2}];
 const m=model(state),html=Flow.markup(m,false);assert.equal(m.route,'progress');assert.match(m.headline,/흐름/);assert.match(html,/data-gtf-details/);assert.match(html,/data-gtf-detail hidden/);assert.match(html,/GARANG/);assert.match(html,/data-body-evidence="0"/);assert.doesNotMatch(html,/BODY EVIDENCE/);assert.doesNotMatch(html,/confidence|신뢰도/i,'technical confidence must stay out of Today default/detail layer');
}
{
 const state=base();state.planner=[{id:'p1',date,type:'nutrition',title:'식단',completed:true}];state.meals=[{id:'m1',date,kcal:2200,protein:120}];state.checkins=[{id:'c1',date,sleep:6.5,energy:3,soreness:5}];
 const m=model(state),html=Flow.markup(m,true);assert.equal(m.bodyEvidence,true,'high soreness must enable conditional body evidence');assert.match(html,/data-body-evidence="1"/);assert.match(html,/BODY EVIDENCE/);assert.match(html,/신체 맵은 판단을 보조하는 근거/);
}
{
 const source=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-today-action-flow-v1.js'),'utf8');
 assert.doesNotMatch(source,/localStorage\.(?:setItem|removeItem)/,'Today flow must not write storage');
 assert.doesNotMatch(source,/applyWrite\s*\(/,'Today flow must not bypass existing confirmed write paths');
 assert.doesNotMatch(source,/MutationObserver/,'Today flow must remain lifecycle-driven');
 assert.match(source,/dataset\.gtfC/,'C direction must explicitly own the Today visual mode');
}
console.log('today-action-flow-v1 C-direction: PASS');
