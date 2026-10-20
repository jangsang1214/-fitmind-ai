(function(root){
'use strict';
const build=Object.freeze({version:'0.11.0-beta.7',label:'0.11.0 BETA 7',channel:'FOUNDER EXACT',buildId:'20261020-founder-exact-v7',schema:5});
root.GARANG_BUILD=build;
if(!root.document)return;
document.documentElement.dataset.garangVersion=build.version;
document.documentElement.dataset.garangChannel=build.channel;
function addStyle(href,key){if(document.querySelector(`link[data-garang-style="${key}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.garangStyle=key;if(key==='founder-v7')link.dataset.garangPresentationV4='1';document.head.appendChild(link);}
function canonicalizeWorkoutSession(){
 const main=document.getElementById('main');if(!main||String(main.dataset.garangScreen||'')!=='workout')return;
 const bars=[...main.querySelectorAll('.workout-session-bar')];if(bars.length<2)return;
 const preferred=main.querySelector('.gws-panel[data-garang-workout-surface="exercise"] .workout-session-bar')||bars.find(bar=>bar.closest('.workout-execution-v2'))||bars.at(-1);
 bars.forEach(bar=>{if(bar===preferred){bar.removeAttribute('aria-hidden');return;}bar.dataset.garangDuplicateSession='1';bar.setAttribute('aria-hidden','true');bar.style.setProperty('display','none','important');bar.querySelectorAll('[id]').forEach(node=>{if(!node.dataset.garangDuplicateId)node.dataset.garangDuplicateId=node.id;node.removeAttribute('id');});});
}
function reconcile(){canonicalizeWorkoutSession();root.GarangFounderExactV7?.schedule?.();requestAnimationFrame(()=>{canonicalizeWorkoutSession();root.GarangFounderExactV7?.schedule?.();});}
function install(){let queued=false;const sync=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;reconcile();});};['garang:screen-rendered','garang:route-completed','garang:state-updated','garang:workout-set-rows-rendered','garang:workout-session-started','garang:coach-mounted','garang:coach-message-rendered','pageshow'].forEach(name=>window.addEventListener(name,sync,{passive:true}));document.addEventListener('click',()=>setTimeout(sync,0),true);new MutationObserver(sync).observe(document.body,{subtree:true,childList:true});sync();}
function load(){
 addStyle('./03_styles/runtime/garang-founder-exact-v7.css?v=7.0.0','founder-v7');
 const anatomy=document.createElement('script');anatomy.src='./06_features/ui/runtime/garang-anatomy-exact-v2.js?v=2.0.0';anatomy.defer=true;anatomy.dataset.garangAnatomyComponent='exact-v2';
 anatomy.addEventListener('load',()=>{const script=document.createElement('script');script.src='./06_features/ui/runtime/garang-founder-exact-v7.js?v=7.0.0';script.defer=true;script.dataset.garangPresentationV4='1';script.dataset.garangFounderExactV7='1';script.addEventListener('load',install,{once:true});document.head.appendChild(script);},{once:true});
 document.head.appendChild(anatomy);
}
load();
})(typeof window==='undefined'?globalThis:window);
