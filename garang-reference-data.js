/* Data-safe approved-reference decorations. No sample values are injected. */
(() => {
  'use strict';
  const main = document.getElementById('main');
  if (!main) return;

  function currentProfileName() {
    try {
      const candidates = [];
      for (let i=0;i<localStorage.length;i++) {
        const k=localStorage.key(i);
        if (!k || (!k.startsWith('garang_user_') && !k.startsWith('garang_demo_state'))) continue;
        const v=JSON.parse(localStorage.getItem(k) || 'null');
        if (v?.profile?.name) candidates.push(v);
      }
      candidates.sort((a,b)=>String(b?.meta?.updatedAt||'').localeCompare(String(a?.meta?.updatedAt||'')));
      return candidates[0]?.profile?.name || 'GARANG User';
    } catch { return 'GARANG User'; }
  }

  function decorateToday() {
    const panel = main.querySelector('.today-decision-panel');
    if (!panel || panel.querySelector('.gx-today-greeting')) return;
    const decisionTitle = panel.querySelector('.today-score-line h2')?.textContent?.trim() || 'Ready to train.';
    const decisionSummary = panel.querySelector('.today-decision-copy')?.textContent?.trim() || '';
    const name = currentProfileName();

    const greeting = document.createElement('div');
    greeting.className='gx-today-greeting';
    greeting.innerHTML=`<span>Good morning,</span><strong>${name}.</strong>`;
    panel.insertBefore(greeting,panel.firstChild);

    const decision = document.createElement('section');
    decision.className='gx-today-decision-card';
    decision.innerHTML=`<span>DECISION</span><strong>${decisionTitle}</strong><p>${decisionSummary}</p>`;
    const quick=main.querySelector('.quick-visual-grid');
    quick?.insertAdjacentElement('afterend',decision);
  }

  function text(el, fallback='—') { const t=el?.textContent?.trim(); return t || fallback; }

  function decorateWorkout() {
    if (!main.querySelector('.workout-hero-v2') || main.querySelector('.gx-workout-summary')) return;
    const mini=[...main.querySelectorAll('.workout-mini-stats>div')];
    const oneRm=text(main.querySelector('.one-rm-best strong')).replace(/estimated/ig,'').trim();
    const draftCount=text(main.querySelector('.workout-builder-v2 .pill'),'0 exercises').match(/\d+/)?.[0] || '0';
    const volume=mini[0]?text(mini[0].querySelector('strong')):'—';
    const duration=mini[2]?text(mini[2].querySelector('strong')):'—';
    const summary=document.createElement('section');
    summary.className='gx-workout-summary';
    summary.innerHTML=`<span class="gx-label">SESSION SUMMARY</span><div><article><small>VOLUME</small><strong>${volume}</strong><em>kg</em></article><article><small>EST. 1RM</small><strong>${oneRm}</strong></article><article><small>EXERCISES</small><strong>${draftCount}</strong></article><article><small>DURATION</small><strong>${duration}</strong><em>min</em></article></div>`;
    const builder=main.querySelector('.workout-builder-v2');
    builder?.insertAdjacentElement('beforebegin',summary);
  }

  function decorateBody() {
    if (!main.querySelector('.body-trend-primary') || main.querySelector('.gx-body-result')) return;
    const heroMetrics=[...main.querySelectorAll('.body-hero-metrics>div')];
    const result=document.createElement('section');
    result.className='gx-body-result';
    result.innerHTML='<span class="gx-label">RESULT (Auto calculated)</span><div></div>';
    const grid=result.querySelector('div');
    const preferred=heroMetrics.slice(0,3);
    preferred.forEach(x=>{
      const a=document.createElement('article');
      a.innerHTML=`<small>${text(x.querySelector('span'))}</small><strong>${text(x.querySelector('b'))}</strong>`;
      grid.appendChild(a);
    });
    const drawer=main.querySelector('.body-entry-drawer');
    drawer?.insertAdjacentElement('afterend',result);
  }

  function decorate() { decorateToday(); decorateWorkout(); decorateBody(); }
  let queued=false;
  const observer=new MutationObserver(()=>{
    if(queued)return; queued=true;
    requestAnimationFrame(()=>{queued=false;decorate();});
  });
  observer.observe(main,{childList:true,subtree:true});
  decorate();
})();
