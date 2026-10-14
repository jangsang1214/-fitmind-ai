/* GARANG Golden Master Board continuation bridge v1
   Golden Board owns visible discovery surfaces. Existing canonical owners remain visible for execution and write flows.
*/
(() => {
'use strict';
if(window.GarangGoldenBoardContinuationV1)return;
const VERSION='garang-golden-board-continuation-v1.0.0';
const doc=document;
let activeRoute=null,rafQueued=false;
const main=()=>doc.getElementById('main');
const boardNodes=()=>['garangGoldenBoardTop','garangGoldenBoardNav','garangGoldenBoard'].map(id=>doc.getElementById(id)).filter(Boolean);
const surfaceFor=route=>({today:'home',workout:'training',nutrition:'nutrition',coach:'coach'}[String(route||'')]||null);
function keepCanonicalVisible(){
  rafQueued=false;
  if(!activeRoute)return;
  doc.body.classList.add('gmb-canonical-continuation');
  main()?.classList.remove('gmb-shell-active');
  doc.querySelector('.topbar')?.removeAttribute('data-gmb-canonical');
  doc.getElementById('bottomNav')?.removeAttribute('data-gmb-canonical');
  for(const node of boardNodes())node.style.setProperty('display','none','important');
}
function maintain(){if(rafQueued)return;rafQueued=true;requestAnimationFrame(keepCanonicalVisible);}
function pulse(){keepCanonicalVisible();maintain();setTimeout(keepCanonicalVisible,90);setTimeout(keepCanonicalVisible,220);}
function enter(route){activeRoute=String(route||'')||null;if(activeRoute)pulse();return !!activeRoute;}
function restoreBoard(){
  doc.body.classList.remove('gmb-canonical-continuation');
  for(const node of boardNodes())node.style.removeProperty('display');
  window.GarangGoldenMasterBoardV1?.schedule?.();
}
function exit(surface=null){activeRoute=null;restoreBoard();if(surface)window.GarangGoldenMasterBoardV1?.setSurface?.(surface,{navigate:false});return true;}
function canonicalCoachSend(value){
  keepCanonicalVisible();
  const input=doc.querySelector('#coachInput,#aiQuestion,.g2-composer textarea,.g2-composer input,.coach-bottom-stack textarea,.coach-bottom-stack input');
  if(!input)return false;
  input.value=value;
  input.dispatchEvent(new Event('input',{bubbles:true}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
  const send=input.closest('form')?.querySelector('button[type="submit"]')||doc.querySelector('.g2-send,#askAI,[data-coach-send],#coachSend,#askCoach,.g2-composer button[type="submit"]');
  if(!send)return false;
  send.click();maintain();return true;
}
function dispatchCoach(value,attempt=0){
  if(canonicalCoachSend(value))return true;
  if(attempt>=4)return false;
  setTimeout(()=>dispatchCoach(value,attempt+1),120+attempt*90);return false;
}
for(const name of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed'])window.addEventListener(name,event=>{
  maintain();
  if(!activeRoute)return;
  const route=String(event?.detail?.route||event?.detail?.screen||main()?.dataset?.garangScreen||'');
  if(!route||route===activeRoute)return;
  const surface=surfaceFor(route);
  if(surface){exit(surface);return;}
  activeRoute=route;maintain();
},{passive:true});
window.GarangGoldenBoardContinuationV1=Object.freeze({version:VERSION,enter,exit,dispatchCoach,get activeRoute(){return activeRoute;}});
})();