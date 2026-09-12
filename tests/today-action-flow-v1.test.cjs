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
 assert.equal(Flow.version,'garang-today-action-flow-v1.3.1');assert.equal(m.route,'planner');assert.equal(m.action,null);assert.match(m.headline,/방향/);assert.equal(JSON.stringify(state),before,'Today flow must be read-only');
 assert.equal(m.bodyEvidence,false);assert.equal(m.signalScore,0);assert.equal(m.tracks.length,3);assert.deepEqual(m.tracks.map(x=>x.domain),['training','recovery','nutrition']);assert.ok(m.tracks.every(x=>x.state==='empty'));
 const html=Flow.markup(m,false);assert.equal((html.match(/class="gtf-track"/g)||[]).length,3,'Today must expose one visual rail with three tracks');assert.match(html,/class="gtf-signal"/);assert.match(html,/data-garang-accumulation-symbol="1"/,'Today state must use GARANG accumulation symbol language');assert.match(html,/class="gtf-track-visual"/);assert.match(html,/GARANG의 판단/);assert.match(html,/오늘 ·/);assert.doesNotMatch(html,/>STATE ·/,'Korean Today should not lead with generic English UI labels');
}
{
 const state=base();state.planner=[{id:'p1',date,type:'workout',domain:'training',title:'상체 50분',completed:false},{id:'p2',date,type:'nutrition',domain:'nutrition',title:'단백질 목표 채우기',completed:true}];
 const m=model(state);assert.equal(m.planned,2);assert.equal(m.executed,1);assert.equal(m.remaining,1);assert.equal(m.route,'planner');assert.match(m.support,/상체 50분/);assert.equal(m.progress,50);assert.equal(m.signalScore,50);assert.equal(m.tracks.find(x=>x.domain==='training').value,'0%');assert.equal(m.tracks.find(x=>x.domain==='training').title,'상체 50분');assert.equal(m.tracks.find(x=>x.domain==='nutrition').value,'100%');assert.equal(m.tracks.find(x=>x.domain==='nutrition').title,'단백질 목표 채우기');
 const html=Flow.markup(m,false);assert.match(html,/상체 50분/);assert.match(html,/단백질 목표 채우기/);assert.match(html,/>0%<\/em>/);assert.match(html,/>100%<\/em>/);
}
{
 const state=base();state.meta.dailyPlanDrafts={[date]:{date,status:'draft',items:[{domain:'training',type:'workout',title:'상체 근력 45분'},{domain:'recovery',type:'recovery',title:'스트레칭 + 수면 준비 15분'},{domain:'nutrition',type:'nutrition',title:'단백질 목표 채우기'}]}};const m=model(state);assert.deepEqual(m.tracks.map(x=>x.state),['draft','draft','draft']);assert.ok(m.tracks.every(x=>x.value==='준비'));assert.deepEqual(m.tracks.map(x=>x.title),['상체 근력 45분','스트레칭 + 수면 준비 15분','단백질 목표 채우기']);
 const html=Flow.markup(m,false);assert.match(html,/상체 근력 45분/);assert.match(html,/스트레칭 \+ 수면 준비 15분/);assert.match(html,/단백질 목표 채우기/);assert.equal((html.match(/>준비<\/em>/g)||[]).length,3,'draft tracks should keep READY status as secondary information');
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
 const m=model(state),html=Flow.markup(m,false);assert.equal(m.route,'progress');assert.match(m.headline,/흐름/);assert.match(html,/data-gtf-details/);assert.match(html,/data-gtf-detail hidden/);assert.match(html,/GARANG/);assert.match(html,/data-body-evidence="0"/);assert.doesNotMatch(html,/신체 근거/);assert.doesNotMatch(html,/confidence|신뢰도/i,'technical confidence must stay out of Today default/detail layer');
}
{
 const state=base();state.planner=[{id:'p1',date,type:'nutrition',title:'식단',completed:true}];state.meals=[{id:'m1',date,kcal:2200,protein:120}];state.checkins=[{id:'c1',date,sleep:6.5,energy:3,soreness:5}];
 const m=model(state),html=Flow.markup(m,true);assert.equal(m.bodyEvidence,true,'high soreness must enable conditional body evidence');assert.match(html,/data-body-evidence="1"/);assert.match(html,/신체 근거/);assert.match(html,/신체 맵은 판단을 보조하는 근거/);
}
{
 const source=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-today-action-flow-v1.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'03_styles/runtime/garang-today-action-flow-v1.css'),'utf8');
 const polish=fs.readFileSync(path.join(root,'03_styles/runtime/garang-polish-v3.css'),'utf8');
 assert.doesNotMatch(source,/localStorage\.(?:setItem|removeItem)/,'Today flow must not write storage');assert.doesNotMatch(source,/applyWrite\s*\(/,'Today flow must not bypass existing confirmed write paths');assert.doesNotMatch(source,/MutationObserver/,'Today flow must remain lifecycle-driven');assert.match(source,/dataset\.gtfC/,'C direction must explicitly own the Today visual mode');assert.match(source,/gtf-track-visual/,'visual-first Today must keep the three domains glanceable without dashboard cards');assert.match(source,/track\.title\|\|track\.value/,'Today tracks must prefer a concrete plan action over status-only copy');
 assert.doesNotMatch(css,/conic-gradient/,'GARANG accumulation mark must not fall back to a generic wellness progress ring');assert.match(css,/gtf-strata-in/,'accumulation strata need restrained brand motion');assert.match(css,/border-radius:46% 54% 48% 52%\/40% 42% 58% 60%/,'state symbol must use an irregular moon-jar proportion rather than a generic circle');assert.match(css,/border-radius:10px 2px 10px 2px/,'track glyph containers must retain restrained asymmetric geometry');assert.match(css,/font-family:"Noto Sans KR",Inter/,'Korean Today hierarchy must be driven by Hangul typography before imported editorial Latin type');
 assert.match(polish,/--garang-meok:#080908/,'global Korean design system must define meok tone');assert.match(polish,/--garang-baekja:#f1ede4/,'global Korean design system must define baekja ivory');assert.match(polish,/--garang-cheongja:#78988c/,'global Korean design system must define muted cheongja accent');assert.match(polish,/section-title h2:before/,'section hierarchy must use restrained line rhythm rather than decorative motifs');assert.doesNotMatch(polish,/dancheong|taegeuk|hanbok|traditional-pattern/i,'Korean identity must not depend on literal folklore decoration');
}
console.log('today-action-flow-v1 GARANG Korean design system: PASS');