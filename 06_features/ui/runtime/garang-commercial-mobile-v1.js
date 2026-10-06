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
  let scheduled=false,lastScreen='',observer=null,observedMain=null,focusWorkoutDraft=false;

  const visible=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none';
  function mark(el,name){ if(el) el.dataset.gappRole=name; }
  function ensureRuntimeStyle(){
    if(document.getElementById('garangCommercialMobileRuntimeStyle'))return;
    const style=document.createElement('style');
    style.id='garangCommercialMobileRuntimeStyle';
    style.textContent=`
@media(max-width:800px){
  #main[data-garang-screen="workout"]:has(#workoutDraftArea .list-item) .workout-draft-head{
    display:flex!important;
  }
  #main[data-garang-screen="workout"]:has(#workoutDraftArea .list-item) #workoutDraftArea{
    display:block!important;visibility:visible!important;opacity:1!important;
    scroll-margin-top:96px!important;scroll-margin-bottom:96px!important;
  }
  #workoutDraftArea .workout-draft-actions{
    display:flex!important;align-items:center!important;justify-content:flex-end!important;
    gap:8px!important;min-width:0!important;overflow:visible!important;
  }
  #workoutDraftArea .workout-draft-record,
  #workoutDraftArea .workout-draft-manage>summary{
    box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;
    min-height:44px!important;height:44px!important;min-width:64px!important;width:auto!important;
    padding:0 12px!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;
  }
}
`;
    document.head.appendChild(style);
  }
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
    root.dataset.garangDecisionOwner='coach';
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
    if(focusWorkoutDraft){
      const draft=root.querySelector('#workoutDraftArea .list-item')?.closest('#workoutDraftArea');
      if(draft&&visible(draft)){
        focusWorkoutDraft=false;
        requestAnimationFrame(()=>draft.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'}));
      }
    }
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
    ensureRuntimeStyle();
    const root=main(); if(!root)return;
    const s=screen();
    document.documentElement.dataset.garangCommercialMobile='1';
    document.body.dataset.garangCommercialScreen=s;
    root.dataset.garangCommercialMobile='1';
    if(s!=='today')root.removeAttribute('data-garang-decision-owner');
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
  function observeCanonicalSurfaces(){
    const root=main();if(!root||root===observedMain)return;
    observer?.disconnect();observedMain=root;
    observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type!=='childList'||(!record.addedNodes?.length&&!record.removedNodes?.length))continue;
        schedule();break;
      }
    });
    observer.observe(root,{childList:true,subtree:true});
  }
  window.addEventListener('garang:screen-rendered',()=>{observeCanonicalSurfaces();schedule();});
  window.addEventListener('garang:route-completed',schedule);
  window.addEventListener('garang:state-updated',schedule);
  window.addEventListener('pageshow',schedule);
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#addWorkout')){
      focusWorkoutDraft=true;
      setTimeout(schedule,0);
    }
    if(event.target.closest?.('#bottomNav,[data-garang-record-sheet],#runStart,#runPause,#runResume,#runStop'))setTimeout(schedule,0);
  },true);
  window.GarangCommercialMobileV1=Object.freeze({version:VERSION,apply,schedule});
  ensureRuntimeStyle();
  observeCanonicalSurfaces();schedule();
})();