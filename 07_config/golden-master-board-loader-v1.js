(function(root){
'use strict';
if(!root.document)return;
document.documentElement.dataset.garangGoldenBoard='1';
function style(href,key){if(document.querySelector(`link[data-garang-golden-board="${key}"]`))return;const el=document.createElement('link');el.rel='stylesheet';el.href=href;el.dataset.garangGoldenBoard=key;document.head.appendChild(el);}
function chromeGuard(){if(document.querySelector('style[data-garang-golden-board="chrome-guard"]'))return;const el=document.createElement('style');el.dataset.garangGoldenBoard='chrome-guard';el.textContent='body.garang-golden-board #appView:not([hidden])>.topbar[data-gmb-canonical="hidden"],body.garang-golden-board #appView:not([hidden])>#bottomNav[data-gmb-canonical="hidden"]{display:none!important;visibility:hidden!important;pointer-events:none!important}';document.head.appendChild(el);}
function script(src,key,onload){const found=document.querySelector(`script[data-garang-golden-board="${key}"]`);if(found){if(onload)found.addEventListener('load',onload,{once:true});return;}const el=document.createElement('script');el.src=src;el.defer=true;el.dataset.garangGoldenBoard=key;if(onload)el.addEventListener('load',onload,{once:true});document.head.appendChild(el);}
chromeGuard();
style('./03_styles/runtime/garang-golden-master-board-v1.css?v=20261014-board-2','style');
script('./06_features/ui/runtime/garang-golden-master-board-v1.js?v=20261014-board-2','runtime',()=>script('./06_features/ui/runtime/garang-golden-master-board-continuation-v1.js?v=20261014-board-2','continuation'));
})(typeof window==='undefined'?globalThis:window);