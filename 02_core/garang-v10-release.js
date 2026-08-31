/* GARANG V10 RELEASE LAYER
   - Activates the already-present V9.9 global/unified engines in a deterministic order.
   - Adds a single entitlement model for Free/Pro.
   - Captures global onboarding preferences at account creation.
   - Does not replace the V9.9 data model or navigation.
*/
(function(){
  'use strict';
  const PLAN_KEY='garang_subscription_v10';
  const PREF_KEY='garang_v95_preferences';
  const DB_KEY='fitmind_v2';
  const PRO_FEATURES=new Set(['external_knowledge','long_term_memory','advanced_analysis','ai_planning','global_learning']);
  const FREE_AI_DAILY_LIMIT=25;

  const getDB=()=>{try{return window.__FitMindV6DB?window.__FitMindV6DB():JSON.parse(localStorage.getItem(DB_KEY)||'{}')}catch{return{}}};
  const saveDB=d=>{try{window.__FitMindV6Save?window.__FitMindV6Save():localStorage.setItem(DB_KEY,JSON.stringify(d))}catch{}};
  const prefs=()=>{try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}catch{return{}}};
  const savePrefs=p=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(p));document.documentElement.dataset.garangLanguage=p.language||'ko';document.documentElement.dataset.garangCountry=p.country||'KR';document.documentElement.dataset.garangUnit=p.unit||'metric'}catch{}};

  function currentPlan(){
    const d=getDB(), p=d.profile||{};
    try{
      const cloud=p.subscription?.plan||p.plan||localStorage.getItem(PLAN_KEY);
      return String(cloud||'free').toLowerCase()==='pro'?'pro':'free';
    }catch{return'free'}
  }
  function setPlan(plan){
    plan=String(plan||'free').toLowerCase()==='pro'?'pro':'free';
    localStorage.setItem(PLAN_KEY,plan);
    const d=getDB();d.profile=d.profile||{};d.profile.subscription=d.profile.subscription||{};
    d.profile.subscription.plan=plan;d.profile.subscription.source='local-entitlement';
    saveDB(d);renderPlanBadge();
  }
  function isPro(){return currentPlan()==='pro'}
  function can(feature){
    if(!PRO_FEATURES.has(feature))return true;
    return isPro();
  }
  function usageKey(){return 'garang_v10_ai_usage_'+new Date().toISOString().slice(0,10)}
  function aiAllowed(){
    if(isPro())return true;
    const n=Number(localStorage.getItem(usageKey())||0);
    return n<FREE_AI_DAILY_LIMIT;
  }
  function recordAI(){if(!isPro())localStorage.setItem(usageKey(),String(Number(localStorage.getItem(usageKey())||0)+1))}
  window.GARANGEntitlements={version:'10.0.0',plan:currentPlan,isPro,can,setPlan,aiAllowed,features:[...PRO_FEATURES]};

  function showPro(feature){
    let root=document.getElementById('v10EntitlementSheet');
    if(!root){
      root=document.createElement('div');root.id='v10EntitlementSheet';root.innerHTML='<div class="v10Sheet" role="dialog" aria-modal="true"><span class="v10-pro-badge">GARANG PRO</span><h3>더 깊은 개인화가 필요할 때</h3><p id="v10ProCopy">이 기능은 GARANG Pro에서 사용할 수 있습니다.</p><div class="v10SheetActions"><button type="button" id="v10ProClose">닫기</button><button type="button" class="primaryBtn" id="v10ProAction">Pro 알아보기</button></div></div>';
      document.body.appendChild(root);
      root.addEventListener('click',e=>{if(e.target===root||e.target.id==='v10ProClose')root.classList.remove('open')});
      root.querySelector('#v10ProAction').addEventListener('click',()=>{root.classList.remove('open');window.openPage?.('profile')});
    }
    const copy=root.querySelector('#v10ProCopy');
    const labels={external_knowledge:'최신 외부 지식을 자동으로 확인하는 AI 답변',long_term_memory:'장기 Memory를 활용한 고급 개인화',advanced_analysis:'고급 운동·식단·바디 분석',ai_planning:'AI 기반 장기 계획',global_learning:'Global Learning'};
    copy.textContent=(labels[feature]||'이 고급 기능')+'은(는) GARANG Pro에서 사용할 수 있습니다.';
    root.classList.add('open');
  }

  function captureSignupPreferences(){
    const p={country:document.getElementById('signupCountry')?.value||'KR',language:document.getElementById('signupLanguage')?.value||'ko',unit:document.getElementById('signupUnit')?.value||'metric'};
    savePrefs(p);
    const d=getDB();d.profile=d.profile||{};Object.assign(d.profile,p);d.preferences=p;d.profile.subscription=d.profile.subscription||{plan:'free'};saveDB(d);
  }

  function patchSignup(){
    const form=document.getElementById('signupForm');
    if(!form||form.dataset.v10Bound)return;
    form.dataset.v10Bound='1';
    form.addEventListener('submit',captureSignupPreferences,true);
  }

  function renderPlanBadge(){
    const btn=document.getElementById('accountBtn'); if(!btn)return;
    let badge=document.getElementById('v10PlanBadge');
    if(!badge){badge=document.createElement('span');badge.id='v10PlanBadge';btn.parentNode.insertBefore(badge,btn)}
    badge.className=isPro()?'v10-pro-badge':'v10-free-badge';
    badge.textContent=isPro()?'PRO':'FREE';
    badge.title=isPro()?'GARANG Pro':'GARANG Free';
  }

  function patchAI(){
    const engine=window.GARANGCoachEngine;
    if(!engine?.ask||engine.ask.__v10Wrapped)return;
    const original=engine.ask.bind(engine);
    const wrapped=async function(q){
      if(!aiAllowed()){showPro('advanced_analysis');throw new Error('GARANG_FREE_AI_LIMIT');}
      const useExternal=can('external_knowledge');
      const originalKnowledge=window.GARANGKnowledge;
      if(!useExternal && originalKnowledge){
        // Free keeps local coaching but does not trigger external retrieval.
        window.GARANGKnowledge={...originalKnowledge,needsExternalSearch:()=>false,search:undefined};
      }
      try{
        const result=await original(q);
        recordAI();
        return result;
      }finally{
        if(originalKnowledge)window.GARANGKnowledge=originalKnowledge;
      }
    };
    wrapped.__v10Wrapped=true;
    engine.ask=wrapped;
    if(window.GARANGIntegratedAI)window.GARANGIntegratedAI.ask=wrapped;
  }

  function installProControls(){
    document.querySelectorAll('[data-pro-feature]').forEach(el=>{
      const feature=el.dataset.proFeature;
      if(isPro()){el.removeAttribute('data-v10-locked');el.classList.remove('v10-locked');return}
      el.classList.add('v10-locked');el.setAttribute('data-v10-locked','1');
      if(el.dataset.v10Bound)return;
      el.dataset.v10Bound='1';
      el.addEventListener('click',e=>{if(!isPro()){e.preventDefault();e.stopImmediatePropagation();showPro(feature)}},true);
    });
  }

  function sync(){
    patchSignup();
    renderPlanBadge();
    patchAI();
    installProControls();
    // Preserve V9.9's own touch guard and make the active page the only interactive page.
    try{window.GARANGTouchGuard?.sync?.()}catch{}
  }

  document.addEventListener('DOMContentLoaded',()=>{
    sync();
    [100,400,1000,2000].forEach(t=>setTimeout(sync,t));
  });
  window.addEventListener('garang-auth-state',()=>setTimeout(sync,50));
  window.addEventListener('pageshow',sync);

  // Development-only helper; no visible UI unless called explicitly.
  window.GARANGV10={version:'10.0.0',status:'integrated-release-candidate',sync,setPlan,currentPlan};
})();