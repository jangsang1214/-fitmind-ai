(function(root){
 'use strict';
 const build=Object.freeze({version:'0.11.0-beta.5',label:'0.11.0 BETA 5',channel:'STABILITY + DATA V2',schema:5});
 const wanted=Object.freeze({version:'wanted-2026-v1',sourceSha:'b863a7634bd64b03a6e6f3772950c43cc81afb6f',channel:'WANTED 2026 DERIVATIVE'});
 root.GARANG_BUILD=build;
 root.GARANG_WANTED_SUBMISSION=wanted;
 if(root.document){
  document.documentElement.dataset.garangVersion=build.version;
  document.documentElement.dataset.garangChannel=build.channel;
  document.documentElement.dataset.garangDerivative=wanted.version;
  const style=document.createElement('link');style.rel='stylesheet';style.href='./03_styles/runtime/garang-wanted-submission-v1.css?v=1.0.0';document.head.appendChild(style);
  const script=document.createElement('script');script.src='./06_features/ui/runtime/garang-wanted-submission-v1.js?v=1.0.0';script.defer=true;document.head.appendChild(script);
 }
})(typeof window==='undefined'?globalThis:window);
