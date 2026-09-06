/* GARANG mobile social auth v1
   Desktop keeps canonical popup auth. Mobile/PWA uses redirect to avoid popup blocking.
*/
(() => {
'use strict';
if(window.__garangMobileAuthV1)return;window.__garangMobileAuthV1=true;
function isMobileAuthContext(){const ua=navigator.userAgent||'';return /iPhone|iPad|iPod|Android/i.test(ua)||window.matchMedia?.('(display-mode: standalone)')?.matches===true||navigator.standalone===true;}
function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(el.__mobileAuthTimer);el.__mobileAuthTimer=setTimeout(()=>el.classList.remove('show'),2400);}
function bind(){if(!isMobileAuthContext()||!window.firebase?.apps?.length)return false;const auth=window.firebase.auth();const google=document.getElementById('googleBtn'),apple=document.getElementById('appleBtn');if(google){google.onclick=async()=>{try{await auth.signInWithRedirect(new window.firebase.auth.GoogleAuthProvider());}catch(error){console.warn('[GARANG] Google redirect auth failed',error);toast(error?.message||'Google 로그인을 시작하지 못했습니다.');}};google.dataset.garangMobileAuth='redirect';}if(apple){apple.onclick=async()=>{try{await auth.signInWithRedirect(new window.firebase.auth.OAuthProvider('apple.com'));}catch(error){console.warn('[GARANG] Apple redirect auth failed',error);toast(error?.message||'Apple 로그인을 시작하지 못했습니다.');}};apple.dataset.garangMobileAuth='redirect';}return true;}
bind();window.addEventListener('pageshow',bind,{once:true});
window.GarangMobileAuthV1=Object.freeze({version:'v1',bind,isMobileAuthContext});
})();
