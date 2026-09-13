/* GARANG unified intelligence bridge.
   Read-only orchestration over the frozen Agent State Bridge.
   It never mutates application state; proposed actions still require the existing
   confirmation/write path.
*/
(() => {
'use strict';
const Base=window.GarangAgentStateBridge;
const Core=window.GarangIntelligenceCore;
const Score=window.GarangPerformanceScore;
const Planner=window.GarangAdaptivePlanner;
const PlanAdaptation=window.GarangPlanAdaptation;
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
function requireReady(){if(!Base?.ready?.())throw new Error('AGENT_STATE_NOT_READY');if(!Core?.run)throw new Error('INTELLIGENCE_CORE_NOT_READY');return Base.getState();}
function ownerUid(){try{return String(window.firebase?.auth?.().currentUser?.uid||'').trim()||null;}catch{return null;}}
function run(query='',options={}){const state=requireReady();return Core.run(state,{query,ownerUid:ownerUid(),...options});}
window.GarangIntelligenceBridge=Object.freeze({
 ready:()=>!!Base?.ready?.()&&!!Core?.run,
 getIntelligence:(query='',options={})=>clone(run(query,options)),
 getContext:(query='',options={})=>clone(Core.compactForContext(run(query,options))),
 getPerformanceScore:(options={})=>{const state=requireReady();const userState=Base.getUserState?.()||null;return clone(Score.compute(state,{...options,userState}));},
 getAdaptivePlan:(options={})=>{const state=requireReady(),userState=Base.getUserState?.()||null,decision=Base.getDecision?.()||null,score=Score.compute(state,{...options,userState}),memoryContext=Base.getMemoryContext?.('',{limit:24,budgetChars:6000})||null;return clone(Planner.adaptWeek(state,{...options,userState,decision,score,memoryContext}));},
 getPlanAdaptation:(options={})=>{const state=requireReady();return clone(PlanAdaptation?.derive?.(state,options)||null);},
 getPlanAdaptationContext:(options={})=>{const state=requireReady(),value=PlanAdaptation?.derive?.(state,options)||null;return clone(PlanAdaptation?.compactForContext?.(value)||value);},
 getWeeklyReview:(options={})=>{const state=requireReady();return clone(PlanAdaptation?.weeklyReview?.(state,options)||null);},
 getWeeklyReviewContext:(options={})=>{const state=requireReady(),value=PlanAdaptation?.weeklyReview?.(state,options)||null;return clone(PlanAdaptation?.compactWeeklyReview?.(value)||value);},
 getDiagnostics:(options={})=>clone(Core.diagnostics(requireReady(),{ownerUid:ownerUid(),...options}))
});
})();
