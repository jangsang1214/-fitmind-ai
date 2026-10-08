(function(root){
 'use strict';
 const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'COMMERCIAL HARDENING',buildId:'20260922-y2g-1',schema:5});
 root.GARANG_BUILD=build;
 if(root.document){
   document.documentElement.dataset.garangVersion=build.version;
   document.documentElement.dataset.garangChannel=build.channel;
   if(!document.querySelector('link[data-garang-reference-ui-v2]')){
     const link=document.createElement('link');
     link.rel='stylesheet';link.href='./03_styles/runtime/garang-reference-ui-v2.css?v=2.0.0';link.dataset.garangReferenceUiV2='1';
     document.head.appendChild(link);
   }
   if(!document.querySelector('link[data-garang-reference-ui-v2-guards]')){
     const guard=document.createElement('link');
     guard.rel='stylesheet';guard.href='./03_styles/runtime/garang-reference-ui-v2-guards.css?v=2.0.0';guard.dataset.garangReferenceUiV2Guards='1';
     document.head.appendChild(guard);
   }
   if(!document.querySelector('script[data-garang-reference-ui-v2]')){
     const script=document.createElement('script');
     script.src='./06_features/ui/runtime/garang-reference-ui-v2.js?v=2.0.0';script.defer=true;script.dataset.garangReferenceUiV2='1';
     document.head.appendChild(script);
   }
 }
})(typeof window==='undefined'?globalThis:window);
