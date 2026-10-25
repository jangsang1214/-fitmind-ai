(function(root){
'use strict';
const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'FOUNDER REDESIGN',buildId:'20261025-founder-showcase-v10.13',schema:5});
root.GARANG_BUILD=build;
if(!root.document)return;
document.documentElement.dataset.garangVersion=build.version;
document.documentElement.dataset.garangChannel=build.channel;
function addStyle(href,key){if(document.querySelector(`link[data-garang-style="${key}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.garangStyle=key;link.dataset.garangPresentationV4='1';document.head.appendChild(link);}
function loadScript(src,attrs={}){return new Promise(resolve=>{if(document.querySelector(`script[src^="${src.split('?')[0]}"]`))return resolve();const s=document.createElement('script');s.src=src;s.defer=true;Object.entries(attrs).forEach(([k,v])=>s.dataset[k]=v);s.addEventListener('load',()=>resolve(s),{once:true});document.head.appendChild(s);});}
async function load(){
 addStyle('./03_styles/runtime/garang-founder-v8-foundation.css?v=8.5.5','founder-v8-foundation');
 addStyle('./03_styles/runtime/garang-founder-v8-screens.css?v=8.5.0','founder-v8-screens');
 addStyle('./03_styles/runtime/garang-founder-v8-exact-board.css?v=9.1.1','founder-v8-exact-board');
 addStyle('./03_styles/runtime/garang-founder-showcase-v10-critical.css?v=10.0.0','founder-showcase-v10-critical');
 addStyle('./03_styles/runtime/garang-founder-reference-media-v1.css?v=1.0.0','founder-reference-media-v1');
 addStyle('./03_styles/runtime/garang-muscular-anatomy-v1.css?v=1.2.0','founder-v8-anatomy-material');
 await loadScript('./06_features/ui/runtime/garang-anatomy-exact-v2.js?v=2.3.0',{garangPresentationV4:'1',garangAnatomyExactV2:'1'});
 await loadScript('./06_features/ui/runtime/garang-founder-v8-owner-guard.js?v=8.0.1',{garangPresentationV4:'1',garangFounderV8OwnerGuard:'1'});
 await loadScript('./06_features/ui/runtime/garang-founder-v8-chrome-guard.js?v=8.1.6',{garangPresentationV4:'1',garangFounderV8ChromeGuard:'1'});
 await loadScript('./06_features/ui/runtime/garang-mobile-checkin-planner-shortcut-v1.js?v=1.0.3',{garangPresentationV4:'1',garangPlannerShortcut:'1'});
 await loadScript('./06_features/ui/runtime/garang-founder-v8.js?v=8.0.3',{garangPresentationV4:'1',garangFounderV8:'1'});
 await loadScript('./06_features/ui/runtime/garang-founder-v8-exact-board.js?v=9.0.5',{garangPresentationV4:'1',garangFounderV8ExactBoard:'1'});
 await loadScript('./06_features/ui/runtime/garang-founder-showcase-v10-critical.js?v=10.0.1',{garangPresentationV4:'1',garangFounderShowcaseV10:'1'});
 await loadScript('./06_features/ui/runtime/garang-founder-reference-media-v1.js?v=1.0.0',{garangPresentationV4:'1',garangFounderReferenceMediaV1:'1'});
 await loadScript('./06_features/ui/runtime/garang-founder-v8-workout-summary.js?v=8.0.1',{garangPresentationV4:'1',garangFounderV8WorkoutSummary:'1'});
 await loadScript('./06_features/ui/runtime/garang-founder-v8-summary-trigger.js?v=8.0.0',{garangPresentationV4:'1',garangFounderV8SummaryTrigger:'1'});
 root.GarangFounderV8OwnerGuard?.schedule?.();
 root.GarangFounderV8ChromeGuard?.schedule?.();
 root.GarangMobileCheckinPlannerShortcutV1?.reconcile?.();
 root.GarangFounderV8?.schedule?.();
 root.GarangFounderV8ExactBoard?.schedule?.();
 root.GarangFounderShowcaseV10?.schedule?.();
 root.GarangFounderReferenceMediaV1?.schedule?.();
 root.GarangFounderV8WorkoutSummary?.render?.();
 root.GarangFounderV8SummaryTrigger?.reconcile?.();
}
load();
})(typeof window==='undefined'?globalThis:window);