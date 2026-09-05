'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Browser=require('../02_core/state-intelligence-v1.js');
const Server=require('../functions/src/state-intelligence.cjs');
const root=path.resolve(__dirname,'..'),now=new Date('2026-09-06T12:00:00Z');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
const d=n=>new Date(now.getTime()+n*86400000).toISOString().slice(0,10);
function fixture(){
 const workouts=[];for(const offset of [-34,-31,-27,-24,-20,-17,-13,-10])workouts.push({id:`w${offset}`,sessionId:`s${offset}`,date:d(offset),duration:40,rpe:5,volume:3000});
 for(const offset of [-6,-4,-2,-1])workouts.push({id:`h${offset}`,sessionId:`hs${offset}`,date:d(offset),duration:75,rpe:9,volume:7000});
 const dailyCheckins=[-3,-2,-1].map((offset,i)=>({id:`c${offset}`,date:d(offset),sleepHours:5.2+i*.1,energy:2,stress:4,soreness:{legs:4},painCaution:false}));
 const body=[{id:'b1',date:d(-21),weight:72},{id:'b2',date:d(-10),weight:68.5},{id:'b3',date:d(-1),weight:65}];
 const runs=[{id:'r1',date:d(-5),duration:40,distance:7},{id:'r2',date:d(-2),duration:50,distance:9}];
 const meals=[-6,-5,-4,-3,-2,-1].map(offset=>({id:`m${offset}`,date:d(offset),kcal:2200,protein:150}));
 return {profile:{goal:'10K under 45 minutes'},userModel:{goal:'10K under 45 minutes'},workouts,runs,meals,body,dailyCheckins,planner:[],memory:{entries:[]}};
}
test('browser and server state engines are deterministic and identical',()=>{const state=fixture(),a=Browser.estimateState(state,{now}),b=Server.estimateState(state,{now});assert.deepEqual(a,b);assert.equal(a.engineVersion,'state-intelligence-v1');});
test('high recent load versus baseline is detected without hidden model inference',()=>{const s=Browser.estimateState(fixture(),{now});assert.equal(s.load.band,'spike');assert.ok(s.load.ratio>=1.5);assert.ok(s.patterns.some(p=>p.id==='training_load_spike'));});
test('short sleep plus low energy and high stress creates explainable fatigue patterns',()=>{const s=Browser.estimateState(fixture(),{now});assert.ok(s.patterns.some(p=>p.id==='sleep_debt'));assert.ok(s.patterns.some(p=>p.id==='fatigue_cluster'));assert.ok(s.readiness.reasons.includes('LOW_ENERGY'));assert.ok(s.readiness.reasons.includes('SHORT_SLEEP'));});
test('missing data never fabricates readiness or fatigue numbers',()=>{const s=Browser.estimateState({workouts:[],runs:[],meals:[],body:[],dailyCheckins:[]},{now});assert.equal(s.readiness.value,null);assert.equal(s.fatigue.score,null);assert.equal(s.confidence,0);assert.equal(s.coverage.score,0);});
test('future records are ignored',()=>{const state=fixture(),base=Browser.estimateState(state,{now});state.workouts.push({id:'future',sessionId:'future',date:d(5),duration:500,rpe:10,volume:999999});const after=Browser.estimateState(state,{now});assert.deepEqual(after.load,base.load);assert.equal(after.diagnostics.futureRecordsExcluded,true);});
test('running goal alignment uses actual recent running evidence',()=>{const s=Browser.estimateState(fixture(),{now});assert.equal(s.goalAlignment.goal,'10K under 45 minutes');assert.ok(s.goalAlignment.score>0);assert.ok(s.goalAlignment.confidence>0);});
test('body trend uses measurements only and keeps sample count',()=>{const s=Browser.estimateState(fixture(),{now});assert.equal(s.trends.bodyWeight.direction,'down');assert.equal(s.trends.bodyWeight.count,3);});
test('live Agent and Coach are wired to compact user state context',()=>{const bridge=fs.readFileSync(path.join(root,'06_features/final/agent-state-hook-v1.js'),'utf8'),coach=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-coach-agent-v4.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');for(const token of ['getUserState','getUserStateContext','getUserStateDiagnostics'])assert.ok(bridge.includes(token),token);assert.ok(coach.includes('context.userState=Bridge.getUserStateContext()'));assert.ok(html.indexOf('./02_core/state-intelligence-v1.js')<html.indexOf('./06_features/final/agent-state-hook-v1.js'));});
console.log(`${passed} state intelligence tests passed`);
