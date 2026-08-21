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
    if(engine.__v99UnifiedPatched)return;
    engine.__v99UnifiedPatched=true;
    const base=engine.ask;
    const wrapped=q=>integratedAsk(q,base);
    engine.ask=wrapped;
    window.GARANGIntegratedAI={
      version:'9.9.1-unified',
      ask:wrapped,
      needsExternalSearch:needsSearch,
      todayState:()=>{try{return engine.todayUnifiedState?.()||todayState()}catch{return{}}},
      context:unifiedState
    };
    window.garangAsk=async q=>{const i=$('chatInput');if(i){i.value=q;$('chatForm')?.requestSubmit();}};
  }


  function unifiedUIStyle(){
 if($('garangUnifiedUIStyle'))return;
 const st=document.createElement('style');st.id='garangUnifiedUIStyle';st.textContent=`
  #v99UnifiedPanel{margin:10px 0 14px}
  #v99UnifiedPanel .uaiHero{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;border:1px solid #292c34;border-radius:22px;background:linear-gradient(145deg,#111216,#15161b)}
  #v99UnifiedPanel h3{margin:4px 0 5px;font-size:21px;color:#f5f5f7}
  #v99UnifiedPanel p{margin:0;color:#8d929c;font-size:12px;line-height:1.5}
  #v99UnifiedPanel .uaiBadge{padding:6px 9px;border-radius:999px;background:#20222a;color:#c6a8ff;font-size:10px;font-weight:900;white-space:nowrap}
  #v99UnifiedPanel .uaiState{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}
  #v99UnifiedPanel .uaiPill{padding:7px 9px;border:1px solid #292c34;border-radius:999px;background:#101115;color:#a9adb6;font-size:10px}
  #v99UnifiedPanel .uaiPill b{color:#eee;margin-right:4px}
  #v99UnifiedPanel .uaiHint{margin-top:9px;color:#666b75;font-size:10px}
  @media(max-width:650px){#v99UnifiedPanel .uaiHero{padding:15px}#v99UnifiedPanel h3{font-size:19px}.uaiBadge{display:none!important}}
 `;document.head.appendChild(st);
}
function buildUnifiedAIUI(){
 const page=$('chat');if(!page)return;
 page.querySelector('.coachQuick')?.remove();page.querySelector('.coachInsight')?.remove();
 const title=page.querySelector('.pageTitle');if(!title)return;
 const h=title.querySelector('h2');if(h)h.textContent='개인 AI';
 const p=title.querySelector('p');if(p)p.textContent='질문 하나로 내 기록·오늘 상태·기억·학습·외부 지식을 자동으로 연결합니다.';
 const panel=$('v99UnifiedPanel');if(!panel)return;
 const st=unifiedState(''),mem=st.memory||{},today=st.today||{},learn=st.learning||{};
 const memoryCount=(mem.facts?.length||0)+(mem.preferences?.length||0)+(mem.goals?.length||0);
 const learningCount=learn.learning?.events||learn.recent?.length||0;
 panel.innerHTML=`<div class="uaiHero"><div><span class="eyebrow">GARANG UNIFIED INTELLIGENCE</span><h3>하나의 AI가 전부 판단합니다</h3><p>로컬 코치·오늘의 상태·장기 기억·학습·외부 지식을 필요할 때 자동으로 조합합니다.</p></div><span class="uaiBadge">AUTO</span></div><div class="uaiState"><span class="uaiPill"><b>기록</b>${(today.workouts?.length||0)+(today.meals?.length||0)} 오늘</span><span class="uaiPill"><b>기억</b>${memoryCount}</span><span class="uaiPill"><b>학습</b>${learningCount}</span><span class="uaiPill"><b>검색</b>필요할 때 자동</span></div><div class="uaiHint">내부 기능은 AI가 알아서 선택합니다. 사용자는 질문만 하면 됩니다.</div>`;
 const attach=$('chatAttachBtn'),file=$('chatFile');if(attach&&file&&!attach.dataset.bound){attach.dataset.bound='1';attach.onclick=()=>file.click();file.onchange=()=>{if(file.files?.[0]){const f=file.files[0];const input=$('chatInput');if(input)input.value=`[첨부: ${f.name}] `+input.value;}}}
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
