(function(root){
 'use strict';
 if(!root.document)return;
 document.documentElement.dataset.garangGoldenMaster='1';
 function ensureStyle(href,key){
   if(document.querySelector(`link[data-garang-golden-master="${key}"]`))return;
   const link=document.createElement('link');
   link.rel='stylesheet';
   link.href=href;
   link.dataset.garangGoldenMaster=key;
   document.head.appendChild(link);
 }
 function ensureContinuation(){
   if(root.GarangGoldenMasterContinuationV1||document.querySelector('script[data-garang-golden-master="continuation"]'))return;
   const script=document.createElement('script');
   script.src='./06_features/ui/runtime/garang-golden-master-continuation-v1.js?v=20261013-golden-master-3';
   script.defer=true;
   script.dataset.garangGoldenMaster='continuation';
   document.head.appendChild(script);
 }
 function ensureRuntime(){
   const existing=document.querySelector('script[data-garang-golden-master="runtime"]');
   if(root.GarangGoldenMasterV1){ensureContinuation();return;}
   if(existing){existing.addEventListener('load',ensureContinuation,{once:true});return;}
   const script=document.createElement('script');
   script.src='./06_features/ui/runtime/garang-golden-master-v1.js?v=20261013-golden-master-3';
   script.defer=true;
   script.dataset.garangGoldenMaster='runtime';
   script.addEventListener('load',ensureContinuation,{once:true});
   document.head.appendChild(script);
 }
 ensureStyle('./03_styles/runtime/garang-golden-master-v1.css?v=20261013-golden-master-3','core');
 ensureStyle('./03_styles/runtime/garang-golden-master-assets-v1.css?v=20261013-golden-master-3','assets');
 ensureRuntime();
})(typeof window==='undefined'?globalThis:window);
