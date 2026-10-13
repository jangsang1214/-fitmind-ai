/* GARANG Golden Master continuation bridge v1
   The Golden Master owns discovery/decision surfaces; canonical owners remain visible
   for execution, meal-scan confirmation, and full Coach conversation workflows.
*/
(() => {
'use strict';
if (window.GarangGoldenMasterContinuationV1) return;
const VERSION='garang-golden-master-continuation-v1.0.2';
const doc=document;
let activeRoute=null,rafQueued=false;
const main=()=>doc.getElementById('main');
const surfaceFor=route=>({today:'home',workout:'training',nutrition:'nutrition',coach:'coach'}[String(route||'')]||null);
function goldenNodes(){return ['garangGoldenTop','garangGoldenNav','garangGoldenMaster'].map(id=>doc.getElementById(id)).filter(Boolean);}
function normalizeHeader(){
  const bell=doc.querySelector('[data-gm-top="bell"]');
  if(!bell)return;
  bell.dataset.gmTop='settings';
  bell.setAttribute('aria-label','Settings');
  bell.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2-.6a7 7 0 0 0-.7-1.7l1-1.8-2.1-2.1-1.8 1A7 7 0 0 0 11.5 4L11 2H8l-.6 2a7 7 0 0 0-1.7.7l-1.8-1L1.8 5.8l1 1.8A7 7 0 0 0 2 9.5L0 10v3l2 .6a7 7 0 0 0 .8 1.8l-1 1.8 2.1 2.1 1.8-1a7 7 0 0 0 1.7.7L8 21h3l.6-2a7 7 0 0 0 1.8-.8l1.8 1 2.1-2.1-1-1.8a7 7 0 0 0 .7-1.8z"/></svg>';
}
function keepCanonicalVisible(){
  rafQueued=false;
  normalizeHeader();
  if(!activeRoute)return;
  doc.body.classList.add('gm-canonical-continuation');
  main()?.classList.remove('gm-shell-active');
  doc.querySelector('.topbar')?.removeAttribute('data-gm-canonical');
  doc.getElementById('bottomNav')?.removeAttribute('data-gm-canonical');
  for(const node of goldenNodes())node.style.setProperty('display','none','important');
}
function maintain(){
  if(rafQueued)return;
  rafQueued=true;
  requestAnimationFrame(keepCanonicalVisible);
}
function pulse(){
  keepCanonicalVisible();
  maintain();
  setTimeout(keepCanonicalVisible,90);
  setTimeout(keepCanonicalVisible,190);
}
function enter(route){
  activeRoute=String(route||'')||null;
  if(activeRoute)pulse();
  return !!activeRoute;
}
function restoreGolden(){
  doc.body.classList.remove('gm-canonical-continuation');
  for(const node of goldenNodes())node.style.removeProperty('display');
  window.GarangGoldenMasterV1?.schedule?.();
}
function exit(surface=null){
  activeRoute=null;
  restoreGolden();
  if(surface)window.GarangGoldenMasterV1?.setSurface?.(surface,{navigate:false});
  return true;
}
function proxy(id){const target=doc.getElementById(id);if(!target)return false;target.click();return true;}
function canonicalCoachSend(value){
  keepCanonicalVisible();
  const input=doc.querySelector('#coachInput,#aiQuestion,.g2-composer textarea,.g2-composer input,.coach-bottom-stack textarea,.coach-bottom-stack input');
  if(!input)return false;
  input.value=value;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
  const send=input.closest('form')?.querySelector('button[type="submit"]')||doc.querySelector('.g2-send,#askAI,[data-coach-send],#coachSend,#askCoach,.g2-composer button[type="submit"]');
  if(!send)return false;
  send.click();
  maintain();
  return true;
}
function dispatchCoach(value,attempt=0){
  if(canonicalCoachSend(value))return true;
  if(attempt>=3)return false;
  setTimeout(()=>dispatchCoach(value,attempt+1),120+attempt*80);
  return false;
}
doc.addEventListener('click',event=>{
  if(event.target.closest?.('[data-gm-start]')){enter('workout');return;}
  if(event.target.closest?.('[data-gm-meal-scan]')){enter('nutrition');return;}
  const top=event.target.closest?.('[data-gm-top]');
  if(!top)return;
  const action=top.dataset.gmTop;
  if(action==='menu'||action==='more'){event.preventDefault();setTimeout(()=>proxy('menuBtn'),0);return;}
  if(action==='settings'){event.preventDefault();setTimeout(()=>proxy('settingsTopBtn'),0);}
},true);
doc.addEventListener('submit',event=>{
  const form=event.target.closest?.('[data-gm-coach-form]');
  if(!form)return;
  const value=String(form.querySelector('input')?.value||'').trim();
  if(!value)return;
  enter('coach');
  setTimeout(()=>dispatchCoach(value),160);
},true);
for(const name of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed'])window.addEventListener(name,event=>{
  maintain();
  if(!activeRoute)return;
  const route=String(event?.detail?.route||event?.detail?.screen||main()?.dataset?.garangScreen||'');
  if(!route||route===activeRoute)return;
  const surface=surfaceFor(route);
  if(surface){exit(surface);return;}
  activeRoute=route;
  maintain();
},{passive:true});
function boot(){maintain();}
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.GarangGoldenMasterContinuationV1=Object.freeze({version:VERSION,enter,exit,get activeRoute(){return activeRoute;}});
})();
