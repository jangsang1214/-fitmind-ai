/* GARANG Quiet Sync UX v1
   Background retry/load sync should be visible in the sync badge, not as repeated toast noise.
   Manual taps on the sync badge still receive explicit toast feedback.
*/
(() => {
'use strict';
if(window.__garangSyncQuietUxV1)return;window.__garangSyncQuietUxV1=true;
const VERSION='garang-sync-quiet-ux-v1';
let manualUntil=0;
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
 const toast=document.getElementById('toast');if(!toast||Date.now()<=manualUntil)return;
 if(isSyncNoise(toast.textContent))toast.classList.remove('show');
}
document.addEventListener('click',event=>{
 const badge=event.target?.closest?.('#syncBadge');if(!badge)return;
 if(event.isTrusted)manualUntil=Date.now()+5000;
 else manualUntil=0;
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
window.GarangSyncQuietUX=Object.freeze({version:VERSION});
})();
