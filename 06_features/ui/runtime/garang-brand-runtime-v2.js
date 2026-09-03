/* GARANG BRAND RUNTIME v2
   - exact GARANG mark uses the user-approved PNG asset
   - workout body model rendered from interactive SVG code
   - ChatGPT-like multi-thread Coach with stable latest-message scrolling
*/
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const uid = () => globalThis.crypto?.randomUUID ? crypto.randomUUID() : `g2_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const now = () => new Date().toISOString();
  const num = (v,f=0) => Number.isFinite(Number(v)) ? Number(v) : f;
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));

  function markPNG(className='garang-code-mark') {
    return `<img class="${className} garang-exact-logo" src="./05_assets/garang-logo-exact.png?v=exact-png-20260904" alt="GARANG" draggable="false">`;
  }

  function svgNode(html) {
    const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild;
  }

  function replaceBrandMarks(root=document) {
    root.querySelectorAll('img').forEach(img => {
      const src=img.getAttribute('src')||'';
      if (!/garang-(?:mark|app-icon)\.svg/i.test(src)) return;
      img.src='./05_assets/garang-logo-exact.png?v=exact-png-20260904';
      img.alt='GARANG';
      img.classList.add('garang-exact-logo');
    });
  }

  function bodySVG(side='front') {
    const isBack=side==='back';
    const common=`<path class="body-silhouette" d="M90 17C77 17 68 27 68 41c0 11 5 19 13 24L60 72c-11 4-18 14-22 29l-16 58 14 5 17-45 9-22-4 67-9 43-8 126h27l16-108h12l16 108h27l-8-126-9-43-4-67 9 22 17 45 14-5-16-58c-4-15-11-25-22-29l-21-7c8-5 13-13 13-24 0-14-9-24-22-24Z"/>
      <path class="body-edge" d="M90 18v315M67 41c0 10 7 21 23 24 16-3 23-14 23-24M55 78c10 9 23 13 35 13s25-4 35-13M54 118c11 7 24 10 36 10s25-3 36-10M58 165c8 7 18 10 32 10s24-3 32-10M55 207c10 5 21 7 35 7s25-2 35-7"/>`;
    const front=`
      <path class="muscle-zone muscle-shoulders" d="M59 73c7-8 15-11 23-8l-5 23c-9 1-16-4-20-12Zm62 0c-7-8-15-11-23-8l5 23c9 1 16-4 20-12Z"/>
      <path class="muscle-zone muscle-chest" d="M67 86c6-6 14-8 23-5v31c-12 1-22-5-25-15Zm46 0c-6-6-14-8-23-5v31c12 1 22-5 25-15Z"/>
      <path class="muscle-zone muscle-biceps" d="M49 91c8 2 11 9 9 21l-8 28c-6-1-9-6-8-14l4-28Zm82 0c-8 2-11 9-9 21l8 28c6-1 9-6 8-14l-4-28Z"/>
      <path class="muscle-zone muscle-triceps" d="M39 102c6 4 8 10 5 19l-7 26-7-3 6-31Zm102 0c-6 4-8 10-5 19l7 26 7-3-6-31Z"/>
      <path class="muscle-zone muscle-core" d="M76 113h13v22H75Zm15 0h13l1 22H91Zm-17 24h15v22H73Zm17 0h15l1 22H91Zm-19 24h17v21H70Zm19 0h17l2 21H91Z"/>
      <path class="muscle-zone muscle-legs" d="M64 184c11-7 20-4 25 11l-6 58-20 1-11-43Zm52 0c-11-7-20-4-25 11l6 58 20 1 11-43ZM58 260c10-5 18 1 19 15l-8 55H50Zm64 0c-10-5-18 1-19 15l8 55h19Z"/>
      <path class="anatomy-line" d="M90 69v114M73 101h34M75 124h30M73 147h34M70 171h40M61 211c9 5 18 7 29 6m29-6c-9 5-18 7-29 6M57 279c7 3 13 4 20 3m46-3c-7 3-13 4-20 3"/>
      <path class="anatomy-line fine" d="M63 78l14 17m40-17-14 17M48 111l10 11m74-11-10 11M69 198l15 22m27-22-15 22M58 287l13 15m51-15-13 15"/>`;
    const back=`
      <path class="muscle-zone muscle-shoulders" d="M58 72c8-8 17-11 25-7l-7 23c-10 0-17-5-20-13Zm64 0c-8-8-17-11-25-7l7 23c10 0 17-5 20-13Z"/>
      <path class="muscle-zone muscle-back" d="M72 70c5-6 11-9 18-8 7-1 13 2 18 8l12 38-14 49-16-21-16 21-14-49Z"/>
      <path class="muscle-zone muscle-triceps" d="M47 91c8 4 11 11 8 22l-9 31c-6-2-9-8-7-16l5-29Zm86 0c-8 4-11 11-8 22l9 31c6-2 9-8 7-16l-5-29Z"/>
      <path class="muscle-zone muscle-core" d="M80 137h20l7 32-17 18-17-18Z"/>
      <path class="muscle-zone muscle-legs" d="M63 181c11-5 20 0 27 14 7-14 16-19 27-14l10 34-12 40-19-7-6-34-6 34-19 7-12-40Zm-5 79c10-5 18 1 19 15l-8 55H50Zm64 0c-10-5-18 1-19 15l8 55h19Z"/>
      <path class="anatomy-line" d="M90 67v117M66 86c12 10 36 10 48 0M65 110c13 8 37 8 50 0M72 143c10 7 26 7 36 0M63 205c9 8 18 11 27 11m27-11c-9 8-18 11-27 11M58 280c7 4 13 5 19 4m45-4c-7 4-13 5-19 4"/>
      <path class="anatomy-line fine" d="M65 78l14 17m36-17-14 17M50 112l11 12m68-12-11 12M68 197l16 22m28-22-16 22M58 287l13 15m51-15-13 15"/>`;
    return `<svg class="g2-body-model" viewBox="0 0 180 350" role="img" aria-label="${isBack?'후면':'전면'} 근육 지도" data-garang-body-v2="${side}">${common}${isBack?back:front}</svg>`;
  }

  function bindBodyZones(map) {
    map.querySelectorAll('.g2-body-model .muscle-zone').forEach(zone => {
      const key=['chest','back','shoulders','biceps','triceps','core','legs'].find(k=>zone.classList.contains(`muscle-${k}`));
      if(!key)return;
      zone.setAttribute('tabindex','0');zone.setAttribute('role','button');zone.setAttribute('aria-label',`${key} 운동 보기`);
      const activate=()=>{const pick=main.querySelector(`[data-muscle-pick="${key}"]`);if(pick)pick.click();};
      zone.onclick=activate;zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}};
    });
  }

  function renderBodyModels() {
    main.querySelectorAll('.muscle-map.anatomical-pro').forEach(map => {
      const views=[...map.querySelectorAll('.body-view')];
      views.forEach((view,i)=>{
        const label=(view.querySelector('span')?.textContent||'').toUpperCase();
        const side=/BACK|후면/.test(label)||i===1?'back':'front';
        const old=view.querySelector('svg');
        if(old?.dataset?.garangBodyV2===side)return;
        if(old)old.replaceWith(svgNode(bodySVG(side))); else view.insertAdjacentHTML('beforeend',bodySVG(side));
      });
      bindBodyZones(map);
    });
  }

  function activeAppRecord() {
    const candidates=[];
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);if(!key||(!key.startsWith('garang_user_')&&!key.startsWith('garang_demo_state')))continue;
        const value=JSON.parse(localStorage.getItem(key)||'null');if(value&&typeof value==='object')candidates.push({key,state:value});
      }
    }catch{}
    candidates.sort((a,b)=>String(b.state?.meta?.updatedAt||'').localeCompare(String(a.state?.meta?.updatedAt||'')));
    return candidates[0]||{key:'garang_demo_state_v3',state:{}};
  }

  function threadStoreKey(){return `garang_coach_threads_v2::${activeAppRecord().key}`;}
  function cleanMessage(m){return {id:m.id||uid(),role:m.role==='user'?'user':'assistant',text:String(m.text||''),at:m.at||now(),local:!!m.local};}
  function newThread(title='새 대화'){return {id:uid(),title,createdAt:now(),updatedAt:now(),messages:[]};}
  function loadThreadStore(){
    const key=threadStoreKey();
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'null');
      if(parsed?.version===2&&Array.isArray(parsed.threads)&&parsed.threads.length){
        parsed.threads=parsed.threads.map(t=>({...t,id:t.id||uid(),title:String(t.title||'새 대화'),messages:Array.isArray(t.messages)?t.messages.map(cleanMessage):[]}));
        if(!parsed.threads.some(t=>t.id===parsed.activeId))parsed.activeId=parsed.threads[0].id;
        return {key,data:parsed};
      }
    }catch{}
    const app=activeAppRecord().state||{};
    const legacy=Array.isArray(app.aiChat)?app.aiChat.map(cleanMessage).filter(m=>m.text.trim()):[];
    const t=newThread(legacy.find(m=>m.role==='user')?.text?.slice(0,32)||'GARANG Coach');t.messages=legacy;t.updatedAt=legacy.at(-1)?.at||now();
    const data={version:2,activeId:t.id,threads:[t]};localStorage.setItem(key,JSON.stringify(data));return {key,data};
  }
  function saveThreadStore(runtime){runtime.data.threads.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));localStorage.setItem(runtime.key,JSON.stringify(runtime.data));}
  function currentThread(runtime){return runtime.data.threads.find(t=>t.id===runtime.data.activeId)||runtime.data.threads[0];}
  function fmtDate(iso){try{const d=new Date(iso);return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}catch{return '';}}

  function buildContext(){
    const s=activeAppRecord().state||{};
    const date=new Date().toISOString().slice(0,10);
    const meals=(Array.isArray(s.meals)?s.meals:[]).filter(x=>x.date===date);
    const mealTotals=meals.reduce((a,x)=>({kcal:a.kcal+num(x.kcal),protein:a.protein+num(x.protein),carbs:a.carbs+num(x.carbs),fat:a.fat+num(x.fat)}),{kcal:0,protein:0,carbs:0,fat:0});
    const checkin=(Array.isArray(s.checkins)?s.checkins:[]).filter(x=>x.date===date).at(-1)||null;
    const plans=(Array.isArray(s.planner)?s.planner:[]).filter(x=>x.date===date);
    return {profile:s.profile||null,onboarding:s.onboarding||null,today:{date,checkin,planner:plans,meals,mealTotals,workouts:(s.workouts||[]).filter(x=>x.date===date),body:(s.body||[]).at(-1)||null},recent:{workouts:(s.workouts||[]).slice(-20),runs:(s.runs||[]).slice(-15),body:(s.body||[]).slice(-15)},memory:(s.memory?.entries||[]).filter(x=>x.userConfirmed||num(x.importance)>=3).slice(-40)};
  }

  function localCoachAnswer(q){
    const s=activeAppRecord().state||{},ctx=buildContext(),lower=q.toLowerCase();
    const weight=num(s.profile?.weight,67),proteinTarget=Math.round(weight*1.6),t=ctx.today.mealTotals;
    if(/식단|단백질|영양|먹/.test(lower)){const gap=Math.max(0,proteinTarget-t.protein);return `오늘 기록 기준으로 ${Math.round(t.kcal)} kcal, 단백질 ${Math.round(t.protein)}g입니다.\n목표 단백질을 약 ${proteinTarget}g으로 보면 ${Math.round(gap)}g 정도 남아 있습니다.\n\n지금은 실제 저장된 식단 기록만 사용해 판단했습니다.`;}
    if(/최근|기록|운동/.test(lower)){const w=(s.workouts||[]),last=w.at(-1);return `현재 저장된 운동 기록은 ${w.length}개입니다.${last?`\n최근 기록: ${last.name||'운동'} ${num(last.weight)}kg × ${num(last.reps)} × ${num(last.sets)}세트.`:''}\n\n수면·근육통·최근 훈련량이 함께 있으면 오늘 강도를 더 정확히 조정할 수 있습니다.`;}
    if(/회복|상태|수면|오늘/.test(lower)){const c=ctx.today.checkin;if(!c)return '오늘 체크인이 아직 없습니다. 수면, 에너지, 스트레스, 근육통을 저장하면 GARANG이 오늘 훈련 강도를 실제 기록에 맞춰 판단할 수 있습니다.';const readiness=clamp(Math.round((num(c.sleep,7)/8*30)+(num(c.energy,3)/5*30)+((6-num(c.stress,3))/5*20)+((6-num(c.soreness,2))/5*20)),0,100);return `오늘 회복 지표는 약 ${readiness}/100입니다.\n수면 ${num(c.sleep).toFixed(1)}시간 · 에너지 ${num(c.energy)}/5 · 스트레스 ${num(c.stress)}/5 · 근육통 ${num(c.soreness)}/5를 반영했습니다.\n\n${readiness<50?'고강도보다는 회복 또는 볼륨을 낮춘 세션을 권합니다.':readiness<70?'평소보다 약간 보수적인 강도가 적절합니다.':'현재 기록상 정상 훈련을 진행할 수 있는 범위입니다.'}`;}
    return '현재 외부 AI 연결이 없어서 GARANG 로컬 코치로 응답하고 있습니다. 운동 강도, 회복 상태, 식단, 최근 기록에 대해서는 실제 저장 데이터를 기준으로 분석할 수 있습니다.';
  }

  async function getCoachAnswer(message,thread){
    const endpoint=window.GARANG_SERVICES?.coachEndpoint;
    if(endpoint){
      try{
        const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,context:buildContext(),conversation:thread.messages.slice(-24).map(({role,text})=>({role,text}))})});
        if(!response.ok)throw new Error(`Coach ${response.status}`);
        const data=await response.json();return {text:String(data.answer||data.output||'응답 형식을 확인해 주세요.'),local:false};
      }catch(e){return {text:`외부 AI 연결에 실패해 로컬 데이터 분석으로 전환했습니다.\n\n${localCoachAnswer(message)}`,local:true};}
    }
    return {text:localCoachAnswer(message),local:true};
  }

  function threadListHTML(runtime){
    return runtime.data.threads.map(t=>`<div class="g2-thread-row ${t.id===runtime.data.activeId?'active':''}" data-thread-row="${t.id}"><button class="g2-thread-open" type="button" data-thread-open="${t.id}"><strong>${esc(t.title)}</strong><small>${fmtDate(t.updatedAt)}</small></button><button class="g2-thread-menu" type="button" data-thread-menu="${t.id}" aria-label="대화 메뉴">⋯</button></div>`).join('');
  }

  function messageHTML(m){
    if(m.role==='user')return `<article class="g2-message user" data-message-id="${m.id}"><div class="g2-message-body"><div class="g2-message-text">${esc(m.text)}</div></div></article>`;
    return `<article class="g2-message assistant" data-message-id="${m.id}"><div class="g2-message-avatar">${markPNG()}</div><div class="g2-message-body"><div class="g2-message-text">${esc(m.text)}</div><div class="g2-message-meta">${m.local?'GARANG LOCAL ENGINE':'GARANG INTELLIGENCE'} · ${fmtDate(m.at)}</div></div></article>`;
  }

  function forceBottom(runtime){
    const scroller=runtime.root.querySelector('.g2-chat-scroll');if(!scroller)return;
    const jump=()=>{scroller.scrollTop=scroller.scrollHeight;};
    jump();requestAnimationFrame(()=>{jump();requestAnimationFrame(jump);});setTimeout(jump,40);setTimeout(jump,120);setTimeout(jump,260);
  }

  function renderMessages(runtime){
    const thread=currentThread(runtime),scroller=runtime.root.querySelector('.g2-chat-scroll');if(!thread||!scroller)return;
    if(!thread.messages.length){
      scroller.innerHTML=`<div class="g2-empty-chat"><div class="g2-empty-inner">${markPNG()}<h2>What will you build today?</h2><p>GARANG은 당신의 운동·식단·회복·반복되는 선택을 읽고 다음 행동을 함께 판단합니다.</p><div class="g2-prompts"><button data-g2-prompt="오늘 운동 강도를 정해줘">오늘 운동</button><button data-g2-prompt="내 최근 기록을 분석해줘">최근 기록</button><button data-g2-prompt="오늘 식단을 분석해줘">오늘 식단</button><button data-g2-prompt="회복 상태를 알려줘">회복 상태</button></div></div></div>`;
    }else scroller.innerHTML=thread.messages.map(messageHTML).join('');
    runtime.root.querySelector('.g2-chat-head-copy strong').textContent=thread.title;
    runtime.root.querySelectorAll('[data-g2-prompt]').forEach(b=>b.onclick=()=>{runtime.input.value=b.dataset.g2Prompt||'';sendMessage(runtime);});
    forceBottom(runtime);
  }

  function renderThreadList(runtime){
    const list=runtime.root.querySelector('.g2-thread-list');if(list)list.innerHTML=threadListHTML(runtime);
    runtime.root.querySelectorAll('[data-thread-open]').forEach(b=>b.onclick=()=>{runtime.data.activeId=b.dataset.threadOpen;saveThreadStore(runtime);renderThreadList(runtime);renderMessages(runtime);runtime.root.classList.remove('sidebar-open');});
    runtime.root.querySelectorAll('[data-thread-menu]').forEach(b=>b.onclick=e=>openThreadMenu(runtime,b.dataset.threadMenu,e.currentTarget));
  }

  function createConversation(runtime){
    const t=newThread();runtime.data.threads.unshift(t);runtime.data.activeId=t.id;saveThreadStore(runtime);renderThreadList(runtime);renderMessages(runtime);runtime.input.value='';runtime.input.focus();runtime.root.classList.remove('sidebar-open');
  }

  function openThreadMenu(runtime,id,anchor){
    document.querySelector('.g2-thread-popover')?.remove();
    const t=runtime.data.threads.find(x=>x.id===id);if(!t)return;
    const pop=document.createElement('div');pop.className='g2-thread-popover';pop.innerHTML='<button type="button" data-act="rename">이름 변경</button><button type="button" class="danger" data-act="delete">삭제</button>';document.body.appendChild(pop);
    const r=anchor.getBoundingClientRect();pop.style.left=`${Math.min(window.innerWidth-140,Math.max(8,r.left-92))}px`;pop.style.top=`${Math.min(window.innerHeight-82,r.bottom+4)}px`;
    pop.querySelector('[data-act="rename"]').onclick=()=>{const name=window.prompt('대화 이름',t.title);if(name?.trim()){t.title=name.trim().slice(0,60);t.updatedAt=now();saveThreadStore(runtime);renderThreadList(runtime);renderMessages(runtime);}pop.remove();};
    pop.querySelector('[data-act="delete"]').onclick=()=>{if(!window.confirm('이 대화를 삭제할까요?'))return;runtime.data.threads=runtime.data.threads.filter(x=>x.id!==id);if(!runtime.data.threads.length)runtime.data.threads=[newThread()];if(runtime.data.activeId===id)runtime.data.activeId=runtime.data.threads[0].id;saveThreadStore(runtime);renderThreadList(runtime);renderMessages(runtime);pop.remove();};
    const close=e=>{if(!pop.contains(e.target)&&e.target!==anchor){pop.remove();document.removeEventListener('pointerdown',close,true);}};setTimeout(()=>document.addEventListener('pointerdown',close,true),0);
  }

  async function sendMessage(runtime){
    if(runtime.sending)return;const text=runtime.input.value.trim();if(!text)return;
    const thread=currentThread(runtime);if(!thread)return;
    const m={id:uid(),role:'user',text,at:now(),local:false};thread.messages.push(m);thread.updatedAt=m.at;if(thread.title==='새 대화')thread.title=text.replace(/\s+/g,' ').slice(0,34)+(text.length>34?'…':'');runtime.input.value='';runtime.input.style.height='auto';saveThreadStore(runtime);renderThreadList(runtime);renderMessages(runtime);
    runtime.sending=true;runtime.send.disabled=true;
    const scroller=runtime.root.querySelector('.g2-chat-scroll');const thinking=document.createElement('article');thinking.className='g2-message assistant';thinking.dataset.thinking='1';thinking.innerHTML=`<div class="g2-message-avatar">${markPNG()}</div><div class="g2-message-body"><div class="g2-thinking"><i></i><i></i><i></i></div></div>`;scroller.appendChild(thinking);forceBottom(runtime);
    const result=await getCoachAnswer(text,thread);thinking.remove();const a={id:uid(),role:'assistant',text:result.text,at:now(),local:result.local};thread.messages.push(a);thread.updatedAt=a.at;saveThreadStore(runtime);runtime.sending=false;runtime.send.disabled=false;renderThreadList(runtime);renderMessages(runtime);runtime.input.focus();forceBottom(runtime);
  }

  function mountCoach(){
    const old=main.querySelector('.coach-app-shell');if(!old||main.querySelector('.garang-coach-v2'))return;
    const loaded=loadThreadStore();
    const root=document.createElement('section');root.className='garang-coach-v2';root.innerHTML=`
      <aside class="g2-chat-sidebar"><div class="g2-sidebar-brand">${markPNG()}<strong>GARANG</strong></div><button class="g2-new-chat" type="button"><b>＋</b><span>새 대화</span></button><div class="g2-thread-label">CONVERSATIONS</div><div class="g2-thread-list"></div><div class="g2-sidebar-foot">GARANG INTELLIGENCE<br>Memory-led personal performance coach.</div></aside>
      <div class="g2-sidebar-backdrop"></div>
      <div class="g2-chat-main"><header class="g2-chat-head"><button class="g2-mobile-threads" type="button" aria-label="대화 목록">☰</button>${markPNG()}<div class="g2-chat-head-copy"><small>GARANG INTELLIGENCE</small><strong>새 대화</strong></div><button class="g2-head-new" type="button">＋ 새 대화</button></header><div class="g2-chat-scroll" id="garangCoachScroll"></div><footer class="g2-composer-wrap"><div class="g2-composer"><textarea rows="1" placeholder="GARANG에게 메시지 보내기" aria-label="GARANG에게 메시지 보내기"></textarea><button class="g2-send" type="button" aria-label="전송">↑</button></div><div class="g2-composer-note">GARANG은 저장된 개인 데이터를 근거로 답합니다. 중요한 판단은 직접 확인하세요.</div></footer></div>`;
    old.replaceWith(root);
    const runtime={root,key:loaded.key,data:loaded.data,input:root.querySelector('textarea'),send:root.querySelector('.g2-send'),sending:false,resizeObserver:null};
    runtime.input.oninput=()=>{runtime.input.style.height='auto';runtime.input.style.height=Math.min(140,runtime.input.scrollHeight)+'px';};
    runtime.input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage(runtime);}};
    runtime.send.onclick=()=>sendMessage(runtime);root.querySelector('.g2-new-chat').onclick=()=>createConversation(runtime);root.querySelector('.g2-head-new').onclick=()=>createConversation(runtime);root.querySelector('.g2-mobile-threads').onclick=()=>root.classList.add('sidebar-open');root.querySelector('.g2-sidebar-backdrop').onclick=()=>root.classList.remove('sidebar-open');
    renderThreadList(runtime);renderMessages(runtime);
    runtime.resizeObserver=new ResizeObserver(()=>forceBottom(runtime));runtime.resizeObserver.observe(root.querySelector('.g2-chat-scroll'));
    root.dataset.garangCoachV2='1';setTimeout(()=>forceBottom(runtime),0);
  }

  function repairAll(){replaceBrandMarks(document);renderBodyModels();mountCoach();}
  let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;repairAll();});});
  observer.observe(document.body,{childList:true,subtree:true});
  repairAll();
})();
