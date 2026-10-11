(function(root){
 'use strict';
 const build=Object.freeze({version:'0.11.0-beta.7',label:'0.11.0 BETA 7',channel:'GOLDEN MASTER REBUILD',buildId:'20261011-golden-master-1',schema:5});
 root.GARANG_BUILD=build;
 if(!root.document)return;
 document.documentElement.dataset.garangVersion=build.version;
 document.documentElement.dataset.garangChannel=build.channel;
 function ensureStyle(){
   if(document.querySelector('link[data-garang-golden-master]'))return;
   const link=document.createElement('link');
   link.rel='stylesheet';
   link.href='./03_styles/runtime/garang-golden-master-v1.css?v=1.0.0';
   link.dataset.garangGoldenMaster='1';
   document.head.appendChild(link);
 }
 function ensureRuntime(){
   if(root.GarangGoldenMasterV1||document.querySelector('script[data-garang-golden-master]'))return;
   const script=document.createElement('script');
   script.src='./06_features/ui/runtime/garang-golden-master-v1.js?v=1.0.0';
   script.defer=true;
   script.dataset.garangGoldenMaster='1';
   document.head.appendChild(script);
 }
 ensureStyle();
 ensureRuntime();
})(typeof window==='undefined'?globalThis:window);