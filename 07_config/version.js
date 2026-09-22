(function(root){
 'use strict';
 const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'COMMERCIAL HARDENING',buildId:'20260922-y2g-1',schema:5});
 root.GARANG_BUILD=build;
 if(root.document){document.documentElement.dataset.garangVersion=build.version;document.documentElement.dataset.garangChannel=build.channel;}
})(typeof window==='undefined'?globalThis:window);
