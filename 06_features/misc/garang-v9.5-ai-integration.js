/* GARANG V9.5 AI Intelligence Integration
   Local-first orchestration: personal state + Today Coach + learned knowledge.
   External search is triggered automatically when the existing Knowledge layer says it is needed.
   Search results are stored in Knowledge for reuse; this is retrieval learning, not model-weight training.
*/
(function(){
  'use strict';
  const KEY='fitmind_v2';
  const $=id=>document.getElementById(id);
  const getDB=()=>{try{return window.__FitMindV6DB?window.__FitMindV6DB():JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}};
  const save=()=>{try{window.__FitMindV6Save?window.__FitMindV6Save():localStorage.setItem(KEY,JSON.stringify(getDB()))}catch{}};
  const lang=()=>window.GARANGLocale?.language?.()||'ko';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function todayText(){
    const d=getDB(), m=d.coachMemory||{}, workouts=Array.isArray(d.workouts)?d.workouts:[], meals=Array.isArray(d.meals)?d.meals:[], body=Array.isArray(d.body)?d.body:[];
    const today=new Date().toISOString().slice(0,10);
    const tw=workouts.filter(x=>String(x.date||x.createdAt||'').slice(0,10)===today);
    const tm=meals.filter(x=>String(x.date||x.createdAt||'').slice(0,10)===today);
    const tb=body.filter(x=>String(x.date||x.createdAt||'').slice(0,10)===today).slice(-1)[0];
    const facts=(m.facts||[]).slice(-8), prefs=(m.preferences||[]).slice(-6), goals=(m.goals||[]).slice(-4);
    return {today,workouts:tw,meals:tm,body:tb||null,facts,prefs,goals,lastAdvice:m.lastAdvice||''};
  }
  function mergeKnowledge(q, base){
    let out=[];
    try{out=(window.GARANGKnowledge?.knowledgeContext?.(q)||[]).slice(0,6)}catch{}
    return [...base,...out].filter((x,i,a)=>x && a.findIndex(y=>(y.url||y.title)===(x.url||x.title))===i).slice(0,8);
  }
  async function integratedAsk(q, originalAsk){
    const needs=!!window.GARANGKnowledge?.needsExternalSearch?.(q);
    let knowledge=[];
    try{knowledge=window.GARANGKnowledge?.knowledgeContext?.(q)||[]}catch{}
    let searched=false;
    if(needs && window.GARANGKnowledge?.search){
      try{const r=await window.GARANGKnowledge.search(q);knowledge=mergeKnowledge(q,[...(r?.results||[]),...knowledge]);searched=!!r?.searched;}catch{}
    }
    const t=todayText();
    const base=await originalAsk(q);
    const evidence=knowledge.slice(0,4).map(x=>`- ${x.title} · ${x.source}${x.url?'\n  '+x.url:''}`).join('\n');
    const ko=lang()!=='en';
    const header=searched?(ko?'\n\n🔎 외부 지식을 확인했어.':'\n\n🔎 I checked external knowledge.'):'';
    const learn=knowledge.length?(ko?'\n\n📚 이 내용은 Knowledge에 저장되어 다음 코칭에서 재사용할 수 있어.':'\n\n📚 This knowledge is saved and can be reused in future coaching.') :'';
    const today= t.workouts.length||t.meals.length||t.body ? (ko?'\n\n오늘 데이터도 함께 반영했어.':'\n\nI also considered your data from today.') : '';
    const sources=evidence?(ko?'\n\n출처\n'+evidence:'\n\nSources\n'+evidence):'';
    return base+header+today+sources+learn;
  }
  window.GARANGIntegratedAI={version:'9.5.2',ask:integratedAsk,todayState:todayText};
  window.addEventListener('DOMContentLoaded',()=>{
    const engine=window.GARANGCoachEngine;
    if(!engine?.ask||window.__garangIntegratedPatched)return;
    window.__garangIntegratedPatched=true;
    const original=engine.ask;
    const wrapped=q=>integratedAsk(q,original);
    engine.ask=wrapped;
    window.garangAsk=async q=>{const input=$('chatInput');if(input){input.value=q;$('chatForm')?.requestSubmit();}};
  });
})();
