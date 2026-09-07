'use strict';
const assert=require('node:assert/strict');
const Memory=require('../02_core/memory-intelligence-v1.js');
const State=require('../02_core/state-intelligence-v1.js');
const Decision=require('../02_core/decision-intelligence-v1.js');
const Score=require('../02_core/performance-score-v1.js');
const Planner=require('../02_core/adaptive-planner-v1.js');
const Core=require('../02_core/intelligence-core-v1.js');
const AgentContract=require('../06_features/final/agent-contract-v1.js');
let passed=0;
const test=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`);};
const testNow=()=>new Date('2026-09-08T12:00:00+09:00');
const date=delta=>{const d=new Date('2026-09-08T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);};
function fixture(){
 const workouts=Array.from({length:12},(_,i)=>({id:`w${i}`,sessionId:`s${i}`,date:date(-i*2),duration:55,rpe:7,sets:4,reps:8,weight:70,name:'Bench'}));
 const meals=[];for(let i=0;i<10;i++){meals.push({id:`m${i}a`,date:date(-i),protein:70,kcal:900,name:'meal'});meals.push({id:`m${i}b`,date:date(-i),protein:55,kcal:800,name:'meal'});}
 const dailyCheckins=Array.from({length:5},(_,i)=>({id:`c${i}`,date:date(-i),sleepHours:8,energy:4,stress:2,soreness:{general:2},painCaution:false,availableMinutes:60}));
 const body=[0,-7,-14].map((d,i)=>({id:`b${i}`,date:date(d),weight:70+i*.2,bodyFat:12,muscle:35}));
 return {profile:{goal:'muscle gain',weight:70},userModel:{goal:'muscle gain',weeklyFrequency:4,availableMinutes:60},workouts,meals,runs:[],body,planner:[],dailyCheckins,memory:{entries:[{id:'mem1',memoryClass:'preference',type:'preference',key:'training_time',value:'evening training',source:'user',confidence:1,importance:4,userConfirmed:true,createdAt:'2026-09-01T00:00:00Z',updatedAt:'2026-09-01T00:00:00Z'}],deletedIds:[]}};
}

test('performance score is explainable and exposes all component contracts',()=>{
 const s=fixture(),now=testNow(),u=State.estimateState(s,{now}),x=Score.compute(s,{now,userState:u});
 assert.equal(x.engineVersion,'performance-score-v1');assert.ok(Number.isFinite(x.score));assert.ok(x.score>=0&&x.score<=100);assert.ok(x.confidence>0&&x.confidence<=1);
 for(const key of ['workout','recovery','nutrition','activity','body']){assert.ok(key in x.components);assert.ok('confidence' in x.components[key]);assert.ok('evidence' in x.components[key]);}
 assert.ok('yesterday' in x.deltas);assert.ok('weekly' in x.deltas);assert.ok(Array.isArray(x.changeReasons));assert.equal(x.missingData.scoreImpact,0);
});

test('missing domains reduce confidence rather than fabricate bad component scores',()=>{
 const s={profile:{goal:'maintenance'},userModel:{weeklyFrequency:3},workouts:[{id:'w',sessionId:'s',date:date(0),duration:45,rpe:7}],meals:[],runs:[],body:[],planner:[],dailyCheckins:[],memory:{entries:[],deletedIds:[]}},x=Score.compute(s,{now:testNow()});
 assert.ok(x.score!=null);assert.equal(x.components.nutrition.score,null);assert.equal(x.components.body.score,null);assert.ok(x.missingData.domains.includes('nutrition'));assert.ok(x.missingData.confidenceImpact<0);assert.equal(x.missingData.scoreImpact,0);
});

test('future records cannot improve the current score',()=>{
 const a=fixture(),b=JSON.parse(JSON.stringify(a));b.workouts.push({id:'future',sessionId:'future',date:'2027-01-01',duration:200,rpe:10});
 assert.equal(Score.compute(a,{now:testNow()}).score,Score.compute(b,{now:testNow()}).score);
});

test('pain caution blocks plan proposals and training intensity',()=>{
 const s=fixture(),now=testNow();s.dailyCheckins[0].painCaution=true;
 const memoryContext=Memory.prepareMemoryContext(s.memory,s,{now}),userState=State.estimateState(s,{now}),decision=Decision.decide(userState,{memoryContext}),score=Score.compute(s,{now,userState}),x=Planner.adaptWeek(s,{now,userState,decision,score,memoryContext});
 assert.equal(x.today.type,'recovery');assert.equal(x.today.intensityScale,0);assert.equal(x.actionProposal,null);assert.equal(x.guardrails.painCautionBlocksIntensity,true);assert.equal(x.guardrails.cautionBlocksPlanProposal,true);
});

test('zero available minutes is preserved and blocks a plan proposal',()=>{
 const s=fixture(),now=testNow();s.dailyCheckins[0].availableMinutes=0;
 const userState=State.estimateState(s,{now}),score=Score.compute(s,{now,userState}),x=Planner.adaptWeek(s,{now,userState,decision:{mode:'maintain',confidence:.8,reasonCodes:[],engineVersion:'decision-intelligence-v1'},score});
 assert.equal(x.today.constraints.availableMinutes,0);assert.equal(x.today.type,'rest');assert.equal(x.today.duration,0);assert.equal(x.actionProposal,null);assert.ok(x.today.reasonCodes.includes('NO_TIME_AVAILABLE'));
});

test('planner preserves completed existing plan and does not propose silent mutation',()=>{
 const s=fixture(),now=testNow();s.planner=[{id:'locked',date:date(0),time:'18:30',title:'Completed Lower',type:'lower',done:true,origin:'user'}];
 const x=Planner.adaptWeek(s,{now,userState:State.estimateState(s,{now}),decision:{mode:'maintain',confidence:.8,reasonCodes:[]},score:Score.compute(s,{now})});
 assert.equal(x.today.locked,true);assert.equal(x.today.existingId,'locked');assert.equal(x.actionProposal,null);assert.equal(x.guardrails.noSilentMutation,true);
});

test('ranked memory preferences and avoidances become planner constraints',()=>{
 const s=fixture(),now=testNow();s.memory.entries.push({id:'mem2',memoryClass:'preference',type:'avoidance',key:'avoid_high_impact',value:'high impact running',source:'user',confidence:1,importance:5,userConfirmed:true,createdAt:'2026-09-02T00:00:00Z',updatedAt:'2026-09-02T00:00:00Z'});
 const memoryContext=Memory.prepareMemoryContext(s.memory,s,{now,query:'training'}),x=Planner.constraints(s,memoryContext,now);
 assert.ok(x.preferences.includes('evening training'));assert.ok(x.avoidances.includes('high impact running'));
});

test('normal planner action proposal passes the frozen Agent contract',()=>{
 const s=fixture(),now=testNow(),userState=State.estimateState(s,{now}),score=Score.compute(s,{now,userState}),x=Planner.adaptWeek(s,{now,userState,decision:{mode:'maintain',confidence:.8,reasonCodes:[],engineVersion:'decision-intelligence-v1'},score});
 assert.ok(x.actionProposal);const normalized=AgentContract.normalizeToolCall(x.actionProposal,{idFactory:()=> 'planner_action'});assert.equal(normalized.tool,'createPlan');assert.equal(normalized.requiresConfirmation,true);assert.ok(normalized.args.intensityScale>=.3);
});

test('unified core follows raw data to action pipeline without mutating source state',()=>{
 const s=fixture(),before=JSON.stringify(s),x=Core.run(s,{now:testNow(),query:'training'});
 assert.deepEqual([...x.pipeline],['rawData','userState','analysis','decision','recommendation','action']);assert.equal(x.engineVersion,'garang-intelligence-core-v1');assert.ok(x.memory.entries.some(row=>row.id==='mem1'));assert.ok(x.analysis.performanceScore.score!=null);assert.ok(x.decision?.mode);assert.ok(x.recommendation?.summary?.today);assert.equal(x.guardrails.llmIsExplanationLayer,true);assert.equal(JSON.stringify(s),before);
});

test('compact intelligence context keeps score decision planner and ranked memory',()=>{
 const x=Core.run(fixture(),{now:testNow(),query:'training'}),c=Core.compactForContext(x);assert.ok(c.memory.entries.length);assert.ok(c.analysis.performanceScore.score!=null);assert.ok(c.decision.mode);assert.ok(c.recommendation.today);assert.equal(c.guardrails.requiresConfirmation,true);
});

console.log(`${passed} unified intelligence tests passed`);