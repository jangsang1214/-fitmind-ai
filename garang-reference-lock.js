/* GARANG REFERENCE LOCK v4.0
   Source of truth: approved GARANG APP EXPERIENCE / v2.0 boards.
   Visual facade only. Canonical app.js remains responsible for data, persistence and feature logic.
*/
(() => {
  'use strict';
  const main = document.getElementById('main');
  const nav = document.getElementById('bottomNav');
  if (!main || !nav) return;

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = (v, f=0) => Number.isFinite(Number(v)) ? Number(v) : f;
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));

  function state(){
    try{
      const rows=[];
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(!k || (!k.startsWith('garang_user_') && !k.startsWith('garang_demo_state'))) continue;
        const v=JSON.parse(localStorage.getItem(k)||'null');
        if(v?.meta || v?.profile) rows.push(v);
      }
      rows.sort((a,b)=>String(b?.meta?.updatedAt||'').localeCompare(String(a?.meta?.updatedAt||'')));
      return rows[0] || {};
    }catch{return {};}
  }
  function route(page){
    const proxy = nav.querySelector('button');
    if(!proxy) return;
    const old=proxy.dataset.page;
    proxy.dataset.page=page; proxy.click(); proxy.dataset.page=old;
  }
  function latest(arr){return Array.isArray(arr)&&arr.length?arr[arr.length-1]:null;}
  function todayKey(){const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
  function greeting(){const h=new Date().getHours();return h<12?'GOOD MORNING,':h<18?'GOOD AFTERNOON,':'GOOD EVENING,';}
  function profileName(s){return s?.profile?.name || 'GARANG User';}
  function mealTotals(s){
    const key=todayKey(); return (s.meals||[]).filter(x=>x.date===key).reduce((a,x)=>({kcal:a.kcal+num(x.kcal),protein:a.protein+num(x.protein),carbs:a.carbs+num(x.carbs),fat:a.fat+num(x.fat)}),{kcal:0,protein:0,carbs:0,fat:0});
  }
  function scoreFromDom(){
    const raw=$('.score-orb strong',main)?.textContent || $('.today-score-line strong',main)?.textContent || '—';
    const m=raw.match(/\d+/);return m?Number(m[0]):null;
  }
  function metric(label, value, grade='Good', icon='◌'){
    return `<article class="grx-metric"><span class="grx-metric-icon">${icon}</span><small>${label}</small><strong>${esc(value)}</strong><em>${esc(grade)}</em></article>`;
  }
  function ring(value, label='Good'){
    const v=clamp(num(value),0,100);
    return `<div class="grx-ring" style="--p:${v}"><div><strong>${value ?? '—'}</strong><span>/100</span><em>${esc(label)}</em></div></div>`;
  }
  function mark(){return `<img class="grx-mark" src="garang-mark.svg" alt="GARANG">`;}

  function cleanFacade(){ $$('.grx-facade',main).forEach(x=>x.remove()); main.classList.remove('grx-page-today','grx-page-workout','grx-page-body','grx-page-nutrition','grx-page-progress','grx-page-coach'); }
  function hideOriginalFor(kind){
    [...main.children].forEach(el=>{
      if(el.classList.contains('grx-facade')) return;
      el.classList.toggle('grx-reference-original', true);
      el.dataset.grxFor=kind;
    });
  }
  function unhideOriginal(){ $$('.grx-reference-original',main).forEach(el=>{el.classList.remove('grx-reference-original'); delete el.dataset.grxFor;}); }

  function todayFacade(){
    if(!$('.visual-today-hero',main)) return false;
    cleanFacade(); unhideOriginal(); main.classList.add('grx-page-today');
    const s=state(), sc=scoreFromDom();
    const check=latest(s.checkins)||{}; const meals=mealTotals(s);
    const recovery=sc??82;
    const training=clamp(Math.round(recovery - Math.max(0,num(check.soreness)-2)*6),0,100);
    const nutrition=meals.protein?clamp(Math.round(meals.protein/Math.max(1,num(s.profile?.weight,67)*1.8)*100),0,100):Math.max(0,recovery-9);
    const sleep=check.sleep?clamp(Math.round(num(check.sleep)/8*100),0,100):Math.max(0,recovery-4);
    const decTitle=$('.today-score-line h2',main)?.textContent?.trim() || '오늘은 상체 훈련을 추천합니다.';
    const decCopy=$('.today-decision-copy',main)?.textContent?.trim() || '최근 기록과 회복 상태를 바탕으로 오늘의 선택을 제안합니다.';
    const facade=document.createElement('section');facade.className='grx-facade grx-today';
    facade.innerHTML=`
      <header class="grx-app-head"><div class="grx-word">GARANG</div><button class="grx-bell" type="button" aria-label="Notifications">⌁</button></header>
      <div class="grx-greeting"><span>${greeting()}</span><h1>${esc(profileName(s))}.</h1></div>
      <div class="grx-condition"><div><small>TODAY'S CONDITION</small><div class="grx-score"><strong>${recovery}</strong><span>/100</span></div><em>Good</em></div>${ring(recovery,'Good')}</div>
      <div class="grx-metrics">${metric('Recovery',recovery,'Good','◉')}${metric('Training',training,training>=80?'Good':'Normal','⌁')}${metric('Nutrition',nutrition,nutrition>=80?'Excellent':'Fair','♢')}${metric('Sleep',sleep,sleep>=80?'Good':'Fair','◔')}</div>
      <section class="grx-decision"><small>GARANG'S DECISION</small><h2>${esc(decTitle)}</h2><p>${esc(decCopy)}</p></section>
      <button class="grx-primary" data-grx-route="workout">오늘 운동 시작</button>
      <button class="grx-secondary" data-grx-route="coach">코치에게 질문하기</button>`;
    main.prepend(facade); hideOriginalFor('today');
    return true;
  }

  function coachFacade(){
    if(!$('.coach-app-shell',main)) return false;
    cleanFacade(); unhideOriginal(); main.classList.add('grx-page-coach');
    const shell=$('.coach-app-shell',main); if(shell && !$('.grx-coach-brand',shell)){
      const brand=document.createElement('div');brand.className='grx-coach-brand';brand.innerHTML=`${mark()}<strong>GARANG Coach</strong><span>AI Performance Coach</span>`;
      const head=$('.coach-app-head',shell); head?.insertAdjacentElement('afterend',brand);
    }
    return true;
  }

  function workoutFacade(){
    if(!$('.workout-hero-v2',main)) return false;
    cleanFacade(); unhideOriginal(); main.classList.add('grx-page-workout');
    const s=state(), rows=(s.workouts||[]).slice(-12), last=latest(rows)||{};
    const title=$('.workout-selected-name',main)?.textContent?.trim() || last.name || 'Upper Body Strength';
    const volume=Math.round(rows.reduce((a,x)=>a+num(x.volume),0));
    const oneRm=Math.max(0,...rows.map(x=>num(x.estimated1RM)));
    const duration=Math.round(rows.reduce((a,x)=>a+num(x.duration),0));
    const unique=[...new Set(rows.map(x=>x.name).filter(Boolean))].slice(-3).reverse();
    const facade=document.createElement('section');facade.className='grx-facade grx-workout';
    facade.innerHTML=`
      <header class="grx-detail-head"><button data-grx-route="today">‹</button><strong>${esc(title)}</strong><span></span></header>
      <nav class="grx-tabs"><button class="active" data-grx-workout-tab="overview">Overview</button><button data-grx-workout-tab="exercises">Exercises</button><button data-grx-workout-tab="log">Log</button></nav>
      <div class="grx-anatomy"><img src="garang-anatomy-reference.svg" alt="Anatomical training model"></div>
      <section class="grx-session"><small>SESSION SUMMARY</small><div><article><span>VOLUME</span><b>${volume?volume.toLocaleString():'—'}</b><em>kg</em></article><article><span>EST. 1RM</span><b>${oneRm?oneRm.toFixed(0):'—'}</b><em>kg</em></article><article><span>EXERCISES</span><b>${unique.length||'—'}</b></article><article><span>DURATION</span><b>${duration||'—'}</b><em>min</em></article></div></section>
      <section class="grx-top-exercises"><small>TOP EXERCISES</small>${unique.map((name,i)=>{const r=[...rows].reverse().find(x=>x.name===name)||{};return `<article><i>${i+1}</i><div><b>${esc(name)}</b><span>${num(r.sets,1)} × ${num(r.reps,1)} &nbsp;&nbsp; ${num(r.weight)} kg</span></div><em>✓</em></article>`}).join('')||'<p class="grx-empty">운동 기록을 시작하면 주요 종목이 표시됩니다.</p>'}</section>
      <button class="grx-primary" data-grx-workout-action="start">세션 시작</button>`;
    main.prepend(facade); hideOriginalFor('workout');
    return true;
  }

  function bodyFacade(){
    if(!$('.body-trend-primary',main)) return false;
    cleanFacade(); unhideOriginal(); main.classList.add('grx-page-body');
    const s=state(), b=latest(s.body)||{}, p=s.profile||{};
    const facade=document.createElement('section');facade.className='grx-facade grx-body';
    facade.innerHTML=`
      <header class="grx-detail-head"><button data-grx-route="today">‹</button><strong>Body</strong><span></span></header>
      <nav class="grx-tabs"><button class="active">InBody</button><button data-grx-body-tab="trends">Trends</button></nav>
      <section class="grx-inbody"><small>INBODY (요약)</small>
        <article><span>골격근량</span><b>${b.muscle??'—'} <em>kg</em></b><i>${b.muscle?'▲':'—'}</i></article>
        <article><span>체지방량</span><b>${b.fatMass??(b.weight&&b.fatPercent?(b.weight*b.fatPercent/100).toFixed(1):'—')} <em>kg</em></b><i>${b.fatPercent?'▼':'—'}</i></article>
        <article><span>체지방률</span><b>${b.fatPercent??'—'} <em>%</em></b><i>${b.fatPercent?'▼':'—'}</i></article>
        <article><span>체중</span><b>${b.weight??p.weight??'—'} <em>kg</em></b><i>${b.weight?'▲':'—'}</i></article>
      </section>
      <section class="grx-body-composition"><small>BODY COMPOSITION</small><div class="grx-segment"><button class="active">골격근량</button><button>체지방량</button><button>체지방률</button></div><div class="grx-chart-proxy"></div></section>
      <button class="grx-history-link" data-grx-body-history>인바디 기록 전체 보기 <span>›</span></button>`;
    main.prepend(facade); hideOriginalFor('body');
    const chart=$('#bodyTrendChart',main); if(chart) $('.grx-chart-proxy',facade)?.append(chart.cloneNode(true));
    return true;
  }

  function nutritionFacade(){
    if(!$('.nutrition-visual-hero',main)) return false;
    cleanFacade(); unhideOriginal(); main.classList.add('grx-page-nutrition');
    const s=state(), t=mealTotals(s), weight=num(s.profile?.weight,67), kcalTarget=Math.round(Math.max(1800,weight*33)), proteinTarget=Math.round(weight*2.0), carbTarget=Math.round(weight*3.7), fatTarget=Math.round(weight*1.0);
    const meals=(s.meals||[]).filter(x=>x.date===todayKey()).slice(-3);
    const kcalPct=clamp(Math.round(t.kcal/Math.max(1,kcalTarget)*100),0,100);
    const facade=document.createElement('section');facade.className='grx-facade grx-progress';
    facade.innerHTML=`
      <header class="grx-detail-head"><button data-grx-route="today">‹</button><strong>Progress</strong><span></span></header>
      <nav class="grx-tabs grx-progress-tabs"><button class="active" data-grx-progress="nutrition">Nutrition</button><button data-grx-progress="performance">Performance</button><button data-grx-progress="insights">Insights</button></nav>
      <section class="grx-nutrition"><small>오늘의 영양</small><div class="grx-kcal-ring" style="--p:${kcalPct}"><div><strong>${Math.round(t.kcal).toLocaleString()}</strong><span>/ ${kcalTarget.toLocaleString()} kcal</span><em>${kcalPct<=110?'On track':'Review'}</em></div></div><div class="grx-macros"><article><small>단백질</small><b>${Math.round(t.protein)} <span>/ ${proteinTarget}g</span></b></article><article><small>탄수화물</small><b>${Math.round(t.carbs)} <span>/ ${carbTarget}g</span></b></article><article><small>지방</small><b>${Math.round(t.fat)} <span>/ ${fatTarget}g</span></b></article></div></section>
      <section class="grx-meals"><small>MEALS</small>${meals.map((m,i)=>`<article><div><b>${['아침','점심','저녁'][i]||'식사'}</b><span>${esc(m.name||'Meal')}</span><em>${Math.round(num(m.kcal))} kcal</em></div><div class="grx-meal-thumb">${i+1}</div></article>`).join('')||'<p class="grx-empty">아직 기록된 식사가 없습니다.</p>'}<button data-grx-nutrition-add>＋ 음식 추가</button></section>
      <section class="grx-weekly"><small>WEEKLY OVERVIEW</small><div><article><span>평균 섭취 칼로리</span><b>${Math.round(t.kcal||0).toLocaleString()} kcal</b></article><article><span>평균 단백질</span><b>${Math.round(t.protein||0)} g</b></article></div><div class="grx-bars">${[.45,.7,.6,.78,.62,.84,.95].map((v,i)=>`<i style="--h:${Math.round(v*100)}%"><span>${'MTWTFSS'[i]}</span></i>`).join('')}</div></section>`;
    main.prepend(facade); hideOriginalFor('nutrition');
    return true;
  }

  function progressFacade(){
    if(!$('.progress-range-tabs',main) && !$('.weekly-review',main) && !/진행 상황/.test(main.textContent||'')) return false;
    main.classList.add('grx-page-progress');
    return true;
  }

  function decorate(){
    if(document.body.dataset.grxBusy==='1') return;
    document.body.dataset.grxBusy='1';
    try{
      unhideOriginal();
      if(todayFacade()) return;
      if(coachFacade()) return;
      if(workoutFacade()) return;
      if(bodyFacade()) return;
      if(nutritionFacade()) return;
      progressFacade();
    } finally { delete document.body.dataset.grxBusy; }
  }

  document.addEventListener('click', e=>{
    const r=e.target.closest('[data-grx-route]'); if(r){e.preventDefault();route(r.dataset.grxRoute);return;}
    const start=e.target.closest('[data-grx-workout-action="start"]'); if(start){
      e.preventDefault(); const original=$('.workout-builder-v2',main); if(original){original.classList.remove('grx-reference-original'); original.scrollIntoView({behavior:'smooth',block:'start'});} return;
    }
    const add=e.target.closest('[data-grx-nutrition-add]'); if(add){e.preventDefault(); const picker=$('#pickMealScan',main); const manual=$('.manual-entry',main); if(picker){picker.click();}else if(manual){manual.classList.remove('grx-reference-original');manual.open=true;manual.scrollIntoView({behavior:'smooth'});} return;}
    const hist=e.target.closest('[data-grx-body-history]'); if(hist){e.preventDefault();const h=$('.compact-history',main);if(h){h.classList.remove('grx-reference-original');h.open=true;h.scrollIntoView({behavior:'smooth'});}return;}
    const pt=e.target.closest('[data-grx-progress]'); if(pt){e.preventDefault(); if(pt.dataset.grxProgress==='nutrition')route('nutrition');else route('progress');return;}
    const wt=e.target.closest('[data-grx-workout-tab]'); if(wt){e.preventDefault();const tab=wt.dataset.grxWorkoutTab;if(tab==='overview')return;if(tab==='exercises'){const el=$('.exercise-visual-library',main)||$('.workout-builder-v2',main);if(el){el.classList.remove('grx-reference-original');el.scrollIntoView({behavior:'smooth'});}}else{const el=$('.compact-history',main);if(el){el.classList.remove('grx-reference-original');el.open=true;el.scrollIntoView({behavior:'smooth'});}}}
  },true);

  let q=false;
  const obs=new MutationObserver(()=>{if(q||document.body.dataset.grxBusy==='1')return;q=true;requestAnimationFrame(()=>{q=false;decorate();});});
  obs.observe(main,{childList:true,subtree:true});
  decorate();
})();
