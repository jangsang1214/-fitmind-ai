/* GARANG canonical feature router v1
   Feature runtimes request navigation here instead of synthesizing DOM click events.
   01_app/app.js remains the screen-render owner; this bridge invokes its already-bound
   handlers directly and owns transient UI cleanup before a route transition.
*/
(() => {
'use strict';
if(window.GarangRouter)return;
const VERSION='garang-router-v1.0.0';
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
  const coach=document.querySelector('.garang-coach-v2');
  coach?.classList.remove('sidebar-open','gcp-open');
  document.querySelectorAll('.garang-more-sheet,.modal-backdrop,.gcp-backdrop,.gcp-panel,.g2-sidebar-backdrop').forEach(el=>{
    if(el.classList.contains('gcp-backdrop')||el.classList.contains('gcp-panel')){el.hidden=true;return;}
    if(el.classList.contains('g2-sidebar-backdrop'))return;
    el.remove();
  });
  document.body?.classList.remove('menu-open');
}
function callBound(target){
  if(!target||typeof target.onclick!=='function')return false;
  target.onclick.call(target,{type:'garang-route',target,currentTarget:target,preventDefault(){},stopPropagation(){}});
  return true;
}
function bottomTarget(route){return document.querySelector(`#bottomNav button[data-page="${CSS.escape(route)}"]`);}
function directTarget(route){
  if(route==='settings')return document.getElementById('settingsTopBtn');
  if(route==='profile')return document.getElementById('profileTopBtn');
  return document.querySelector(`[data-pagego="${CSS.escape(route)}"]`);
}
function viaMenu(route){
  const menu=document.getElementById('menuBtn');if(!callBound(menu))return false;
  const target=document.querySelector(`.garang-more-sheet [data-route="${CSS.escape(route)}"],.garang-more-sheet [data-pagego="${CSS.escape(route)}"]`);
  if(target&&callBound(target))return true;
  return false;
}
function navigate(route,{source='runtime',force=false}={}){
  const next=normalize(route);if(!valid(next))return false;
  if(!force&&current()===next)return true;
  try{window.dispatchEvent(new CustomEvent('garang:route-requested',{detail:{from:current(),to:next,source}}));}catch{}
  removeTransient();
  let ok=callBound(bottomTarget(next))||callBound(directTarget(next));
  if(!ok)ok=viaMenu(next);
  if(ok){
    try{window.dispatchEvent(new CustomEvent('garang:route-completed',{detail:{route:next,source}}));}catch{}
    return true;
  }
  return false;
}
window.GarangRouter=Object.freeze({version:VERSION,navigate,current,cleanup:removeTransient});
})();
