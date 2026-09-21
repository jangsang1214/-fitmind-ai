/* GARANG service worker updater v2.1
   Service-worker ownership only. Product/UI runtimes belong to the authoritative boot manifest.
*/
(() => {
'use strict';
if(window.__garangSwUpdateV2)return;window.__garangSwUpdateV2=true;
async function update(){if(!('serviceWorker' in navigator))return false;try{const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await registration.update();return true;}catch(error){console.warn('[GARANG] service worker update deferred',error);return false;}}
update();
window.GarangSwUpdateV2=Object.freeze({version:'v2.1',update});
})();
