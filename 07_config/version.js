(function(root){
'use strict';
const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'COMMERCIAL HARDENING',buildId:'20261020-founder-rebuild-v6',schema:5});
root.GARANG_BUILD=build;
if(!root.document)return;
document.documentElement.dataset.garangVersion=build.version;
document.documentElement.dataset.garangChannel=build.channel;
function loadStyle(){
 if(document.querySelector('link[data-garang-presentation-v4]'))return;
 const link=document.createElement('link');link.rel='stylesheet';link.href='./03_styles/runtime/garang-founder-target-v6.css?v=6.0.1-clean-rebuild';link.dataset.garangPresentationV4='1';link.dataset.garangFounderTargetV6='1';document.head.appendChild(link);
}
function canonicalizeWorkoutSession(){
 const main=document.getElementById('main');if(!main||String(main.dataset.garangScreen||'')!=='workout')return;
 const bars=[...main.querySelectorAll('.workout-session-bar')];if(bars.length<2)return;
 const preferred=main.querySelector('.gws-panel[data-garang-workout-surface="exercise"] .workout-session-bar')||bars.find(bar=>bar.querySelector('#workoutSetDetails'))||bars.at(-1);
 bars.forEach(bar=>{if(bar===preferred)return;bar.dataset.garangDuplicateSession='1';bar.setAttribute('aria-hidden','true');bar.querySelectorAll('[id]').forEach(node=>{node.dataset.garangDuplicateId=node.id;node.removeAttribute('id');});});
}
function installCompatibility(){
 let timer=0;const sync=()=>{clearTimeout(timer);timer=setTimeout(()=>{canonicalizeWorkoutSession();root.GarangFounderTargetV6?.schedule?.();},24);};
 ['garang:screen-rendered','garang:route-completed','garang:workout-set-rows-rendered','garang:workout-session-started','pageshow'].forEach(name=>window.addEventListener(name,sync,{passive:true}));
 new MutationObserver(sync).observe(document.body,{subtree:true,childList:true});sync();
}
function loadPresentation(){
 if(document.querySelector('script[data-garang-presentation-v4]'))return;
 const script=document.createElement('script');script.src='./06_features/ui/runtime/garang-founder-target-v6.js?v=6.0.1-clean-rebuild';script.defer=true;script.dataset.garangPresentationV4='1';script.dataset.garangFounderTargetV6='1';script.addEventListener('load',installCompatibility,{once:true});document.head.appendChild(script);
}
loadStyle();loadPresentation();
})(typeof window==='undefined'?globalThis:window);
