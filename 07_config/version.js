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

  const versionSrc=document.currentScript?.src||'';
  const assetRoot=versionSrc?new URL('../',versionSrc).href:new URL('./',document.baseURI).href;
  root.GARANG_WANTED_ASSET_ROOT=assetRoot;

  const nativeFetch=typeof root.fetch==='function'?root.fetch.bind(root):null;
  if(nativeFetch&&!root.__GARANG_WANTED_FETCH_COMPAT__){
   root.__GARANG_WANTED_FETCH_COMPAT__=true;
   root.fetch=function(input,init){
    const raw=typeof input==='string'?input:'';
    if(/^\.\/04_data\/wanted\/wanted-14day-synthetic-v1\.json(?:[?#].*)?$/.test(raw)){
     return nativeFetch(new URL('04_data/wanted/wanted-14day-synthetic-v1.json',assetRoot).href,init);
    }
    return nativeFetch(input,init);
   };
  }

  const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('03_styles/runtime/garang-wanted-submission-v1.css?v=1.0.0',assetRoot).href;document.head.appendChild(style);

  const NativeMutationObserver=typeof root.MutationObserver==='function'?root.MutationObserver:null;
  let restoreMutationObserver=null;
  if(NativeMutationObserver){
   const WantedSafeMutationObserver=class{
    constructor(callback){
     this._observer=new NativeMutationObserver((records)=>{
      const meaningful=Array.from(records||[]).filter(record=>{
       if(record?.type!=='attributes'||record.attributeName!=='hidden')return true;
       const beforeHidden=record.oldValue!==null;
       const afterHidden=!!record.target?.hasAttribute?.('hidden');
       return beforeHidden!==afterHidden;
      });
      if(meaningful.length)callback(meaningful,this);
     });
    }
    observe(target,options={}){this._observer.observe(target,{...options,attributeOldValue:true});}
    disconnect(){return this._observer.disconnect();}
    takeRecords(){return this._observer.takeRecords?.()||[];}
   };
   root.MutationObserver=WantedSafeMutationObserver;
   restoreMutationObserver=()=>{if(root.MutationObserver===WantedSafeMutationObserver)root.MutationObserver=NativeMutationObserver;};
  }

  const script=document.createElement('script');script.src=new URL('06_features/ui/runtime/garang-wanted-submission-v1.js?v=1.0.1',assetRoot).href;script.defer=true;
  if(restoreMutationObserver&&typeof script.addEventListener==='function')script.addEventListener('load',restoreMutationObserver,{once:true});
  document.head.appendChild(script);
  if(restoreMutationObserver&&typeof root.setTimeout==='function')root.setTimeout(restoreMutationObserver,5000);
 }
})(typeof window==='undefined'?globalThis:window);
