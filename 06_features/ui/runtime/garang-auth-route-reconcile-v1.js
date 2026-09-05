/* GARANG authenticated route reconciliation v1
   One-shot bridge for the legacy app boot order: if cloud state upgrades onboarding
   from incomplete local state to complete, enter Today through the app's own nav handler.
*/
(() => {
'use strict';
if(window.__garangAuthRouteReconcile)return;
window.__garangAuthRouteReconcile=true;
let handled=false;

function currentUid(){try{return window.firebase?.auth?.().currentUser?.uid||null;}catch{return null;}}
function persistedReady(uid){
  try{
    const raw=localStorage.getItem(`garang_user_${uid}_v3`);if(!raw)return false;
    const state=JSON.parse(raw),onboarding=state?.onboarding||{};
    return !!(onboarding.complete||onboarding.skipped);
  }catch{return false;}
}
function reconcile(detail){
  if(handled||!detail?.needsTodayRoute||!detail?.onboardingReady||!detail?.uid)return;
  handled=true;
  setTimeout(()=>{
    const uid=currentUid();
    if(uid!==detail.uid||!persistedReady(uid)){handled=false;return;}
    const app=document.getElementById('appView'),today=document.querySelector('#bottomNav [data-page="today"]');
    if(!app||app.hidden||!today){handled=false;return;}
    today.click();
    window.dispatchEvent(new CustomEvent('garang:auth-route-reconciled',{detail:{uid,route:'today'}}));
  },0);
}

window.addEventListener('garang:cloud-state-ready',event=>reconcile(event.detail));
if(window.__garangCloudStateReady)reconcile(window.__garangCloudStateReady);
})();
