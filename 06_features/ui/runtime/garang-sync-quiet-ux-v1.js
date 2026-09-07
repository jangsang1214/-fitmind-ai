/* GARANG Quiet Sync UX v1.1
   Background retry/load sync should be visible in the sync badge, not as repeated toast noise.
   Manual taps on the sync badge still receive explicit toast feedback.
   iOS/WebKit safety: the Coach sidebar sync action closes the sidebar first, lets two frames paint,
   then starts sync outside the originating touch task so the compositor is never asked to close a
   full-screen panel and begin persistence work in the same gesture.
*/
(() => {
'use strict';
if(window.__garangSyncQuietUxV1)return;window.__garangSyncQuietUxV1=true;
const VERSION='garang-sync-quiet-ux-v1';
const COACH_SYNC_SELECTOR='.g5-app-action[data-g5-action="sync"]';
let manualUntil=0;
let delegatedSyncTimer=null;
let delegatedSyncToken=0;
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
function launchDeferredCoachSync(action){
 const token=++delegatedSyncToken;
 if(delegatedSyncTimer){clearTimeout(delegatedSyncTimer);delegatedSyncTimer=null;}
 const root=action?.closest?.('.garang-coach-v2');
 root?.classList.remove('sidebar-open');
 manualUntil=Date.now()+6500;
 action?.setAttribute?.('aria-busy','true');
 const start=()=>{
  if(token!==delegatedSyncToken)return;
  delegatedSyncTimer=null;
  action?.removeAttribute?.('aria-busy');
  const badge=document.getElementById('syncBadge');
  if(badge)badge.click();
 };
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  delegatedSyncTimer=setTimeout(start,180);
 }));
}
document.addEventListener('click',event=>{
 const coachSync=event.target?.closest?.(COACH_SYNC_SELECTOR);
 if(coachSync&&event.isTrusted){
  event.preventDefault();
  event.stopImmediatePropagation();
  launchDeferredCoachSync(coachSync);
  return;
 }
 const badge=event.target?.closest?.('#syncBadge');if(!badge)return;
 if(event.isTrusted||Date.now()<=manualUntil)manualUntil=Date.now()+5000;
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
window.GarangSyncQuietUX=Object.freeze({version:VERSION,launchDeferredCoachSync});
})();
