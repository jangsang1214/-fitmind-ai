/* FitMind AI V6.0 — Cost-Controlled Cloud/Pro Router
   Front-end routing layer only. No API secret belongs in this file.
   Server endpoint is configured by the backend deployment, not hard-coded credentials.
*/
(function(){
"use strict";
const VERSION="6.0.0";
const DEFAULTS={
  plan:"free",
  endpoint:"/api/coach",
  monthlyCredits:100,
  remainingCredits:100,
  memorySync:true,
  serverAI:true
};
const state=Object.assign({},DEFAULTS,JSON.parse(localStorage.getItem("fitmind_plan_state")||"{}"));

const LOCAL_INTENTS=[
 /오늘.*(칼로리|섭취|단백질)/,/음식.*(칼로리|영양)/,/운동.*(기록|저장)/,
 /벤치|스쿼트|데드|루틴|세트|반복|RPE|RIR/i,/체중|체지방|골격근/,
 /BMR|기초대사|권장.*칼로리/i
];
const CLOUD_INTENTS=[
 /최근.*(한달|3개월|6개월|1년).*(분석|추세)/,
 /전체.*(운동|식단|기록).*(분석|종합)/,
 /내.*(패턴|습관|변화).*(분석|알려)/,
 /장기.*(목표|기억|코칭)/,
 /왜.*(정체|안.*늘|안.*빠)/,
 /내가.*(계속|요즘).*(어떤|어떻게)/
];

function isPro(){return String(state.plan).toLowerCase()==="pro"||String(state.plan).toLowerCase()==="pro_plus";}
function classify(text){
  const q=String(text||"");
  if(CLOUD_INTENTS.some(r=>r.test(q))) return "cloud";
  if(LOCAL_INTENTS.some(r=>r.test(q))) return "local";
  // Free users default local. Pro users get cloud only when it materially improves the answer.
  return isPro() ? "hybrid" : "local";
}
function costFor(mode){
  return mode==="cloud"?5:mode==="hybrid"?3:0;
}
function canSpend(cost){
  return isPro() && state.remainingCredits>=cost;
}
function consume(cost){
  if(cost>0){state.remainingCredits=Math.max(0,state.remainingCredits-cost);persist();}
}
function persist(){localStorage.setItem("fitmind_plan_state",JSON.stringify(state));}
async function cloudAnswer(text,context,mode){
  const cost=costFor(mode);
  if(!canSpend(cost)) return null;
  try{
    const res=await fetch(state.endpoint,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        version:VERSION,mode,query:String(text||""),
        context:context||{},plan:state.plan,
        // Server should receive compact summaries, not the entire raw history by default.
        requestedMemory:"relevant_only"
      })
    });
    if(!res.ok) throw new Error("cloud_http_"+res.status);
    const data=await res.json();
    consume(cost);
    return data;
  }catch(e){return null;}
}
function route(text,context,localFn){
  const mode=classify(text),cost=costFor(mode);
  if(mode==="local") return Promise.resolve(localFn(text,context));
  return cloudAnswer(text,context,mode).then(r=>r||localFn(text,context));
}
function setPlan(plan){
  state.plan=plan==="pro_plus"?"pro_plus":plan==="pro"?"pro":"free";
  if(state.plan==="free"){state.remainingCredits=0;state.monthlyCredits=0;}
  else if(!state.remainingCredits){state.monthlyCredits=100;state.remainingCredits=100;}
  persist();return getPlan();
}
function resetCredits(n){if(!isPro())return false;state.monthlyCredits=n||100;state.remainingCredits=state.monthlyCredits;persist();return true;}
function getPlan(){
  return {version:VERSION,plan:state.plan,remainingCredits:state.remainingCredits,
    monthlyCredits:state.monthlyCredits,isPro:isPro(),costPolicy:"local-first"};
}
window.FitMindCloud=Object.assign(window.FitMindCloud||{},{
  version:VERSION,classify,route,cloudAnswer,setPlan,resetCredits,getPlan
});
})();
