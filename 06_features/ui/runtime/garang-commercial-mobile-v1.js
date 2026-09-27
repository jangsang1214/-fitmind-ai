/* GARANG Commercial Mobile Runtime v1
   Presentation-only annotations for the premium mobile visual system.
   No user-state writes, no routing ownership, no persistence mutations.
*/
(() => {
  'use strict';
  if (window.GarangCommercialMobileV1) return;
  const VERSION='garang-commercial-mobile-v1.0.0';
  const main=()=>document.getElementById('main');
  const screen=()=>main()?.dataset?.garangScreen||'';
  let scheduled=false,lastScreen='';

  const visible=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none';
  function mark(el,name){ if(el) el.dataset.gappRole=name; }
  function pctFromWidth(el){
    if(!el)return 0;
    const raw=el.style?.width||'';
    const n=Number.parseFloat(raw);
    return Number.isFinite(n)?Math.max(0,Math.min(100,n)):0;
  }
  function annotatePhotos(root){
    root?.querySelectorAll('.photo-evidence-stage').forEach(stage=>{
      stage.classList.toggle('gapp-has-media',!!stage.querySelector('img,video'));
      stage.classList.toggle('gapp-media-empty',!stage.querySelector('img,video'));
    });
  }
  function annotateToday(root){
    const flow=root.querySelector('#garangTodayFlow');
    mark(flow,'today-primary');
    mark(flow?.querySelector('.gtf-state'),'today-state');
    mark(flow?.querySelector('.gtf-decision'),'today-decision');
    mark(flow?.querySelector('.gtf-action'),'today-action');
    mark(root.querySelector('.today-hero'),'today-body-evidence');
  }
  function annotateNutrition(root){
    const summary=root.querySelector('.nutrition-quick-summary');
    mark(summary,'nutrition-hero');
    const bar=summary?.querySelector('.nutrition-summary-progress em');
    const pct=pctFromWidth(bar);
    if(summary)summary.style.setProperty('--gapp-nutrition-progress',String(pct));
    mark(root.querySelector('.meal-scan-card'),'nutrition-scan');
    mark(root.querySelector('.recent-meals-card'),'nutrition-recent');
    root.querySelectorAll('.meal-visual-card').forEach(x=>mark(x,'nutrition-meal'));
  }
  function annotateRunning(root){
    const first=root.querySelector(':scope > .grid.grid-2 > .card:first-child');
    mark(first,'running-live');
    const map=first?.querySelector('.map-box');
    mark(map,'running-map');
    if(first){
      const active=visible(first.querySelector('#runPause'))||visible(first.querySelector('#runResume'));
      first.classList.toggle('gapp-running-live',active);
    }
    mark(root.querySelector('.photo-evidence-card-running'),'running-media');
  }
  function annotateBody(root){
    mark(root.querySelector('.body-hero'),'body-hero');
    mark(root.querySelector('.body-trend-card'),'body-trend');
    mark(root.querySelector('.body-entry-drawer'),'body-entry');
  }
  function annotateWorkout(root){
    mark(root.querySelector('.workout-hero-v2,.workout-visual-hero'),'workout-hero');
    mark(root.querySelector('.workout-session-bar'),'workout-live');
    mark(root.querySelector('.cert-entry-card'),'workout-media');
    root.querySelectorAll('.exercise-visual-card').forEach(x=>mark(x,'exercise-card'));
  }
  function annotateCoach(root){
    mark(root.querySelector('.coach-status-card,.g2-chat-head'),'coach-context');
    mark(root.querySelector('.gpt-composer,.g2-composer'),'coach-composer');
    mark(root.querySelector('.coach-thread,.g2-chat-scroll'),'coach-thread');
  }
  function annotateProgress(root){
    const acc=root.querySelector('#garangAccumulationOverview');
    mark(acc,'progress-hero');
    mark(acc?.querySelector('.gx-hero'),'progress-score');
    mark(acc?.querySelector('[data-gx-meaning-loop]'),'progress-meaning');
    root.querySelectorAll('.review-cell').forEach(x=>mark(x,'progress-metric'));
  }
  function annotateRecord(){
    document.querySelectorAll('.garang-record-route').forEach(button=>{
      const route=button.dataset.garangRecordRoute||button.dataset.garangRecordAction||'';
      button.dataset.gappIcon=route;
    });
  }
  function apply(){
    scheduled=false;
    const root=main(); if(!root)return;
    const s=screen();
    document.documentElement.dataset.garangCommercialMobile='1';
    document.body.dataset.garangCommercialScreen=s;
    root.dataset.garangCommercialMobile='1';
    annotatePhotos(root);annotateRecord();
    if(s==='today')annotateToday(root);
    else if(s==='nutrition')annotateNutrition(root);
    else if(s==='running')annotateRunning(root);
    else if(s==='body')annotateBody(root);
    else if(s==='workout')annotateWorkout(root);
    else if(s==='coach')annotateCoach(root);
    else if(s==='progress')annotateProgress(root);
    if(s!==lastScreen){
      root.classList.remove('gapp-screen-enter');
      void root.offsetWidth;
      root.classList.add('gapp-screen-enter');
      lastScreen=s;
    }
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply)}
  window.addEventListener('garang:screen-rendered',schedule);
  window.addEventListener('garang:route-completed',schedule);
  window.addEventListener('garang:state-updated',schedule);
  window.addEventListener('pageshow',schedule);
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#bottomNav,[data-garang-record-sheet],#runStart,#runPause,#runResume,#runStop'))setTimeout(schedule,0);
  },true);
  window.GarangCommercialMobileV1=Object.freeze({version:VERSION,apply,schedule});
  schedule();
})();