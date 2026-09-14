/* GARANG Today Rebuild v1
   Fresh presentation DOM driven by existing state/intelligence contracts.
   Golden Path remains the canonical next-action owner; this layer only presents and forwards it.
*/
(() => {
  'use strict';
  if(window.__garangTodayRebuildV1)return;
  window.__garangTodayRebuildV1=true;
  const main=document.getElementById('main');
  if(!main)return;
  function ensureStyle(){
    if(document.querySelector('link[data-garang-rebuild-system-v1]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./03_styles/runtime/garang-rebuild-system-v1.css?v=1.0.0';
    link.dataset.garangRebuildSystemV1='1';
    document.head.appendChild(link);
  }
  ensureStyle();
  const esc=value=>String(value??'').replace(/[&<>\"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[ch]));
  const list=value=>Array.isArray(value)?value:[];
  const todayLocal=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  let expanded=false,queued=false;

  function state(){
    try{return window.GarangAgentStateBridge?.getState?.()||null;}catch{return null;}
  }
  function model(snapshot){
    const api=window.GarangTodayActionFlow;
    if(!api?.deriveModel)return null;
    try{
      return api.deriveModel(snapshot,{
        lang:document.documentElement.lang==='en'?'en':'ko',
        PlanExecution:window.GarangPlanExecution,
        StateIntelligence:window.GarangStateIntelligence,
        DecisionIntelligence:window.GarangDecisionIntelligence,
        PerformanceScore:window.GarangPerformanceScore,
        date:todayLocal()
      });
    }catch{return null;}
  }
  function detailRows(m){
    const reasons=list(m.detailReasons).slice(0,3);
    const extra=[];
    if(Number.isFinite(Number(m.progress)))extra.push({label:m.lang==='en'?'Plan':'계획',value:`${m.executed} / ${m.planned} · ${m.progress}%`});
    if(Number.isFinite(Number(m.recoveryScore)))extra.push({label:m.lang==='en'?'Recovery':'회복',value:`${Math.round(m.recoveryScore)} / 100`});
    if(Number.isFinite(Number(m.overallScore)))extra.push({label:'GARANG',value:`${Math.round(m.overallScore)} / 100`});
    return [
      ...reasons.map((text,index)=>({label:m.lang==='en'?`Reason ${index+1}`:`근거 ${index+1}`,value:text})),
      ...extra
    ];
  }
  function canonicalAction(m){
    const id=String(main.dataset.gsnAction||'').trim();
    if(!id)return null;
    const step=String(main.dataset.gpStep||'').trim();
    const ko=m.lang!=='en';
    let label='';
    let note='';
    if(id==='checkin'){
      const access=main.querySelector('#garangTodayFlow [data-garang-checkin-access="1"]');
      label=access?.querySelector('strong')?.textContent?.trim()||'';
      note=access?.querySelector('small')?.textContent?.trim()||'';
    }else{
      const button=[...main.querySelectorAll('#garangTodayFlow .gtf-next[data-gsn-action]')].find(node=>node.dataset.gsnAction===id);
      label=button?.getAttribute('aria-label')||button?.textContent?.replace('→','').trim()||'';
    }
    const fallback={
      checkin:ko?'오늘 상태 체크인':'Check in today',
      coach:ko?'Coach에서 판단 보기':'Open Coach',
      record:ko?'첫 기록 남기기':'Leave first record',
      execute:ko?'계획 실행하기':'Execute plan',
      accumulation:ko?'누적 확인하기':'View accumulation'
    };
    return {id,step,label:label||fallback[id]||m.cta,note};
  }
  function markup(m){
    const date=String(m.date||'').slice(5).replace('-','.');
    const score=m.stateValue===null||m.stateValue===undefined?'—':m.stateValue;
    const unit=String(m.stateUnit||'');
    const tracks=list(m.tracks).map(track=>{
      const rate=Math.max(0,Math.min(100,Number(track.rate)||0));
      const title=track.title||track.value||'—';
      const sub=track.title?track.value:'';
      return `<div class="gtr1-track" data-state="${esc(track.state)}" data-domain="${esc(track.domain)}"><span>${esc(track.label)}</span><strong>${esc(title)}</strong><em>${esc(sub)}</em><i aria-hidden="true"><b style="width:${rate}%"></b></i></div>`;
    }).join('');
    const rows=detailRows(m).map(row=>`<div class="gtr1-reason"><span>${esc(row.label)}</span><p>${esc(row.value)}</p></div>`).join('');
    const canonical=canonicalAction(m);
    const actionAttrs=canonical
      ?`data-gtr1-canonical-action="${esc(canonical.id)}" data-gtr1-step="${esc(canonical.step)}"`
      :(m.route?`data-gtr1-route="${esc(m.route)}"`:`data-gtr1-action="${esc(m.action||'')}"`);
    const headline=m.decisionLine||m.headline;
    const reason=m.decisionReason||m.support;
    const fallbackTitle=m.nextTitle?`${m.cta} · ${m.nextTitle}`:m.cta;
    const nextTitle=canonical?.label||fallbackTitle;
    const nextNote=canonical?.note||m.support;
    return `<section id="garangTodayRebuild" class="gtr1" data-mode="${esc(m.mode)}" data-canonical-action="${esc(canonical?.id||'')}" aria-label="${m.lang==='en'?'Today':'오늘'}">
      <div class="gtr1-kicker"><span>GARANG / TODAY</span><time>${esc(date)}</time></div>
      <header class="gtr1-hero"><h1>${esc(headline)}</h1><p>${esc(reason)}</p></header>
      <section class="gtr1-state" aria-label="${m.lang==='en'?'Current state':'현재 상태'}">
        <div class="gtr1-score"><span>${esc(m.stateLabel)}</span><strong>${esc(score)}<small>${esc(unit)}</small></strong></div>
        <div class="gtr1-tracks">${tracks}</div>
      </section>
      <section class="gtr1-next"><button type="button" class="gtr1-next-card" ${actionAttrs}><span><span class="gtr1-next-label">NEXT ACTION</span><strong>${esc(nextTitle)}</strong></span><span class="gtr1-arrow" aria-hidden="true">→</span></button><p class="gtr1-next-note">${esc(nextNote)}</p></section>
      <section class="gtr1-detail"><button type="button" class="gtr1-detail-toggle" data-gtr1-detail aria-expanded="${expanded?'true':'false'}"><span>${m.lang==='en'?'Why this decision?':'왜 이런 판단인가?'}</span><b aria-hidden="true">${expanded?'−':'+'}</b></button><div class="gtr1-detail-panel" ${expanded?'':'hidden'}>${rows}</div></section>
      <p class="gtr1-quote">${m.lang==='en'?'Small actions become long-term change when they remain connected.':'작은 행동은 연결되어 쌓일 때 장기 변화가 됩니다.'}<strong>QUIETLY BECOMING.</strong></p>
    </section>`;
  }
  function hideLegacy(root){
    [...root.children].forEach(child=>{
      if(child.id==='garangTodayRebuild')return;
      child.classList.add('gtr1-legacy-hidden');
      child.setAttribute('aria-hidden','true');
    });
  }
  function clearLegacyState(root){
    [...root.children].forEach(child=>{
      if(child.id==='garangTodayRebuild')return;
      child.classList.remove('gtr1-legacy-hidden');
      child.removeAttribute('aria-hidden');
    });
  }
  function render(){
    queued=false;
    if(main.dataset.garangScreen!=='today'){
      main.querySelector('#garangTodayRebuild')?.remove();
      clearLegacyState(main);
      return;
    }
    const snapshot=state();
    if(!snapshot)return;
    const m=model(snapshot);
    if(!m)return;
    const host=document.createElement('div');
    host.innerHTML=markup(m);
    const next=host.firstElementChild;
    const current=main.querySelector('#garangTodayRebuild');
    if(current)current.replaceWith(next); else main.prepend(next);
    hideLegacy(main);
  }
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(render));}
  function forwardCanonical(action){
    const id=String(action?.dataset?.gtr1CanonicalAction||'').trim();
    if(!id)return false;
    try{window.GarangTodaySingleNextActionV1?.syncNow?.();}catch{}
    if(id==='checkin'){
      const access=main.querySelector('#garangTodayFlow [data-garang-checkin-access="1"]');
      if(access){access.click();return true;}
      const native=[...main.querySelectorAll('[data-action="open-checkin"]')].find(el=>!el.closest('#garangTodayRebuild'));
      native?.click();
      return !!native;
    }
    const legacy=[...main.querySelectorAll('#garangTodayFlow .gtf-next[data-gsn-action]')].find(node=>node.dataset.gsnAction===id);
    if(legacy){legacy.click();return true;}
    const fallbackRoute={coach:'coach',record:'log',accumulation:'progress'}[id];
    if(fallbackRoute)return window.GarangRouter?.navigate?.(fallbackRoute,{source:'today-rebuild-v1-canonical'})===true;
    return false;
  }

  document.addEventListener('click',event=>{
    const detail=event.target.closest?.('[data-gtr1-detail]');
    if(detail&&main.contains(detail)){
      event.preventDefault();expanded=!expanded;render();return;
    }
    const canonical=event.target.closest?.('[data-gtr1-canonical-action]');
    if(canonical&&main.contains(canonical)){
      event.preventDefault();forwardCanonical(canonical);return;
    }
    const route=event.target.closest?.('[data-gtr1-route]');
    if(route&&main.contains(route)){
      event.preventDefault();window.GarangRouter?.navigate?.(route.dataset.gtr1Route,{source:'today-rebuild-v1'});return;
    }
    const action=event.target.closest?.('[data-gtr1-action]');
    if(action&&main.contains(action)){
      event.preventDefault();
      if(action.dataset.gtr1Action==='open-checkin'){
        const native=[...main.querySelectorAll('[data-action="open-checkin"]')].find(el=>!el.closest('#garangTodayRebuild'));
        native?.click();
      }
    }
  },true);
  const ownerObserver=new MutationObserver(schedule);
  ownerObserver.observe(main,{attributes:true,attributeFilter:['data-gsn-action','data-gp-step','data-gsn-checked','data-garang-next-owner']});
  for(const name of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed','garang:agent-write'])window.addEventListener(name,schedule);
  document.documentElement.addEventListener('garang:language-changed',schedule);
  window.addEventListener('pageshow',schedule);
  schedule();
  window.GarangTodayRebuildV1=Object.freeze({version:'1.1.0',render,schedule,forwardCanonical});
})();
