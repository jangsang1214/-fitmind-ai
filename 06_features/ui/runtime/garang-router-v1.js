/* GARANG canonical feature router v1.3
   Feature runtimes request navigation here instead of synthesizing menu interactions.
   01_app/app.js remains the screen-render owner. One hidden app-bound bridge delegates
   non-primary routes to app.js without duplicating route buttons or reopening More.
*/
(() => {
'use strict';
if(window.GarangRouter)return;
const VERSION='garang-router-v1.3.0';
const main=()=>document.getElementById('main');
const registry=()=>window.GarangScreenRegistry;
const normalize=route=>String(route||'').trim().toLowerCase();

function current(){
  const screen=main()?.dataset?.garangScreen;
  if(screen)return screen;
  return document.querySelector('#bottomNav button.active[data-page]')?.dataset?.page||null;
}
function valid(route){
  const r=normalize(route);if(!r)return false;
  try{const entry=registry()?.get?.(r);if(entry)return true;}catch{}
  return ['today','coach','workout','body','progress','running','nutrition','planner','memory','profile','settings','onboarding','modeling','log'].includes(r);
}
function removeTransient(){
  const appMain=main();
  const liveCoach=appMain?.querySelector('.garang-coach-v2')||null;
  if(liveCoach){
    liveCoach.classList.remove('sidebar-open','gcp-open');
    liveCoach.querySelectorAll('.gcp-backdrop,.gcp-panel').forEach(el=>{el.hidden=true;});
  }
  document.querySelectorAll('.garang-coach-v2').forEach(root=>{
    if(root!==liveCoach&&!appMain?.contains(root))root.remove();
  });
  document.querySelectorAll('.garang-more-sheet,.modal-backdrop').forEach(el=>el.remove());
  document.querySelectorAll('.g2-sidebar-backdrop').forEach(el=>{
    if(!el.closest('.garang-coach-v2'))el.remove();
  });
  document.body?.classList.remove('menu-open');
}
function callBound(target){
  if(!target||typeof target.onclick!=='function')return false;
  target.onclick.call(target,{type:'garang-route',target,currentTarget:target,preventDefault(){},stopPropagation(){}});
  return true;
}
function bottomTarget(route){return document.querySelector(`#bottomNav button[data-garang-primary-nav="1"][data-page="${CSS.escape(route)}"]`);}
function directTarget(route){
  if(route==='settings')return document.getElementById('settingsTopBtn');
  if(route==='profile')return document.getElementById('profileTopBtn');
  return null;
}
function callAppBridge(route){
  const bridge=document.querySelector('#bottomNav button[data-garang-route-bridge="1"]');
  if(!bridge||typeof bridge.onclick!=='function')return false;
  const previous=bridge.dataset.page;
  bridge.dataset.page=route;
  try{return callBound(bridge);}finally{bridge.dataset.page=previous||'__bridge';}
}
function navigate(route,{source='runtime',force=false,cleanup=true}={}){
  const next=normalize(route);if(!valid(next))return false;
  if(!force&&current()===next)return true;
  try{window.dispatchEvent(new CustomEvent('garang:route-requested',{detail:{from:current(),to:next,source}}));}catch{}
  let ok=callBound(bottomTarget(next))||callBound(directTarget(next));
  if(!ok)ok=callAppBridge(next);
  if(!ok)return false;
  if(cleanup)removeTransient();
  try{window.dispatchEvent(new CustomEvent('garang:route-completed',{detail:{route:next,source}}));}catch{}
  return true;
}

/*
  Mobile WebKit can replace a presentation node between pointerdown and the
  compatibility click generated after pointerup. Route intent is safe to keep
  because it contains no data mutation: capture only canonical route controls,
  reject scroll/drag gestures, and commit through this Router on pointerup.
  This preserves the user's tap even if Today or the Record sheet remounts.
*/
let touchIntent=null;
function touchRouteTarget(target){
  const el=target?.closest?.('[data-gtf-route],[data-garang-record-route]');if(!el)return null;
  const route=normalize(el.dataset.gtfRoute||el.dataset.garangRecordRoute);return valid(route)?route:null;
}
document.addEventListener('pointerdown',event=>{
  if(event.pointerType!=='touch'||event.button!==0)return;
  const route=touchRouteTarget(event.target);if(!route)return;
  touchIntent={pointerId:event.pointerId,route,x:event.clientX,y:event.clientY};
},true);
document.addEventListener('pointercancel',event=>{if(touchIntent?.pointerId===event.pointerId)touchIntent=null;},true);
document.addEventListener('pointerup',event=>{
  const intent=touchIntent;if(!intent||event.pointerId!==intent.pointerId)return;touchIntent=null;
  if(Math.hypot(event.clientX-intent.x,event.clientY-intent.y)>14)return;
  event.preventDefault();event.stopImmediatePropagation();
  navigate(intent.route,{source:'router-touch-intent',force:true});
},true);

window.GarangRouter=Object.freeze({version:VERSION,navigate,current,cleanup:removeTransient});
})();
