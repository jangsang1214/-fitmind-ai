/* GARANG recovery WebKit touch safety v4
   Root-cause hardening for iPhone/WebKit:
   - recovery on touch WebKit is never a fixed, independently scrolling modal layer
   - the same recovery UI is placed in normal Settings document flow
   - closing it therefore cannot leave a stale scrolling/compositor node that stalls
     the next full application render while a Firestore read is still pending
   - desktop/non-WebKit keeps the existing modal presentation
   - no global gesture interception, scroll monkeypatch, body lock or synthetic click
*/
(() => {
'use strict';
if(window.__garangRecoveryWebkitGestureV1)return;
window.__garangRecoveryWebkitGestureV1=true;

function isWebKitTouch(){
  try{
    const ua=String(navigator.userAgent||'');
    const webkit=/AppleWebKit/i.test(ua);
    const touch=('ontouchstart' in window)||(Number(navigator.maxTouchPoints)||0)>0||window.matchMedia?.('(pointer:coarse)')?.matches===true;
    return webkit&&touch;
  }catch{return false;}
}
function ensureStyle(){
  if(document.getElementById('garang-recovery-webkit-flow-v4-style'))return;
  document.getElementById('garang-recovery-touch-inline-v2-style')?.remove();
  const style=document.createElement('style');
  style.id='garang-recovery-webkit-flow-v4-style';
  style.textContent=`
  .garang-data-recovery-modal[data-garang-webkit-flow="1"]{
    position:relative!important;inset:auto!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;
    z-index:auto!important;width:100%!important;min-height:0!important;height:auto!important;margin:12px 0 0!important;padding:0!important;
    display:block!important;background:transparent!important;box-sizing:border-box!important;overflow:visible!important;
    overscroll-behavior:auto!important;touch-action:auto!important;pointer-events:auto!important;visibility:visible!important;
    contain:none!important;transform:none!important;will-change:auto!important;
  }
  .garang-data-recovery-modal[data-garang-webkit-flow="1"] .garang-data-recovery-panel{
    position:relative!important;width:100%!important;max-width:none!important;max-height:none!important;height:auto!important;
    overflow:visible!important;-webkit-overflow-scrolling:auto!important;overscroll-behavior:auto!important;touch-action:auto!important;
    transform:none!important;will-change:auto!important;box-shadow:none!important;border-radius:14px!important;
  }
  .garang-data-recovery-modal[data-garang-webkit-flow="1"] .garang-data-recovery-head{
    position:static!important;top:auto!important;padding-top:0!important;
  }
  `;
  document.head.appendChild(style);
}
function relocate(modal){
  if(!isWebKitTouch()||!modal?.isConnected||modal.dataset.garangWebkitFlow==='1')return;
  const trigger=document.getElementById('importLegacy');
  if(!trigger?.isConnected)return;
  modal.dataset.garangWebkitFlow='1';
  const actions=trigger.closest('.settings-actions');
  if(actions?.parentElement)actions.insertAdjacentElement('afterend',modal);
  else trigger.insertAdjacentElement('afterend',modal);
}
function inspectAdded(records){
  for(const record of records){
    if(record.type!=='childList'||!record.addedNodes.length)continue;
    for(const node of record.addedNodes){
      if(!(node instanceof Element))continue;
      if(node.matches?.('.garang-data-recovery-modal'))relocate(node);
    }
  }
}
function start(){
  if(!isWebKitTouch()||!document.body)return;
  ensureStyle();
  document.querySelectorAll('.garang-data-recovery-modal').forEach(relocate);
  const observer=new MutationObserver(inspectAdded);
  observer.observe(document.body,{childList:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
window.GarangRecoveryWebkitGestureV1=Object.freeze({version:'v4.0.0',mode:isWebKitTouch()?'webkit-touch-document-flow':'native-modal'});
})();