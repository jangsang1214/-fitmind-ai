/* GARANG unified intelligence bridge.
   Read-only orchestration over the frozen Agent State Bridge.
   It never mutates application state; proposed actions still require the existing
   confirmation/write path. User Performance context is exposed only as confidence-gated
   read-only evidence and does not enter deterministic Decision Intelligence.
*/
(() => {
'use strict';
const Base=window.GarangAgentStateBridge;
const Core=window.GarangIntelligenceCore;
const Score=window.GarangPerformanceScore;
const Planner=window.GarangAdaptivePlanner;
const PlanAdaptation=window.GarangPlanAdaptation;
const UserPerformance=window.GarangUserPerformanceModelV1;
const Learning=window.GarangIntelligenceLearningContractV1;
const PlanExecution=window.GarangPlanExecution;
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
function requireReady(){if(!Base?.ready?.())throw new Error('AGENT_STATE_NOT_READY');if(!Core?.run)throw new Error('INTELLIGENCE_CORE_NOT_READY');return Base.getState();}
function requireUserPerformance(){if(!UserPerformance?.build||!UserPerformance?.compactForContext)throw new Error('USER_PERFORMANCE_MODEL_NOT_READY');return UserPerformance;}
function requireLearning(){if(!Learning?.buildGraph||!PlanExecution?.daily)throw new Error('INTELLIGENCE_LEARNING_CONTRACT_NOT_READY');return Learning;}
function ownerUid(){try{return String(window.firebase?.auth?.().currentUser?.uid||'').trim()||null;}catch{return null;}}
function run(query='',options={}){const state=requireReady();return Core.run(state,{query,ownerUid:ownerUid(),...options});}
function userPerformanceModel(options={}){const state=requireReady(),model=requireUserPerformance(),learning=requireLearning(),input=options&&typeof options==='object'?options:{},candidate=input.asOf instanceof Date?input.asOf:(input.asOf?new Date(input.asOf):new Date()),asOf=Number.isFinite(candidate.getTime())?candidate:new Date(),days=Math.max(7,Math.min(56,Number(input.days)||28)),learningGraph=learning.buildGraph(state,{planExecution:PlanExecution,now:asOf,days});return model.build(state,{...input,asOf,days,learningGraph});}
function userPerformanceContext(options={}){const model=requireUserPerformance(),input=options&&typeof options==='object'?options:{},buildOptions={...input};delete buildOptions.minConfidence;return model.compactForContext(userPerformanceModel(buildOptions),{minConfidence:input.minConfidence});}
window.GarangIntelligenceBridge=Object.freeze({
 ready:()=>!!Base?.ready?.()&&!!Core?.run,
 userPerformanceReady:()=>!!Base?.ready?.()&&!!UserPerformance?.build&&!!UserPerformance?.compactForContext&&!!Learning?.buildGraph&&!!PlanExecution?.daily,
 getIntelligence:(query='',options={})=>clone(run(query,options)),
 getContext:(query='',options={})=>clone(Core.compactForContext(run(query,options))),
 getPerformanceScore:(options={})=>{const state=requireReady();const userState=Base.getUserState?.()||null;return clone(Score.compute(state,{...options,userState}));},
 getAdaptivePlan:(options={})=>{const state=requireReady(),userState=Base.getUserState?.()||null,decision=Base.getDecision?.()||null,score=Score.compute(state,{...options,userState}),memoryContext=Base.getMemoryContext?.('',{limit:24,budgetChars:6000})||null;return clone(Planner.adaptWeek(state,{...options,userState,decision,score,memoryContext}));},
 getPlanAdaptation:(options={})=>{const state=requireReady();return clone(PlanAdaptation?.derive?.(state,options)||null);},
 getPlanAdaptationContext:(options={})=>{const state=requireReady(),value=PlanAdaptation?.derive?.(state,options)||null;return clone(PlanAdaptation?.compactForContext?.(value)||value);},
 getWeeklyReview:(options={})=>{const state=requireReady();return clone(PlanAdaptation?.weeklyReview?.(state,options)||null);},
 getWeeklyReviewContext:(options={})=>{const state=requireReady(),value=PlanAdaptation?.weeklyReview?.(state,options)||null;return clone(PlanAdaptation?.compactWeeklyReview?.(value)||value);},
 getUserPerformanceModel:(options={})=>clone(userPerformanceModel(options)),
 getUserPerformanceContext:(options={})=>clone(userPerformanceContext(options)),
 getDiagnostics:(options={})=>clone(Core.diagnostics(requireReady(),{ownerUid:ownerUid(),...options}))
});
})();
