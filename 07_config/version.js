(function(root){
'use strict';
const build=Object.freeze({version:'0.11.0-beta.6',label:'0.11.0 BETA 6',channel:'COMMERCIAL HARDENING',buildId:'20261020-founder-rebuild-v6',schema:5});
root.GARANG_BUILD=build;
if(!root.document)return;
document.documentElement.dataset.garangVersion=build.version;
document.documentElement.dataset.garangChannel=build.channel;
function loadStyle(){
 if(document.querySelector('link[data-garang-presentation-v4]'))return;
 const link=document.createElement('link');link.rel='stylesheet';link.href='./03_styles/runtime/garang-founder-target-v6.css?v=6.0.0-clean-rebuild';link.dataset.garangPresentationV4='1';link.dataset.garangFounderTargetV6='1';document.head.appendChild(link);
}
function loadPresentation(){
 if(document.querySelector('script[data-garang-presentation-v4]'))return;
 const script=document.createElement('script');script.src='./06_features/ui/runtime/garang-founder-target-v6.js?v=6.0.0-clean-rebuild';script.defer=true;script.dataset.garangPresentationV4='1';script.dataset.garangFounderTargetV6='1';document.head.appendChild(script);
}
loadStyle();loadPresentation();
})(typeof window==='undefined'?globalThis:window);
