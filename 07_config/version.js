(function(root){
'use strict';
const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'FOUNDER REDESIGN',buildId:'20261022-founder-v8.3',schema:5});
root.GARANG_BUILD=build;
if(!root.document)return;
document.documentElement.dataset.garangVersion=build.version;
document.documentElement.dataset.garangChannel=build.channel;
function addStyle(href,key){if(document.querySelector(`link[data-garang-style="${key}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.garangStyle=key;link.dataset.garangPresentationV4='1';document.head.appendChild(link);}
function loadScript(src,attrs={}){return new Promise(resolve=>{if(document.querySelector(`script[src^="${src.split('?')[0]}"]`))return resolve();const s=document.createElement('script');s.src=src;s.defer=true;Object.entries(attrs).forEach(([k,v])=>s.dataset[k]=v);s.addEventListener('load',()=>resolve(s),{once:true});document.head.appendChild(s);});}
async function load(){
 addStyle('./03_styles/runtime/garang-founder-v8-foundation.css?v=8.0.1','founder-v8-foundation');
 addStyle('./03_styles/runtime/garang-founder-v8-screens.css?v=8.0.0','founder-v8-screens');
 await loadScript('./06_features/ui/runtime/garang-founder-v8.js?v=8.0.2',{garangPresentationV4:'1',garangFounderV8:'1'});
 root.GarangFounderV8?.schedule?.();
}
load();
})(typeof window==='undefined'?globalThis:window);
