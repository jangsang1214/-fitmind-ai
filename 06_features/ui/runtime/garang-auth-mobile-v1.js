/* GARANG mobile/social auth stability v1
   Uses redirect on mobile/standalone and popup with redirect fallback on desktop.
*/
(() => {
'use strict';
if(window.__garangAuthMobileV1)return;window.__garangAuthMobileV1=true;
const $=id=>document.getElementById(id);
function toast(message){const el=$('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(el.__garangAuthMobileTimer);el.__garangAuthMobileTimer=setTimeout(()=>el.classList.remove('show'),2500);}
function provider(kind){if(kind==='google')return new window.firebase.auth.GoogleAuthProvider();return new window.firebase.auth.OAuthProvider('apple.com');}
function shouldRedirect(){return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)||window.matchMedia?.('(display-mode: standalone)')?.matches===true||navigator.standalone===true;}
async function signIn(kind){
  if(!window.firebase?.apps?.length)return toast('Firebase 연결을 확인해 주세요.');
  const auth=window.firebase.auth(),p=provider(kind);
  try{
    if(shouldRedirect()){await auth.signInWithRedirect(p);return;}
    await auth.signInWithPopup(p);
  }catch(error){
    if(['auth/popup-blocked','auth/popup-closed-by-user','auth/cancelled-popup-request','auth/web-storage-unsupported'].includes(error?.code)){
      try{await auth.signInWithRedirect(p);return;}catch(redirectError){console.warn('[GARANG] redirect auth failed',redirectError);}
    }
    toast(error?.code==='auth/unauthorized-domain'?'Firebase 승인 도메인을 확인해 주세요.':(error?.message||'소셜 로그인을 완료하지 못했습니다.'));
  }
}
function bind(){const google=$('googleBtn'),apple=$('appleBtn');if(google){google.onclick=()=>signIn('google');google.dataset.garangAuthMode=shouldRedirect()?'redirect':'popup-fallback';}if(apple){apple.onclick=()=>signIn('apple');apple.dataset.garangAuthMode=shouldRedirect()?'redirect':'popup-fallback';}}
try{window.firebase?.auth?.().getRedirectResult?.().catch(error=>{if(error?.code&&error.code!=='auth/no-auth-event')console.warn('[GARANG] redirect result',error);});}catch{}
document.addEventListener('DOMContentLoaded',bind,{once:true});setTimeout(bind,0);
window.GarangAuthMobile=Object.freeze({signIn,shouldRedirect,bind});
})();
