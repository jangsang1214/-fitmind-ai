/* GARANG recovery WebKit touch safety v2
   iOS/WebKit recovery rule:
   - touch devices never keep the recovery surface as a full-screen fixed composited layer
   - the recovery surface is moved next to its Settings trigger and behaves like normal document flow
   - no global click capture, preventDefault, stopImmediatePropagation, body lock, or synthetic gesture replay
   - desktop keeps the existing modal presentation
*/
(() => {
'use strict';
if(window.__garangRecoveryWebkitGestureV1)return;
window.__garangRecoveryWebkitGestureV1=true;

function isTouchLike(){
  try{return ('ontouchstart' in window)||navigator.maxTouchPoints>0||window.matchMedia?.('(pointer:coarse)')?.matches===true;}catch{return true;}
}
function ensureStyle(){
  if(document.getElementById('garang-recovery-touch-inline-v2-style'))return;
  const style=document.createElement('style');
  style.id='garang-recovery-touch-inline-v2-style';
  style.textContent=`
  @media (hover:none), (pointer:coarse), (max-width:800px){
    .garang-data-recovery-modal[data-garang-touch-inline="1"]{
      position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
      z-index:auto!important;width:100%!important;min-height:0!important;height:auto!important;margin:12px 0 0!important;padding:0!important;
      display:block!important;background:transparent!important;box-sizing:border-box!important;overflow:visible!important;
      overscroll-behavior:auto!important;touch-action:auto!important;pointer-events:auto!important;visibility:visible!important;
    }
    .garang-data-recovery-modal[data-garang-touch-inline="1"] .garang-data-recovery-panel{
      width:100%!important;max-width:none!important;max-height:none!important;height:auto!important;overflow:visible!important;
      -webkit-overflow-scrolling:auto!important;touch-action:auto!important;box-shadow:none!important;border-radius:14px!important;
    }
    .garang-data-recovery-modal[data-garang-touch-inline="1"] .garang-data-recovery-head{
      position:static!important;top:auto!important;padding-top:0!important;
    }
  }
  `;
  document.head.appendChild(style);
}
function relocate(modal){
  if(!isTouchLike()||!modal||!modal.isConnected||modal.dataset.garangTouchInline==='1')return;
  const trigger=document.getElementById('importLegacy');
  if(!trigger||!trigger.isConnected)return;
  modal.dataset.garangTouchInline='1';
  const actions=trigger.closest('.settings-actions');
  if(actions?.parentElement){actions.insertAdjacentElement('afterend',modal);return;}
  trigger.insertAdjacentElement('afterend',modal);
}
function scanAdded(nodes){
  for(const node of nodes){
    if(!(node instanceof Element))continue;
    if(node.matches?.('.garang-data-recovery-modal'))relocate(node);
  }
}
function start(){
  ensureStyle();
  if(!isTouchLike()||!document.body)return;
  document.querySelectorAll('.garang-data-recovery-modal').forEach(relocate);
  const observer=new MutationObserver(records=>{
    for(const record of records)if(record.type==='childList'&&record.addedNodes.length)scanAdded(record.addedNodes);
  });
  observer.observe(document.body,{childList:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
window.GarangRecoveryWebkitGestureV1=Object.freeze({version:'v2.0.0',mode:isTouchLike()?'inline-touch':'desktop-modal'});
})();