(function(root){
 'use strict';
 const build=Object.freeze({version:'0.11.0-beta.8',label:'0.11.0 BETA 8',channel:'GOLDEN MASTER REBUILD',buildId:'20261013-golden-master-2',schema:5});
 root.GARANG_BUILD=build;
 if(!root.document)return;
 document.documentElement.dataset.garangVersion=build.version;
 document.documentElement.dataset.garangChannel=build.channel;
 function ensureStyle(href,key){
   if(document.querySelector(`link[data-garang-golden-master="${key}"]`))return;
   const link=document.createElement('link');
   link.rel='stylesheet';
   link.href=href;
   link.dataset.garangGoldenMaster=key;
   document.head.appendChild(link);
 }
 function ensureRuntime(){
   if(root.GarangGoldenMasterV1||document.querySelector('script[data-garang-golden-master]'))return;
   const script=document.createElement('script');
   script.src='./06_features/ui/runtime/garang-golden-master-v1.js?v=20261013-golden-master-2';
   script.defer=true;
   script.dataset.garangGoldenMaster='1';
   document.head.appendChild(script);
 }
 ensureStyle('./03_styles/runtime/garang-golden-master-v1.css?v=20261013-golden-master-2','core');
 ensureStyle('./03_styles/runtime/garang-golden-master-assets-v1.css?v=20261013-golden-master-2','assets');
 ensureRuntime();
})(typeof window==='undefined'?globalThis:window);