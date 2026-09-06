/* GARANG service worker updater v2 */
(() => {
'use strict';
if(window.__garangSwUpdateV2||!('serviceWorker' in navigator))return;window.__garangSwUpdateV2=true;
async function update(){try{const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});await registration.update();return true;}catch(error){console.warn('[GARANG] service worker update deferred',error);return false;}}
update();
window.GarangSwUpdateV2=Object.freeze({version:'v2',update});
})();
