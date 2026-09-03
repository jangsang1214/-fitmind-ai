/* Data-safe approved-reference decorations. No sample values are injected. */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;

  function currentState() {
    try {
      const candidates=[];
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(!k||(!k.startsWith('garang_user_')&&!k.startsWith('garang_demo_state')))continue;
        const v=JSON.parse(localStorage.getItem(k)||'null');
        if(v?.meta||v?.profile)candidates.push(v);
      }
      candidates.sort((a,b)=>String(b?.meta?.updatedAt||'').localeCompare(String(a?.meta?.updatedAt||'')));
      return candidates[0]||null;
    }catch{return null;}
  }

  function currentProfileName(){return currentState()?.profile?.name||'GARANG User';}
  function greetingWord(){const h=new Date().getHours();return h<12?'Good morning,':h<18?'Good afternoon,':'Good evening,';}
  function text(el,fallback='—'){const t=el?.textContent?.trim();return t||fallback;}

  function decorateToday(){
    const panel=main.querySelector('.today-decision-panel');
    if(!panel||panel.querySelector('.gx-today-greeting'))return;
    const decisionTitle=panel.querySelector('.today-score-line h2')?.textContent?.trim()||'Ready to train.';
    const decisionSummary=panel.querySelector('.today-decision-copy')?.textContent?.trim()||'';
    const greeting=document.createElement('div');greeting.className='gx-today-greeting';greeting.innerHTML=`<span>${greetingWord()}</span><strong>${currentProfileName()}.</strong>`;panel.insertBefore(greeting,panel.firstChild);
    const snapshot=main.querySelector('.today-snapshot');const focus=main.querySelector('.today-body-panel');
    if(snapshot&&focus){snapshot.insertAdjacentElement('afterend',focus);const existingTitle=focus.querySelector('.today-body-label strong')?.textContent?.trim()||'Today’s Focus';const label=focus.querySelector('.today-body-label');if(label&&!label.querySelector('.gx-focus-copy')){const copy=document.createElement('div');copy.className='gx-focus-copy';copy.innerHTML=`<small>TODAY'S FOCUS</small><strong>${decisionTitle}</strong><p>${decisionSummary||existingTitle}</p>`;label.appendChild(copy);}}
    const decision=document.createElement('section');decision.className='gx-today-decision-card';decision.innerHTML=`<span>DECISION</span><strong>${decisionTitle}</strong><p>${decisionSummary}</p>`;if(focus)focus.insertAdjacentElement('afterend',decision);else snapshot?.insertAdjacentElement('afterend',decision);
  }

  function latestWorkoutSummary(){
    const s=currentState();const workouts=Array.isArray(s?.workouts)?s.workouts:[];if(!workouts.length)return null;
    const last=workouts[workouts.length-1],sessionId=last.sessionId,date=last.date;const rows=sessionId?workouts.filter(x=>x.sessionId===sessionId):workouts.filter(x=>x.date===date).slice(-8);
    return {volume:rows.reduce((v,x)=>v+Number(x.volume||0),0),duration:rows.reduce((v,x)=>v+Number(x.duration||0),0),oneRm:Math.max(0,...rows.map(x=>Number(x.estimated1RM||0))),count:rows.length};
  }

  function decorateWorkout(){
    if(!main.querySelector('.workout-hero-v2')||main.querySelector('.gx-workout-summary'))return;
    const persisted=latestWorkoutSummary();const mini=[...main.querySelectorAll('.workout-mini-stats>div')];const fallbackOneRm=text(main.querySelector('.one-rm-best strong')).replace(/estimated/ig,'').trim();const fallbackCount=text(main.querySelector('.workout-builder-v2 .pill'),'0 exercises').match(/\d+/)?.[0]||'0';
    const volume=persisted?Math.round(persisted.volume).toLocaleString():(mini[0]?text(mini[0].querySelector('strong')):'—');const duration=persisted?Math.round(persisted.duration):(mini[2]?text(mini[2].querySelector('strong')):'—');const oneRm=persisted&&persisted.oneRm?persisted.oneRm.toFixed(1):fallbackOneRm;const count=persisted?persisted.count:fallbackCount;
    const selected=text(main.querySelector('.workout-selected-name'),'Workout');const pageTitle=main.querySelector('.page-head h1');if(pageTitle)pageTitle.textContent=selected;
    const summary=document.createElement('section');summary.className='gx-workout-summary';summary.innerHTML=`<span class="gx-label">SESSION SUMMARY</span><div><article><small>VOLUME</small><strong>${volume}</strong><em>kg</em></article><article><small>EST. 1RM</small><strong>${oneRm}</strong><em>kg</em></article><article><small>EXERCISES</small><strong>${count}</strong></article><article><small>DURATION</small><strong>${duration}</strong><em>min</em></article></div>`;main.querySelector('.workout-builder-v2')?.insertAdjacentElement('beforebegin',summary);
  }

  function decorateBody(){
    const trend=main.querySelector('.body-trend-primary');if(!trend||main.querySelector('.gx-body-result'))return;
    const pageTitle=main.querySelector('.page-head h1');if(pageTitle)pageTitle.textContent='Body';
    const state=currentState(),profile=state?.profile||{},latest=Array.isArray(state?.body)&&state.body.length?state.body[state.body.length-1]:null;
    const summary=document.createElement('section');summary.className='gx-inbody-summary';
    summary.innerHTML=`<span class="gx-label">INPUT (4 EASY STEPS)</span><div><article><small>Height</small><strong>${profile.height??'—'} <em>cm</em></strong></article><article><small>Weight</small><strong>${latest?.weight??profile.weight??'—'} <em>kg</em></strong></article><article><small>Age</small><strong>${profile.age??'—'}</strong></article><article><small>Gender</small><strong>${profile.gender==='female'?'Female':'Male'}</strong></article></div>`;
    trend.insertAdjacentElement('beforebegin',summary);

    const heroMetrics=[...main.querySelectorAll('.body-hero-metrics>div')];const derived=[...main.querySelectorAll('#bodyDerived>div')];
    const muscle=text(heroMetrics[0]?.querySelector('b'));
    const fatPct=text(heroMetrics[1]?.querySelector('b'));
    const fatMass=text(derived[0]?.querySelector('b'));
    const result=document.createElement('section');result.className='gx-body-result';
    result.innerHTML=`<span class="gx-label">RESULT (Auto calculated)</span><div><article><small>Skeletal Muscle</small><strong>${muscle}</strong></article><article><small>Body Fat Mass</small><strong>${fatMass}</strong></article><article><small>Body Fat %</small><strong>${fatPct}</strong></article></div>`;
    summary.insertAdjacentElement('afterend',result);
  }

  function decorate(){decorateToday();decorateWorkout();decorateBody();}
  let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});});observer.observe(main,{childList:true,subtree:true});decorate();
})();
