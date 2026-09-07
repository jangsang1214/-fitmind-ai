/* GARANG recovery WebKit gesture safety v1
   iOS/WebKit can transiently starve hit-testing when a full-screen fixed modal is
   synchronously removed from the same click task produced by a physical touch.
   Recovery actions that replace/remove the modal are therefore retired from hit
   testing immediately, then executed after the current gesture task has settled.
*/
(() => {
'use strict';
if(window.__garangRecoveryWebkitGestureV1)return;
window.__garangRecoveryWebkitGestureV1=true;
let pending=false;

function isTouchLike(){
  try{return ('ontouchstart' in window)||navigator.maxTouchPoints>0||window.matchMedia?.('(pointer:coarse)')?.matches===true;}catch{return true;}
}
function retire(modal){
  if(!modal)return;
  modal.style.setProperty('pointer-events','none','important');
  modal.style.setProperty('visibility','hidden','important');
  modal.setAttribute('aria-hidden','true');
}
function afterGesture(task){
  requestAnimationFrame(()=>setTimeout(()=>{
    try{task();}finally{pending=false;}
  },0));
}

document.addEventListener('click',event=>{
  if(!isTouchLike())return;
  const target=event.target;
  const modal=target?.closest?.('.garang-data-recovery-modal');
  if(!modal)return;
  const close=target.closest?.('[data-recovery-close]');
  const rescan=target.closest?.('[data-recovery-rescan]');
  const backdrop=target===modal;
  if(!close&&!rescan&&!backdrop)return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if(pending)return;
  pending=true;
  retire(modal);

  if(rescan){
    const handler=rescan.onclick;
    afterGesture(()=>{
      if(typeof handler==='function')handler.call(rescan,new Event('click'));
      else window.GarangDataMigrationV2?.openRecoveryCenter?.({preserveFocus:true});
    });
    return;
  }
  afterGesture(()=>window.GarangDataMigrationV2?.closeRecoveryCenter?.());
},true);

window.GarangRecoveryWebkitGestureV1=Object.freeze({version:'v1.0.0'});
})();
