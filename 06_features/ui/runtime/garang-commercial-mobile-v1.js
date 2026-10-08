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
  #main[data-garang-screen="workout"]:has(#workoutDraftArea .list-item) .workout-draft-head{display:flex!important}
  #main[data-garang-screen="workout"]:has(#workoutDraftArea .list-item) #workoutDraftArea{
    display:block!important;visibility:visible!important;opacity:1!important;
    scroll-margin-top:96px!important;scroll-margin-bottom:96px!important
  }
  #workoutDraftArea .workout-draft-actions{
    display:flex!important;align-items:center!important;justify-content:flex-end!important;
    gap:8px!important;min-width:0!important;overflow:visible!important
  }
  #workoutDraftArea .workout-draft-record,
  #workoutDraftArea .workout-draft-manage>summary{
    box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:center!important;
    min-height:44px!important;height:44px!important;min-width:64px!important;width:auto!important;
    padding:0 12px!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important
  }
}
`;
    document.head.appendChild(style);
  }
  function ensureReferenceV2Style(){
    if(document.getElementById('garangReferenceV2Style'))return;
    const style=document.createElement('style');
    style.id='garangReferenceV2Style';
    style.textContent=`
:root{
  --gapp-bg:#080b0f!important;--gapp-surface:#111318!important;--gapp-surface-2:#151821!important;
  --gapp-surface-3:#1b1f2b!important;--gapp-line:rgba(148,163,184,.16)!important;
  --gapp-line-strong:rgba(148,163,184,.25)!important;--gapp-text:#f8fafc!important;
  --gapp-text-2:#cbd5e1!important;--gapp-text-3:#7f8a9b!important;--gapp-signal:#6366f1!important;
  --gapp-signal-2:#818cf8!important;--garang-cheongja:#6366f1!important;--garang-cheongja-deep:#30358f!important
}
html[data-garang-ui-v2="2"],html[data-garang-ui-v2="2"] body{background:#080b0f!important;color:#f8fafc!important}
html[data-garang-ui-v2="2"] body{
  background-image:radial-gradient(circle at 75% -8%,rgba(99,102,241,.12),transparent 30%),linear-gradient(180deg,#080b0f,#080b0f)!important
}
html[data-garang-ui-v2="2"] #appView:not([hidden])>.topbar{
  background:rgba(8,11,15,.96)!important;border-bottom:1px solid rgba(148,163,184,.09)!important;box-shadow:0 8px 26px rgba(0,0,0,.24)!important
}
html[data-garang-ui-v2="2"] #main .card,
html[data-garang-ui-v2="2"] #main .list-item,
html[data-garang-ui-v2="2"] #main .status-visual-card,
html[data-garang-ui-v2="2"] #main .today-plan-card,
html[data-garang-ui-v2="2"] #main .coach-status-card,
html[data-garang-ui-v2="2"] #main .one-rm-panel,
html[data-garang-ui-v2="2"] #main .body-hero{
  background:linear-gradient(180deg,rgba(255,255,255,.018),rgba(255,255,255,0)),#111318!important;
  border-color:rgba(148,163,184,.16)!important;border-radius:17px!important;box-shadow:0 14px 34px rgba(0,0,0,.22)!important
}
html[data-garang-ui-v2="2"] #main .primary,
html[data-garang-ui-v2="2"] #main button.primary,
html[data-garang-ui-v2="2"] #main .gtf-next{
  border-color:rgba(129,140,248,.46)!important;background:linear-gradient(180deg,#6670ff,#4f56e8)!important;
  color:#fff!important;box-shadow:0 10px 26px rgba(79,70,229,.28)!important;border-radius:13px!important
}
html[data-garang-ui-v2="2"] #main .ghost,html[data-garang-ui-v2="2"] #main button.ghost{
  background:#151821!important;border-color:rgba(148,163,184,.2)!important;color:#d7deea!important
}
html[data-garang-ui-v2="2"] #main input,html[data-garang-ui-v2="2"] #main select,html[data-garang-ui-v2="2"] #main textarea{
  background:#0d1016!important;border-color:rgba(148,163,184,.2)!important;color:#f8fafc!important
}
html[data-garang-ui-v2="2"] #main input:focus,html[data-garang-ui-v2="2"] #main select:focus,html[data-garang-ui-v2="2"] #main textarea:focus{
  border-color:rgba(129,140,248,.68)!important;box-shadow:0 0 0 3px rgba(99,102,241,.12)!important
}
html[data-garang-ui-v2="2"] #appView:not([hidden])>#bottomNav{
  background:rgba(8,11,15,.99)!important;border-top-color:rgba(148,163,184,.12)!important;box-shadow:0 -14px 36px rgba(0,0,0,.34)!important
}
html[data-garang-ui-v2="2"] #appView:not([hidden])>#bottomNav button{color:#707b8c!important}
html[data-garang-ui-v2="2"] #appView:not([hidden])>#bottomNav button.active{color:#818cf8!important;background:rgba(99,102,241,.07)!important}
html[data-garang-ui-v2="2"] #appView:not([hidden])>#bottomNav button.active:before{
  background:linear-gradient(90deg,transparent,#818cf8 24%,#818cf8 76%,transparent)!important
}

/* Reference floor: cinematic entry */
html[data-garang-ui-v2="2"] .auth-view{background:radial-gradient(circle at 50% 22%,rgba(99,102,241,.14),transparent 28%),#080b0f!important}
html[data-garang-ui-v2="2"] .auth-copy{position:relative;isolation:isolate;overflow:hidden;border-radius:24px;min-height:500px;padding:32px}
html[data-garang-ui-v2="2"] .auth-copy::before{
  content:"";position:absolute;inset:0;z-index:-2;background:url("./05_assets/body-model-v6/male-back.svg") center 28px/auto 88% no-repeat;opacity:.34;filter:grayscale(.18) contrast(1.08)
}
html[data-garang-ui-v2="2"] .auth-copy::after{
  content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(8,11,15,.04),rgba(8,11,15,.34) 45%,#080b0f 88%)
}
html[data-garang-ui-v2="2"] .auth-copy h1{font-weight:780!important;text-shadow:0 8px 30px #000}
html[data-garang-ui-v2="2"] .auth-card{background:#101319!important;border-color:rgba(148,163,184,.18)!important}

/* Today: one decisive hero, body evidence in the hero, compact evidence below */
html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow[data-gapp-role="today-primary"]{
  position:relative!important;overflow:hidden!important;min-height:330px!important;padding:20px!important;border-radius:21px!important;
  background:radial-gradient(circle at 84% 25%,rgba(99,102,241,.16),transparent 30%),linear-gradient(150deg,#121723,#0b0e14 72%)!important;
  border:1px solid rgba(129,140,248,.2)!important;box-shadow:0 24px 58px rgba(0,0,0,.36)!important
}
html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow[data-gapp-role="today-primary"]::before{
  content:"";position:absolute;right:-15px;bottom:42px;width:178px;height:230px;background:url("./05_assets/body-model-v6/male-front.svg") center/contain no-repeat;
  opacity:.31;filter:drop-shadow(0 14px 26px rgba(0,0,0,.4));pointer-events:none
}
html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-state,
html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-decision,
html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-action{position:relative;z-index:2;max-width:74%}
html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-decision h2{font-size:27px!important;line-height:1.17!important;font-weight:800!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-decision>span{color:#818cf8!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] .today-snapshot{gap:8px!important;background:transparent!important;border:0!important;overflow:visible!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] .today-snapshot>div{background:#111318!important;border:1px solid rgba(148,163,184,.14)!important;border-radius:14px!important}

/* Workout: timer -> current set -> rest -> next action */
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-session-bar,
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-session-bar.is-live{
  background:linear-gradient(155deg,#111522,#0c0f16)!important;border-color:rgba(129,140,248,.24)!important;box-shadow:0 18px 44px rgba(0,0,0,.4)!important
}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-session-bar.is-live::before{background:#6366f1!important;box-shadow:0 0 18px rgba(99,102,241,.75)!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-session-live strong{
  font-size:46px!important;line-height:1!important;font-weight:820!important;color:#f8fafc!important;font-variant-numeric:tabular-nums!important
}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-session-live span{color:#8e99aa!important;letter-spacing:.12em!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-session-live i{background:#818cf8!important;box-shadow:0 0 0 4px rgba(99,102,241,.13)!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-finish{background:#4f56e8!important;color:#fff!important;border-color:#6971ff!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .execution-set-row{border-color:rgba(148,163,184,.1)!important;background:transparent!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .execution-set-row> b{background:#171b24!important;color:#9aa6b8!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .execution-set-row input{background:#0e1219!important;color:#f8fafc!important;border-color:rgba(148,163,184,.17)!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .execution-set-row.current-set{
  border:1px solid rgba(129,140,248,.32)!important;border-radius:15px!important;background:linear-gradient(145deg,rgba(99,102,241,.09),rgba(255,255,255,.01))!important;
  box-shadow:0 12px 28px rgba(0,0,0,.2)!important
}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .execution-set-row.current-set> b{background:#6366f1!important;color:#fff!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .execution-set-row.current-set input{height:52px!important;font-size:19px!important;font-weight:800!important;border-color:rgba(129,140,248,.42)!important;background:#121728!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .set-complete-button.is-complete{background:#6366f1!important;border-color:#818cf8!important;color:#fff!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-rest-timer{background:linear-gradient(150deg,#111522,#0c0f16)!important;border-color:rgba(129,140,248,.22)!important;color:#fff!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-rest-timer>div strong{font-size:34px!important;color:#fff!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] #workoutDraftArea .list-item{background:#111318!important;border-color:rgba(148,163,184,.14)!important}

/* Nutrition: camera/meal image is the visual anchor */
html[data-garang-ui-v2="2"] #main[data-garang-screen="nutrition"] .meal-scan-card[data-gapp-role="nutrition-scan"]{padding:12px!important;background:#101319!important;border-color:rgba(148,163,184,.16)!important;border-radius:20px!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="nutrition"] .meal-scan-empty{
  min-height:235px!important;border:1px solid rgba(129,140,248,.22)!important;border-radius:17px!important;color:#eef2ff!important;
  background:radial-gradient(circle at 50% 48%,rgba(99,102,241,.14),transparent 38%),#0b0e14!important;box-shadow:inset 0 0 0 1px rgba(129,140,248,.04)!important
}
html[data-garang-ui-v2="2"] #main[data-garang-screen="nutrition"] .photo-evidence-stage.gapp-has-media{min-height:280px!important;border-radius:17px!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="nutrition"] .nutrition-quick-summary[data-gapp-role="nutrition-hero"]{background:linear-gradient(145deg,#121722,#0b0e14 72%)!important;border-color:rgba(148,163,184,.14)!important;border-radius:19px!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="nutrition"] .nutrition-quick-summary[data-gapp-role="nutrition-hero"]::before{
  background:radial-gradient(circle at center,#0d1118 62%,transparent 63%),conic-gradient(#6366f1 calc(var(--gapp-nutrition-progress,0)*1%),rgba(255,255,255,.075) 0)!important;
  box-shadow:0 0 0 1px rgba(99,102,241,.18),0 0 32px rgba(99,102,241,.1)!important
}
html[data-garang-ui-v2="2"] #main[data-garang-screen="nutrition"] .nutrition-summary-progress>i>em{background:linear-gradient(90deg,#6366f1,#22d3ee)!important}

/* Body: anatomy is the hero */
html[data-garang-ui-v2="2"] #main[data-garang-screen="body"] .body-hero[data-gapp-role="body-hero"]{
  min-height:410px!important;grid-template-columns:1fr!important;padding:16px!important;border-radius:20px!important;
  background:radial-gradient(circle at 50% 34%,rgba(99,102,241,.14),transparent 31%),linear-gradient(145deg,#121621,#0a0d13 74%)!important
}
html[data-garang-ui-v2="2"] #main[data-garang-screen="body"] .body-hero-anatomy{width:100%!important;min-width:0!important;height:285px!important;border-radius:20px!important;background:radial-gradient(circle,rgba(99,102,241,.1),transparent 64%)!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="body"] .body-hero-metrics>div{background:#111318!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="body"] .body-metric-tabs button.active,
html[data-garang-ui-v2="2"] #main[data-garang-screen="body"] .body-range-tabs button.active{background:#6366f1!important;color:#fff!important;border-color:#818cf8!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="body"] .body-trend-svg .chart-line{stroke:#818cf8!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="body"] .body-trend-svg .chart-area{fill:rgba(99,102,241,.1)!important}

/* Coach: quiet native chat, action color reserved for the next move */
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .garang-coach-v2,
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .g2-chat-main{background:#090c12!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .g2-chat-head{background:rgba(10,13,19,.97)!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .g2-chat-head-copy small{color:#818cf8!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .g2-message.user .g2-message-body,
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .gpt-message.user .gpt-content{background:#171c2e!important;border-color:rgba(129,140,248,.2)!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .coach-suggestions button{background:#11162a!important;border-color:rgba(129,140,248,.2)!important;color:#c7d2fe!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .g2-composer,
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .gpt-composer{background:#121621!important;border-color:rgba(148,163,184,.2)!important}
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .g2-send,
html[data-garang-ui-v2="2"] #main[data-garang-screen="coach"] .gpt-send{background:#6366f1!important;color:#fff!important;box-shadow:0 8px 20px rgba(79,70,229,.28)!important}

@media(max-width:799px){
  html[data-garang-ui-v2="2"] #appView:not([hidden])>#main{max-width:560px!important;padding-left:14px!important;padding-right:14px!important}
  html[data-garang-ui-v2="2"] #appView:not([hidden])>#bottomNav{max-width:560px!important}
  html[data-garang-ui-v2="2"] #main .page-head h1{font-size:27px!important}
  html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow[data-gapp-role="today-primary"]{min-height:340px!important;padding:17px!important}
  html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow[data-gapp-role="today-primary"]::before{right:-20px;bottom:55px;width:155px;height:212px}
  html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-state,
  html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-decision,
  html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-action{max-width:77%}
  html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-session-live strong{font-size:42px!important}
}
@media(max-width:390px){
  html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow .gtf-decision h2{font-size:24px!important}
  html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .workout-session-live strong{font-size:39px!important}
}
@media(max-width:340px){
  html[data-garang-ui-v2="2"] #appView:not([hidden])>#main{padding-left:10px!important;padding-right:10px!important}
  html[data-garang-ui-v2="2"] #main[data-garang-screen="today"] #garangTodayFlow[data-gapp-role="today-primary"]::before{width:135px;opacity:.23}
  html[data-garang-ui-v2="2"] #main[data-garang-screen="workout"] .execution-set-row.current-set input{font-size:17px!important}
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
    ensureReferenceV2Style();
    const root=main(); if(!root)return;
    const s=screen();
    document.documentElement.dataset.garangCommercialMobile='1';
    document.documentElement.dataset.garangUiV2='2';
    document.body.dataset.garangCommercialScreen=s;
    root.dataset.garangCommercialMobile='1';
    root.dataset.garangUiV2='2';
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
  ensureReferenceV2Style();
  observeCanonicalSurfaces();schedule();
})();