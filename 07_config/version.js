(function(root){
 'use strict';
 const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'COMMERCIAL HARDENING',buildId:'20261019-founder-target-v5',schema:5});
 root.GARANG_BUILD=build;
 if(!root.document)return;
 document.documentElement.dataset.garangVersion=build.version;
 document.documentElement.dataset.garangChannel=build.channel;

 function loadStyle(){
   if(document.querySelector('link[data-garang-presentation-v4]'))return;
   const link=document.createElement('link');
   link.rel='stylesheet';
   link.href='./03_styles/runtime/garang-founder-target-v5.css?v=5.0.1-founder-board-structure';
   link.dataset.garangPresentationV4='1';
   link.dataset.garangFounderTargetV5='1';
   document.head.appendChild(link);
 }
 function installSafety(){
   if(!document.getElementById('garang-founder-target-v5-safety')){
     const style=document.createElement('style');
     style.id='garang-founder-target-v5-safety';
     style.textContent=`
       #main.g5-screen-workout:not(:has(.workout-session-bar.is-live)) .workout-visual-hero,
       #main.g5-screen-workout:not(:has(.workout-session-bar.is-live)) .workout-visual-hero *{pointer-events:none!important}
     `;
     document.head.appendChild(style);
   }
   let timer=0;
   const sync=()=>{
     clearTimeout(timer);
     timer=setTimeout(()=>{
       const main=document.getElementById('main');
       const nav=document.getElementById('bottomNav');
       if(!main||!nav)return;
       const workout=String(main.dataset.garangScreen||'')==='workout';
       const live=!!document.querySelector('.workout-session-bar.is-live');
       const rest=document.getElementById('workoutExecutionRest');
       const resting=!!rest&&!rest.hidden&&getComputedStyle(rest).display!=='none';
       nav.style.setProperty('display',workout&&(live||resting)?'none':'grid','important');
     },40);
   };
   ['garang:screen-rendered','garang:route-completed','garang:workout-session-started','garang:workout-set-rows-rendered','pageshow'].forEach(event=>window.addEventListener(event,sync,{passive:true}));
   document.addEventListener('click',sync,true);
   new MutationObserver(sync).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','hidden']});
   sync();
 }
 function loadPresentation(){
   if(document.querySelector('script[data-garang-presentation-v4]'))return;
   const script=document.createElement('script');
   script.src='./06_features/ui/runtime/garang-founder-target-v5.js?v=5.0.1-founder-board-structure';
   script.defer=true;
   script.dataset.garangPresentationV4='1';
   script.dataset.garangFounderTargetV5='1';
   script.addEventListener('load',()=>{root.GarangFounderTargetV5?.schedule?.();installSafety();},{once:true});
   document.head.appendChild(script);
 }
 loadStyle();
 loadPresentation();
})(typeof window==='undefined'?globalThis:window);
