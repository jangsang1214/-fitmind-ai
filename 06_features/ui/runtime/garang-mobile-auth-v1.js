/* GARANG mobile social auth v1.1
   GitHub Pages is cross-origin from Firebase authDomain. Modern Safari/iOS can
   block redirect-based auth storage in that setup, so mobile/PWA uses the same
   user-gesture popup flow as desktop. This avoids silent redirect loops while
   keeping email/password auth untouched.
*/
(() => {
'use strict';
if(window.__garangMobileAuthV1)return;window.__garangMobileAuthV1=true;
function isMobileAuthContext(){const ua=navigator.userAgent||'';return /iPhone|iPad|iPod|Android/i.test(ua)||window.matchMedia?.('(display-mode: standalone)')?.matches===true||navigator.standalone===true;}
function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(el.__mobileAuthTimer);el.__mobileAuthTimer=setTimeout(()=>el.classList.remove('show'),3200);}
function authMessage(error){const code=error?.code||'';if(code==='auth/popup-blocked')return '로그인 창이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해 주세요.';if(code==='auth/popup-closed-by-user'||code==='auth/cancelled-popup-request')return '로그인이 취소되었습니다.';if(code==='auth/unauthorized-domain')return 'Firebase 승인 도메인 설정을 확인해 주세요.';return error?.message||'소셜 로그인을 시작하지 못했습니다.';}
async function popup(auth,provider,label){try{await auth.signInWithPopup(provider);return true;}catch(error){console.warn(`[GARANG] ${label} popup auth failed`,error);toast(authMessage(error));return false;}}
function bind(){if(!isMobileAuthContext()||!window.firebase?.apps?.length)return false;const auth=window.firebase.auth();const google=document.getElementById('googleBtn'),apple=document.getElementById('appleBtn');if(google){google.onclick=()=>popup(auth,new window.firebase.auth.GoogleAuthProvider(),'Google');google.dataset.garangMobileAuth='popup';}if(apple){apple.onclick=()=>popup(auth,new window.firebase.auth.OAuthProvider('apple.com'),'Apple');apple.dataset.garangMobileAuth='popup';}return true;}
bind();window.addEventListener('pageshow',bind,{once:true});
window.GarangMobileAuthV1=Object.freeze({version:'v1.1',bind,isMobileAuthContext});
})();
