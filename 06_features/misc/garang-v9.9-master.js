/* GARANG V9.9 MASTER
   Global onboarding + integrated local intelligence + touch regression guard.
   V10 remains the server-LLM layer. This file is additive and loaded last.
*/
(function(){
  'use strict';
  const PREF='garang_v95_preferences';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const lang=()=>window.GARANGLocale?.language?.()||'ko';
  const prefs=()=>{try{const x=JSON.parse(localStorage.getItem(PREF)||'{}');return {country:x.country||'KR',language:x.language||'ko',unit:x.unit||'metric'}}catch{return{country:'KR',language:'ko',unit:'metric'}}};
  const savePrefs=p=>{localStorage.setItem(PREF,JSON.stringify(p));try{window.GARANGLocale?.set?.(p)}catch{};document.documentElement.dataset.garangLanguage=p.language;document.documentElement.dataset.garangUnit=p.unit;document.documentElement.dataset.garangCountry=p.country};

  /* ---------- Global account setup ---------- */
  function setupStyle(){
    if($('garangV99Style')) return;
    const st=document.createElement('style'); st.id='garangV99Style';
    st.textContent=`
      #garangV99Setup{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.72);backdrop-filter:blur(10px);touch-action:auto}
      #garangV99Setup.open{display:flex}
      #garangV99Setup .sheet{width:min(520px,100%);max-height:92vh;overflow:auto;background:#101114;color:#fff;border:1px solid #2b2d33;border-radius:26px;padding:22px;box-sizing:border-box;box-shadow:0 24px 80px rgba(0,0,0,.45)}
      #garangV99Setup h2{margin:4px 0 7px;font-size:27px}#garangV99Setup p{color:#969aa4;font-size:13px;line-height:1.5}
      #garangV99Setup .grid{display:grid;gap:12px;margin:18px 0}#garangV99Setup label{display:grid;gap:6px;color:#aaa;font-size:12px;font-weight:800}
      #garangV99Setup select{width:100%;box-sizing:border-box;padding:13px;border-radius:13px;border:1px solid #343740;background:#181a1f;color:#fff;font-size:15px;touch-action:manipulation;pointer-events:auto}
      #garangV99Setup button{width:100%;padding:14px;border:0;border-radius:14px;background:#fff;color:#111;font-weight:900;font-size:15px;touch-action:manipulation;pointer-events:auto}
      #garangV99Setup .hint{font-size:11px;color:#777b84;margin-top:9px}
      .garangV99-searching{opacity:.7;pointer-events:none!important}
    `;document.head.appendChild(st);
  }
  function getDb(){try{return window.__FitMindV6DB?window.__FitMindV6DB():window.db||{}}catch{return window.db||{}}}
  function saveDb(){try{if(window.__FitMindV6Save)window.__FitMindV6Save();else if(window.db)localStorage.setItem('fitmind_v2',JSON.stringify(window.db))}catch{}}
  async function cloudPrefs(p){
    try{
      const u=window.firebase?.auth?.()?.currentUser; const fs=window.firebase?.firestore?.();
      if(u&&fs) await fs.collection('users').doc(u.uid).set({profile:{language:p.language,country:p.country,unit:p.unit},preferences:p},{merge:true});
    }catch(e){console.warn('[GARANG V9.9] preference cloud sync skipped',e)}
  }
  function openSetup(force=false){
    setupStyle(); let root=$('garangV99Setup');
    if(!root){
      root=document.createElement('div');root.id='garangV99Setup';root.setAttribute('aria-modal','true');
      root.innerHTML=`<div class="sheet"><span class="eyebrow">GARANG SETUP</span><h2>나에게 맞게 시작하기</h2><p>국가, 언어, 단위를 선택하면 GARANG 전체에 적용됩니다. Google/Apple/이메일 로그인 방식과는 독립적인 설정입니다.</p><div class="grid"><label>국가 / 지역<select id="v99Country"><option value="KR">🇰🇷 대한민국</option><option value="US">🇺🇸 United States</option><option value="JP">🇯🇵 日本</option><option value="GB">🇬🇧 United Kingdom</option><option value="CA">🇨🇦 Canada</option><option value="AU">🇦🇺 Australia</option><option value="DE">🇩🇪 Deutschland</option><option value="FR">🇫🇷 France</option><option value="SG">🇸🇬 Singapore</option><option value="OTHER">Other</option></select></label><label>언어<select id="v99Language"><option value="ko">한국어</option><option value="en">English</option></select></label><label>단위<select id="v99Unit"><option value="metric">Metric · kg / cm</option><option value="imperial">Imperial · lb / in</option></select></label></div><button type="button" id="v99SavePrefs">설정 저장하고 시작하기</button><div class="hint">국가·언어·단위는 나중에 프로필에서 변경할 수 있도록 확장할 수 있습니다.</div></div>`;
      document.body.appendChild(root);
      const p=prefs();$('v99Country').value=p.country;$('v99Language').value=p.language;$('v99Unit').value=p.unit;
      $('v99SavePrefs').addEventListener('click',async()=>{
        const b=$('v99SavePrefs');b.classList.add('garangV99-searching');b.textContent=lang()==='en'?'Saving…':'저장 중…';
        const np={country:$('v99Country').value,language:$('v99Language').value,unit:$('v99Unit').value};
        savePrefs(np);
        const d=getDb();d.profile=d.profile&&typeof d.profile==='object'?d.profile:{};Object.assign(d.profile,np);d.preferences=np;saveDb();await cloudPrefs(np);
        root.classList.remove('open');b.classList.remove('garangV99-searching');b.textContent='설정 저장하고 시작하기';
        try{window.openPage?.(d.profile.name?'dashboard':'profile')}catch{}
      });
    }
    root.classList.add('open');
  }
  function needsSetup(){
    const p=prefs(),d=getDb(),dp=d.profile||{};
    return !dp.country || !dp.language || !dp.unit;
  }
  function bindAuthSetup(){
    if(window.firebase?.auth){
      try{window.firebase.auth().onAuthStateChanged(user=>{if(user&&needsSetup())setTimeout(()=>openSetup(true),120)})}catch{}
    }
    window.addEventListener('garang-auth-state',e=>{if(e.detail?.user&&needsSetup())setTimeout(()=>openSetup(true),120)});
    document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{if(document.documentElement.dataset.authenticated==='true'&&needsSetup())openSetup(true)},500));
  }

  /* ---------- Integrated intelligence ---------- */
  const casual=/^(안녕|하이|ㅎㅇ|반가|고마워|감사|ㅋㅋ+|ㅎㅎ+|hi|hello|hey|thanks|thank you|good morning|good night|good evening)[!,.? ]*$/i;
  const factual=/(왜|뭐야|무엇|어떻게|어떤|얼마|몇|차이|추천|근거|연구|논문|최신|최근|효과|원인|방법|가이드|통계|정보|알려줘|찾아|검색|what|why|how|which|when|where|who|how much|how many|recommend|research|study|evidence|latest|recent|effective|guideline|statistics|information)/i;
  const needsSearch=q=>{
    const s=String(q||'').trim(); if(!s||casual.test(s))return false;
    if(window.GARANGKnowledge?.needsExternalSearch?.(s))return true;
    if(/[?？]/.test(s)&&factual.test(s))return true;
    return factual.test(s)&&s.length>12;
  };
  function todayState(){try{return window.GARANGIntegratedAI?.todayState?.()||{}}catch{return{}}}
  function knowledge(q){try{return window.GARANGKnowledge?.knowledgeContext?.(q)||[]}catch{return[]}}
  function fmtSources(items,english){
    const list=items.slice(0,5); if(!list.length)return '';
    return '\n\n'+(english?'Sources checked':'확인한 출처')+'\n'+list.map((x,i)=>`${i+1}. ${x.title} — ${x.source}${x.url?'\n   '+x.url:''}`).join('\n');
  }
  function unifiedState(q){
    let local={}, today={}, memory={}, learning={}, knowledge=[];
    try{local=window.GARANGCoachEngine?.state?.()||{}}catch{}
    try{today=window.GARANGCoachEngine?.todayUnifiedState?.()||todayState()||{}}catch{}
    try{memory=getDb().coachMemory||{}}catch{}
    try{learning=window.GARANG_V93_LEARNING?.userState?.()||{}}catch{}
    try{knowledge=window.GARANGKnowledge?.knowledgeContext?.(q)||[]}catch{}
    return {local,today,memory,learning,knowledge};
  }
  async function integratedAsk(q,baseAsk){
    const english=lang()==='en', s=unifiedState(q);
    let ks=s.knowledge.slice(0,8),searched=false;
    if(needsSearch(q)&&window.GARANGKnowledge?.search){
      try{
        const r=await window.GARANGKnowledge.search(q);
        const fresh=r?.results||[];
        ks=[...fresh,...ks].filter((x,i,a)=>x&&(x.url||x.title)&&a.findIndex(y=>(y.url||y.title)===(x.url||x.title))===i).slice(0,8);
        searched=!!r?.searched;
      }catch(e){console.warn('[GARANG V9.9] external search failed',e)}
    }
    // The local coach remains the decision engine. Its context now includes
    // today's state + memory + learning state; external knowledge is an evidence layer.
    let out=await baseAsk(q);
    const hasToday=!!(s.today.workouts?.length||s.today.meals?.length||s.today.body);
    if(hasToday){
      const todayLine=english
        ? `\n\nToday integrated: ${s.today.workouts?.length||0} workouts · ${s.today.meals?.length||0} meals · ${Math.round(s.today.protein||0)}g protein.`
        : `\n\n오늘 통합 데이터: 운동 ${s.today.workouts?.length||0}개 · 식단 ${s.today.meals?.length||0}개 · 단백질 ${Math.round(s.today.protein||0)}g.`;
      out+=todayLine;
    }
    if(s.memory?.facts?.length||s.memory?.preferences?.length||s.memory?.goals?.length){
      out+=english
        ? `\n\nMemory integrated: ${s.memory.facts?.length||0} facts · ${s.memory.preferences?.length||0} preferences · ${s.memory.goals?.length||0} goals.`
        : `\n\n기억 통합: 사실 ${s.memory.facts?.length||0}개 · 선호 ${s.memory.preferences?.length||0}개 · 목표 ${s.memory.goals?.length||0}개.`;
    }
    if(searched) out += english
      ? '\n\n🔎 I checked external knowledge automatically and used it as evidence for this answer.'
      : '\n\n🔎 필요한 내용은 외부 지식을 자동 검색해서 근거로 함께 사용했어.';
    if(ks.length){
      const sources=ks.slice(0,4).map((x,i)=>`${i+1}. ${x.title||'Source'} — ${x.source||'External'}${x.url?'\n   '+x.url:''}`).join('\n');
      out += english?`\n\nSources\n${sources}`:`\n\n확인한 출처\n${sources}`;
      try{
        window.GARANGKnowledge?.learn?.({
          topic:q,query:q,
          title:english?'GARANG Unified AI learned context':'GARANG 통합 AI 학습 컨텍스트',
          summary:ks.slice(0,5).map(x=>x.summary||x.title).join(' | '),
          source:'GARANG Unified Intelligence',url:ks[0]?.url||'',
          confidence:'medium',tags:['v9.9','unified-ai','today-coach','local-coach','knowledge']
        });
      }catch{}
    }
    try{window.GARANG_V93_LEARNING?.record?.('ai_unified',{query:q,usedToday:hasToday,usedKnowledge:!!ks.length,usedMemory:true},{status:'success'})}catch{}
    return out;
  }
  function patchAI(){
    const engine=window.GARANGCoachEngine;if(!engine?.ask)return;
    window.GARANGIntegratedAI=window.GARANGIntegratedAI||{};
    window.GARANGIntegratedAI.version='9.9.2-unified-orchestrator';
    window.GARANGIntegratedAI.ask=engine.ask;
    window.GARANGIntegratedAI.needsExternalSearch=needsSearch;
    window.GARANGIntegratedAI.context=unifiedState;
    window.GARANGIntegratedAI.todayState=()=>{try{return engine.todayUnifiedState?.()||todayState()}catch{return{}}};
  }

  function unifiedUIStyle(){
    if($('garangUnifiedUIStyle'))return;
    const st=document.createElement('style');st.id='garangUnifiedUIStyle';st.textContent=`
      #v99UnifiedPanel .uaiLive{width:9px;height:9px;border-radius:50%;background:#a78bca;box-shadow:0 0 0 4px rgba(167,139,202,.09);flex:0 0 auto}
      #v99UnifiedPanel .uaiMini{display:flex;align-items:center;gap:7px;color:#858a95;font-size:10px}
      #v99UnifiedPanel .uaiContext{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
      #v99UnifiedPanel .uaiContext span{padding:6px 8px;border:1px solid #292c34;border-radius:999px;background:#101115;color:#8c919b;font-size:10px}
      #v99UnifiedPanel .uaiContext b{color:#e4e5e9;margin-right:3px}
      #v99UnifiedPanel .uaiSuggestions{display:flex;gap:7px;overflow:auto;margin-top:11px;padding-bottom:2px;scrollbar-width:none}
      #v99UnifiedPanel .uaiSuggestions::-webkit-scrollbar{display:none}
      #v99UnifiedPanel .uaiSuggestion{flex:0 0 auto;border:1px solid #2b2e36;background:#17191e;color:#d8d9de;border-radius:13px;padding:9px 11px;font-size:11px;font-weight:800;cursor:pointer;touch-action:manipulation}
      @media(max-width:650px){#v99UnifiedPanel .uaiContext{gap:5px}}
    `;document.head.appendChild(st);
  }
  function buildUnifiedAIUI(){
    const page=$('chat');if(!page)return;
    page.querySelector('#v95CoachBar')?.remove();
    const panel=$('v99UnifiedPanel');if(!panel)return;
    const st=unifiedState(''),mem=st.memory||{},today=st.today||{},learn=st.learning||{};
    const memoryCount=(mem.facts?.length||0)+(mem.preferences?.length||0)+(mem.goals?.length||0);
    const learningCount=learn.learning?.events||learn.recent?.length||0;
    const todayCount=(today.workouts?.length||0)+(today.meals?.length||0);
    panel.innerHTML=`
      <div class="uaiSurface">
        <div class="uaiRow">
          <div><div class="uaiTitle">GARANG가 지금 필요한 정보만 연결해요</div><div class="uaiSub">개인 기록 · 오늘 상태 · 기억 · 학습 · 외부 지식이 질문에 따라 자동으로 조합됩니다.</div></div>
          <div class="uaiMini"><span class="uaiLive"></span>자동 판단</div>
        </div>
        <div class="uaiContext">
          <span><b>오늘</b>${todayCount} 기록</span>
          <span><b>기억</b>${memoryCount}</span>
          <span><b>학습</b>${learningCount}</span>
          <span><b>검색</b>필요할 때 자동</span>
        </div>
        <div class="uaiSuggestions">
          <button class="uaiSuggestion" type="button" data-q="오늘 운동 뭐 할까?">오늘 운동 추천</button>
          <button class="uaiSuggestion" type="button" data-q="오늘 내 식단을 보고 단백질을 얼마나 더 먹어야 해?">오늘 식단 분석</button>
          <button class="uaiSuggestion" type="button" data-q="최근 기록을 보고 내 상태를 분석해줘">최근 상태 분석</button>
        </div>
      </div>`;
    panel.querySelectorAll('[data-q]').forEach(b=>b.addEventListener('click',()=>window.garangAsk?.(b.dataset.q)));
    const attach=$('chatAttachBtn'),file=$('chatFile');
    if(attach&&file&&!attach.dataset.bound){
      attach.dataset.bound='1';
      attach.addEventListener('click',()=>file.click());
      file.addEventListener('change',()=>{const f=file.files?.[0];if(!f)return;const input=$('chatInput');if(input){input.value=`[첨부: ${f.name}] `+input.value;input.focus()}});
    }
  }

function bootUnified(){
    setupStyle();unifiedUIStyle();bindAuthSetup();patchAI();
    setTimeout(patchAI,250);setTimeout(patchAI,1000);
    buildUnifiedAIUI();
    touchGuard();
  }

  /* ---------- Touch regression guard ---------- */
  function suppressFullscreenWhenAuth(){
    const auth=$('auth'); if(!auth?.classList.contains('active'))return;
    const all=document.body.querySelectorAll('*');
    all.forEach(el=>{
      if(el===auth||auth.contains(el))return;
      const cs=getComputedStyle(el); if(cs.position!=='fixed')return;
      const r=el.getBoundingClientRect(); const z=parseInt(cs.zIndex,10);
      if(r.width>=window.innerWidth*.9 && r.height>=window.innerHeight*.9 && (Number.isNaN(z)||z>=1000)){
        if(el.id==='garangV99Setup')return;
        el.dataset.garangSuppressed='1';el.style.setProperty('display','none','important');el.style.setProperty('pointer-events','none','important');
      }
    });
    auth.style.setProperty('z-index','2147482999','important');auth.style.setProperty('pointer-events','auto','important');
  }
  function touchGuard(){
    const run=()=>{suppressFullscreenWhenAuth();};
    run();
    setTimeout(run,100);
    setTimeout(run,500);
    window.addEventListener('pageshow',run);
  }

  function boot(){bootUnified();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
