/* GARANG lifetime-history compatibility shim.
   Emergency-disabled after mobile/PWA interaction regression.
   The existing app/state cloud persistence remains active through the normal app + sync durability path.
   This file intentionally performs no polling, reloads, event interception, Storage overrides, or Firestore work.
*/
(() => {
'use strict';
if(window.__garangLifetimeHistoryRuntime)return;
window.__garangLifetimeHistoryRuntime=true;
window.GarangLifetimeHistoryRuntime=Object.freeze({
  version:'garang-lifetime-history-disabled-ui-recovery-v2',
  disabled:true,
  status:()=>({disabled:true,reason:'ui-recovery'}),
  forceSync:async()=>false,
  restore:async()=>false,
  loadAll:async()=>({workouts:[],meals:[]})
});
})();
