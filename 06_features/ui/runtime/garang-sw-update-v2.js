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
loadProductConsolidation();
async function update(){if(!('serviceWorker' in navigator))return false;try{const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await registration.update();return true;}catch(error){console.warn('[GARANG] service worker update deferred',error);return false;}}
update();
window.GarangSwUpdateV2=Object.freeze({version:'v2',update});
})();