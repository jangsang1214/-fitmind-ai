(function(root){
 'use strict';
 const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'COMMERCIAL HARDENING',buildId:'20261018-presentation-v4',schema:5});
 root.GARANG_BUILD=build;
 if(!root.document)return;
 document.documentElement.dataset.garangVersion=build.version;
 document.documentElement.dataset.garangChannel=build.channel;

 function loadStyle(){
   if(document.querySelector('link[data-garang-presentation-v4]'))return;
   const link=document.createElement('link');
   link.rel='stylesheet';
   link.href='./03_styles/runtime/garang-presentation-v4.css?v=4.0.0-clean-architecture';
   link.dataset.garangPresentationV4='1';
   document.head.appendChild(link);
 }
 function loadPresentation(){
   if(document.querySelector('script[data-garang-presentation-v4]'))return;
   const script=document.createElement('script');
   script.src='./06_features/ui/runtime/garang-presentation-v4.js?v=4.0.0-clean-architecture';
   script.defer=true;
   script.dataset.garangPresentationV4='1';
   script.addEventListener('load',()=>root.GarangPresentationV4?.schedule?.(),{once:true});
   document.head.appendChild(script);
 }
 loadStyle();
 loadPresentation();
})(typeof window==='undefined'?globalThis:window);
