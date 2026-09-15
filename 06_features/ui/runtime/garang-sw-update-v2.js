/* GARANG service worker updater v2 */
(() => {
'use strict';
if(window.__garangSwUpdateV2)return;window.__garangSwUpdateV2=true;
function loadProductConsolidation(){
  if(window.GarangProductConsolidationV1||document.querySelector('script[data-garang-product-consolidation-v1]'))return;
  const script=document.createElement('script');
  script.src='./06_features/ui/runtime/garang-product-consolidation-v1.js?v=1.1.0';
  script.dataset.garangProductConsolidationV1='1';
  script.async=false;
  document.head.appendChild(script);
}
function loadStateEventDurability(){
  if(window.GarangStateEventDurabilityV1||document.querySelector('script[data-garang-state-event-durability-v1]'))return;
  const script=document.createElement('script');
  script.src='./06_features/ui/runtime/garang-state-event-durability-v1.js?v=1.0.0';
  script.dataset.garangStateEventDurabilityV1='1';
  script.async=false;
  document.head.appendChild(script);
}
function loadTodayCheckinOverride(){
  if(window.GarangTodayCheckinOverrideV1||document.querySelector('script[data-garang-today-checkin-override-v1]'))return;
  const script=document.createElement('script');
  script.src='./06_features/ui/runtime/garang-today-checkin-override-v1.js?v=1.3.0';
  script.dataset.garangTodayCheckinOverrideV1='1';
  script.async=false;
  document.head.appendChild(script);
}
loadProductConsolidation();
loadStateEventDurability();
loadTodayCheckinOverride();
async function update(){if(!('serviceWorker' in navigator))return false;try{const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await registration.update();return true;}catch(error){console.warn('[GARANG] service worker update deferred',error);return false;}}
update();
window.GarangSwUpdateV2=Object.freeze({version:'v2',update});
})();