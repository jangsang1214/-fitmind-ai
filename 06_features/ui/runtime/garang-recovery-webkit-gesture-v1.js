/* GARANG recovery WebKit touch safety v3
   iOS/WebKit recovery rule:
   - canonical app navigation is preserved
   - WebKit touch devices normalize the non-standard ScrollToOptions behavior "instant"
     to the legacy numeric scrollTo(x,y) call
   - this avoids the WebKit compositor/main-thread stall reproduced after a recovery
     surface is closed while an async Firestore read is still settling
   - no click capture, preventDefault, stopPropagation, DOM relocation, body lock,
     focus forcing, or synthetic gesture replay
*/
(() => {
'use strict';
if(window.__garangRecoveryWebkitGestureV1)return;
window.__garangRecoveryWebkitGestureV1=true;

function isWebKitTouch(){
  try{
    const ua=String(navigator.userAgent||'');
    const webkit=/AppleWebKit/i.test(ua);
    const touch=('ontouchstart' in window)||(Number(navigator.maxTouchPoints)||0)>0||window.matchMedia?.('(pointer:coarse)')?.matches===true;
    return webkit&&touch;
  }catch{return false;}
}

let normalized=false;
if(isWebKitTouch()&&typeof window.scrollTo==='function'){
  const nativeScrollTo=window.scrollTo.bind(window);
  const safeScrollTo=function(...args){
    const options=args.length===1&&args[0]&&typeof args[0]==='object'?args[0]:null;
    if(options&&String(options.behavior||'').toLowerCase()==='instant'){
      const left=Number.isFinite(Number(options.left))?Number(options.left):(Number(window.scrollX)||0);
      const top=Number.isFinite(Number(options.top))?Number(options.top):(Number(window.scrollY)||0);
      return nativeScrollTo(left,top);
    }
    return nativeScrollTo(...args);
  };
  try{Object.defineProperty(window,'scrollTo',{configurable:true,writable:true,value:safeScrollTo});normalized=window.scrollTo===safeScrollTo;}
  catch{try{window.scrollTo=safeScrollTo;normalized=window.scrollTo===safeScrollTo;}catch{}}
}

window.GarangRecoveryWebkitGestureV1=Object.freeze({version:'v3.0.0',mode:isWebKitTouch()?'webkit-touch-scroll-safe':'native',normalized});
})();