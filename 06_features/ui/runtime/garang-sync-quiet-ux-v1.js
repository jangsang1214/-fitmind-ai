/* GARANG Quiet Sync UX v1.3
   Background retry/load sync should be visible in the sync badge, not as repeated toast noise.
   Manual taps on the sync badge still receive explicit toast feedback.
   WebKit safety: the toast observer never writes the same class state back into the node it observes.
   Important: this runtime never intercepts application navigation or Coach sidebar clicks. */
(() => {
'use strict';
if(window.__garangSyncQuietUxV13)return;window.__garangSyncQuietUxV13=true;
const VERSION='garang-sync-quiet-ux-v1.3';
let manualUntil=0;
let observerCallbacks=0,hideWrites=0;
const SYNC_NOISE=[
 '클라우드 동기화를 다시 확인합니다.',
 '동기화가 완료되었습니다.',
 '클라우드 연결을 확인 중입니다. 기록은 기기에 안전하게 저장됩니다.',
 '클라우드 동기화는 백그라운드에서 다시 시도합니다.',
 'Checking cloud sync',
 'Sync completed',
 'Cloud sync will retry in the background'
];
function isSyncNoise(text){const value=String(text||'').trim();return SYNC_NOISE.some(message=>value===message||value.includes(message));}
function hideBackgroundSyncToast(){
 observerCallbacks++;
 const toast=document.getElementById('toast');if(!toast||Date.now()<=manualUntil)return;
 /* MutationObserver observes toast.class. On WebKit, corrective writes must be guarded so
    the observer cannot become MutationObserver -> same class write -> MutationObserver. */
 if(isSyncNoise(toast.textContent)&&toast.classList.contains('show')){
  hideWrites++;
  toast.classList.remove('show');
 }
}
document.addEventListener('click',event=>{
 const badge=event.target?.closest?.('#syncBadge');if(!badge)return;
 if(event.isTrusted)manualUntil=Date.now()+5000;
 else if(Date.now()>manualUntil)manualUntil=0;
},true);
function observeToast(){
 const toast=document.getElementById('toast');if(!toast)return false;
 if(toast.dataset.garangQuietSync==='1')return true;
 toast.dataset.garangQuietSync='1';
 new MutationObserver(hideBackgroundSyncToast).observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
 hideBackgroundSyncToast();return true;
}
let tries=0;function boot(){if(observeToast())return;if(tries++<20)setTimeout(boot,150);}
boot();
window.GarangSyncQuietUX=Object.freeze({version:VERSION,diagnostics:()=>({observerCallbacks,hideWrites,manualUntil})});
})();
