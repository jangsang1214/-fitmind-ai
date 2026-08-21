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
  async function integratedAsk(q,baseAsk){
    const english=lang()==='en'; let ks=knowledge(q),searched=false;
    if(needsSearch(q)&&window.GARANGKnowledge?.search){
      try{const r=await window.GARANGKnowledge.search(q);const fresh=r?.results||[];ks=[...fresh,...ks].filter((x,i,a)=>x&&(x.url||x.title)&&a.findIndex(y=>(y.url||y.title)===(x.url||x.title))===i).slice(0,8);searched=!!r?.searched}catch(e){console.warn('[GARANG V9.9] external search failed',e)}
    }
    const base=await baseAsk(q);
    const t=todayState();
    const hasToday=t.workouts?.length||t.meals?.length||t.body;
    let out=base;
    if(hasToday) out += english?'\n\nToday Coach context: your current-day workout, nutrition and body state are included in this answer.':'\n\n오늘의 코칭 맥락: 오늘 운동·식단·바디 상태를 함께 반영했어.';
    if(searched) out += english?'\n\nI checked external knowledge automatically because this question benefits from current evidence.':'\n\n🔎 이 질문은 최신/근거 자료가 필요한 내용이라 외부 지식을 자동으로 확인했어.';
    if(ks.length) out += fmtSources(ks,english);
    if(ks.length){
      try{window.GARANGKnowledge.learn({topic:q,query:q,title:english?'GARANG AI learned context':'GARANG AI 학습 컨텍스트',summary:ks.slice(0,5).map(x=>x.summary||x.title).join(' | '),source:'GARANG Integrated Knowledge',url:ks[0]?.url||'',confidence:'medium',tags:['v9.9','ai-integrated']})}catch{}
      out += english?'\n\n📚 The relevant knowledge has been stored for future retrieval.':'\n\n📚 관련 지식은 다음 질문에서 다시 활용할 수 있도록 저장했어.';
    }
    return out;
  }
  function patchAI(){
    const engine=window.GARANGCoachEngine;if(!engine?.ask)return;
    if(engine.__v99Patched)return;engine.__v99Patched=true;
    const base=engine.ask;
    const wrapped=q=>integratedAsk(q,base);
    engine.ask=wrapped;window.GARANGIntegratedAI={version:'9.9.0',ask:wrapped,needsExternalSearch:needsSearch,todayState};
    window.garangAsk=async q=>{const i=$('chatInput');if(i){i.value=q;$('chatForm')?.requestSubmit()}};
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

  function boot(){setupStyle();bindAuthSetup();patchAI();touchGuard();setTimeout(patchAI,250);setTimeout(patchAI,1000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
