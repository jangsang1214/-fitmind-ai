(function(root){
 'use strict';
 const build=Object.freeze({version:'0.10.0-beta.1',label:'0.10.0 BETA 1',channel:'Development Build',schema:1});
 root.GARANG_BUILD=build;
 if(root.document){document.documentElement.dataset.garangVersion=build.version;document.documentElement.dataset.garangChannel=build.channel;}
})(typeof window==='undefined'?globalThis:window);
