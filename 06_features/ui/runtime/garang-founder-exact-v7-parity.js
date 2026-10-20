/* GARANG Founder Exact v7 — parity controller. Consolidate into the v7 base before merge. */
(()=>{
'use strict';
if(window.__garangExactV7Parity)return;window.__garangExactV7Parity=true;
const q=(r,s)=>r?.querySelector?.(s)||null,qa=(r,s)=>[...(r?.querySelectorAll?.(s)||[])];
const main=()=>document.getElementById('main'),screen=()=>String(main()?.dataset?.garangScreen||'');
function imp(n,k,v){n?.style?.setProperty?.(k,v,'important')}function show(n,d='block'){if(!n)return;n.hidden=false;n.removeAttribute('aria-hidden');imp(n,'display',d);imp(n,'visibility','visible')}function hide(n){if(!n)return;imp(n,'display','none')}
function ensure(tag,cls,parent){let n=q(parent,`:scope > .${cls}`);if(n)return n;n=document.createElement(tag);n.className=cls;parent.appendChild(n);return n}
function forceNav(){const labels=['오늘','기록','코치','누적'];qa(document.getElementById('bottomNav'),'button[data-garang-primary-nav="1"]').slice(0,4).forEach((b,i)=>{const label=q(b,'b')||q(b,'span:last-child');if(label)label.textContent=labels[i];});}
function workout(m){
 const summary=m.classList.contains('g7-summary-mode')||!!q(m,':scope > .g7-summary-shell');
 if(summary){m.classList.add('g7-summary-mode');const shell=q(m,':scope > .g7-summary-shell');qa(m,':scope > *').forEach(n=>n===shell?show(n,'block'):hide(n));document.getElementById('toast')?.style?.setProperty('display','none','important');if(m.dataset.g7SummaryFocus!=='1'){m.dataset.g7SummaryFocus='1';requestAnimationFrame(()=>{window.scrollTo(0,0);m.scrollTop=0;});}return;}
 delete m.dataset.g7SummaryFocus;
 const live=!!q(m,'.workout-session-bar.is-live'),record=m.classList.contains('g7-record-mode');
 if(!live)return;
 let stage=q(m,':scope > .g7-execution-stage');if(!stage){stage=document.createElement('section');stage.className='g7-execution-stage';const ctx=q(m,':scope > .g7-set-context');(ctx||q(m,':scope > .g7-set-progress'))?.insertAdjacentElement('afterend',stage);}
 const details=document.getElementById('workoutSetDetails');if(details&&details.parentElement!==stage)stage.appendChild(details);show(stage,'block');
 // The binding board owns execution. Canonical setup/search remains mounted but hidden once the session is live.
 ['.gws-shell','.gws-panel','.workout-builder-v2','.workout-execution-v2','.workout-overview-surface','.exercise-visual-library'].forEach(sel=>qa(m,sel).forEach(n=>{if(n===stage||n.contains(stage))return;hide(n);}));
 // If stage used to live inside a hidden canonical panel, moving it out above preserves all row event owners.
 if(record){
  const tabs=q(m,':scope > .g7-record-tabs');if(tabs)show(tabs,'grid');
  const finish=q(m,':scope > .g7-record-finish');if(finish)show(finish,'block');
  if(m.dataset.g7RecordFocus!=='1'){m.dataset.g7RecordFocus='1';requestAnimationFrame(()=>{window.scrollTo(0,0);m.scrollTop=0;});}
 }else{
  delete m.dataset.g7RecordFocus;
  hide(q(m,':scope > .g7-record-tabs'));
 }
}
function nutrition(m){
 const shell=q(m,':scope > .g7-nutrition-shell');if(!shell)return;const head=q(shell,':scope > .g7-screen-head'),meal=q(shell,':scope > .meal-scan-card'),summary=q(shell,':scope > .g7-nutrition-summary');
 if(head&&meal&&head.nextElementSibling!==meal)head.insertAdjacentElement('afterend',meal);
 if(meal&&summary&&meal.nextElementSibling!==summary)meal.insertAdjacentElement('afterend',summary);
 qa(shell,':scope > *').forEach(child=>{const t=String(child.textContent||'').replace(/\s+/g,' ').trim();if(child!==meal&&child!==summary&&child!==head&&(/NEXT MEAL/i.test(t)||t.includes('다음 끼니')))child.classList.add('g7-next-meal-legacy');});
}
function settings(m){
 const shell=q(m,':scope > .g7-settings-shell'),stack=q(shell,'.settings-stack');if(!shell||!stack)return;stack.classList.add('g7-settings-list');
 qa(stack,':scope > .card').forEach(card=>{card.classList.add('g7-settings-item');let title=q(card,':scope > .settings-title')||q(card,':scope > h2,:scope > h3');if(!title)return;title.classList.add('g7-settings-item-title');if(!q(title,':scope > .g7-settings-chevron')){const c=document.createElement('span');c.className='g7-settings-chevron';c.textContent='›';title.appendChild(c);}if(title.dataset.g7Bound!=='1'){title.dataset.g7Bound='1';title.tabIndex=0;title.setAttribute('role','button');const toggle=()=>card.classList.toggle('g7-settings-open');title.addEventListener('click',toggle);title.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});}});
}
function coach(m){const page=q(m,':scope > .g7-coach-page');if(!page)return;const head=q(page,'.g2-chat-head');if(head){head.classList.add('g7-canonical-coach-head');qa(head,'.g5-settings,.g2-head-new').forEach(hide);}const side=q(page,'.g2-chat-sidebar');if(side)hide(side);}
function today(m){const flow=q(m,'#garangTodayFlow');if(!flow)return;qa(flow,'*').forEach(n=>{if(String(n.textContent||'').trim()==='GARANG SCORE')hide(n);});}
function apply(){const m=main();if(!m)return;forceNav();const s=screen();if(s==='workout')workout(m);else if(s==='nutrition')nutrition(m);else if(s==='settings')settings(m);else if(s==='coach')coach(m);else if(s==='today')today(m);}
let queued=false;function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply();});}
['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-set-rows-rendered','garang:workout-session-started','garang:coach-mounted','garang:coach-message-rendered','pageshow'].forEach(e=>window.addEventListener(e,schedule,{passive:true}));document.addEventListener('click',()=>setTimeout(schedule,0),true);window.GarangFounderExactV7Parity=Object.freeze({sync:schedule});schedule();
})();