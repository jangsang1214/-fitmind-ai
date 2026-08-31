/* GARANG V10.6 — AUTH-FIRST ROUTER
   One authority for authentication, routing and visibility.
   This intentionally replaces the V10.4/V10.5 wrapper cycle.
*/
(function(){
  'use strict';
  const APP_IDS=new Set(['dashboard','workout','diet','running','body','report','chat','profile','v93Learning','v93Memory']);
  const $=id=>document.getElementById(id);
  let auth=null, user=null, authResolved=false, routing=false;

  document.documentElement.classList.add('garang-v106-boot');

  function firebaseAuth(){
    try{
      if(window.GARANG_AUTH) return window.GARANG_AUTH;
      if(window.firebase && typeof firebase.auth==='function') return firebase.auth();
    }catch(e){ console.warn('[GARANG V10.6] auth unavailable',e); }
    return null;
  }

  function pageList(){ return Array.from(document.querySelectorAll('main > .page')); }

  function setAuthError(msg){ const el=$('authError'); if(el) el.textContent=msg||''; }

  function friendly(e){
    const c=e?.code||'';
    const m={
      'auth/invalid-email':'이메일 형식이 올바르지 않습니다.',
      'auth/invalid-credential':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/wrong-password':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/user-not-found':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/email-already-in-use':'이미 가입된 이메일입니다.',
      'auth/weak-password':'비밀번호는 6자 이상이어야 합니다.',
      'auth/operation-not-allowed':'Firebase Console에서 이메일/비밀번호 로그인을 활성화해 주세요.',
      'auth/network-request-failed':'네트워크 연결을 확인해 주세요.',
      'auth/too-many-requests':'잠시 후 다시 시도해 주세요.',
      'auth/popup-blocked':'브라우저가 로그인 팝업을 차단했습니다.',
      'auth/popup-closed-by-user':'로그인 창이 닫혔습니다.'
    };
    return m[c] || (c ? `로그인 처리 중 오류가 발생했습니다. (${c})` : '로그인 처리 중 오류가 발생했습니다.');
  }

  function visible(id){
    const target=$(id)||$('auth');
    pageList().forEach(p=>{
      const on=p===target;
      p.classList.toggle('active',on);
      p.setAttribute('aria-hidden',on?'false':'true');
      p.style.display=on?'block':'none';
      p.style.visibility=on?'visible':'hidden';
      p.style.pointerEvents=on?'auto':'none';
    });
    const nav=$('mainNav');
    const more=$('moreNav');
    const publicPage=target?.id==='auth';
    if(nav) nav.classList.toggle('hidden',publicPage||!user);
    if(more && publicPage) more.classList.remove('open');
    document.querySelectorAll('#mainNav button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===target?.id));
    if(target?.id && target.id!=='auth'){
      try{history.replaceState({garang:true,page:target.id},'',location.pathname+'#'+target.id)}catch(_){ }
    }else{
      try{history.replaceState({garang:true,page:'auth'},'',location.pathname)}catch(_){ }
    }
    window.scrollTo(0,0);
  }

  function db(){ try{return window.__FitMindV6DB?.()||{};}catch(_){return{};} }
  function signedIn(){ return !!user; }

  function route(id){
    if(routing) return;
    routing=true;
    try{
      if(!authResolved || !signedIn()){ visible('auth'); return; }
      if(id==='auth'){
        const d=db();
        visible(d.onboarding?.complete===false?'onboarding':'dashboard');
        return;
      }
      if(id==='onboarding'){ visible('onboarding'); return; }
      visible(APP_IDS.has(id)?id:'dashboard');
    }finally{ routing=false; }
  }

  window.openPage=function(id){ route(String(id||'dashboard')); };
  window.__GARANG_ROUTE_V106__=route;

  function bindAuthForms(){
    auth=firebaseAuth();
    window.GARANG_AUTH=auth;
    if(!auth) return false;

    const login=$('loginForm'), signup=$('signupForm'), reset=$('resetPwBtn'), google=$('googleBtn'), apple=$('appleBtn');
    if(login && !login.dataset.v106){
      login.dataset.v106='1';
      login.addEventListener('submit',async e=>{
        e.preventDefault(); e.stopImmediatePropagation();
        setAuthError('');
        const email=$('loginEmail')?.value.trim(), pw=$('loginPw')?.value||'';
        if(!email||!pw){setAuthError('이메일과 비밀번호를 입력해 주세요.');return;}
        const btn=login.querySelector('button[type="submit"]');
        if(btn) btn.disabled=true;
        try{await auth.signInWithEmailAndPassword(email,pw);}
        catch(err){setAuthError(friendly(err));}
        finally{if(btn)btn.disabled=false;}
      },true);
    }
    if(signup && !signup.dataset.v106){
      signup.dataset.v106='1';
      signup.addEventListener('submit',async e=>{
        e.preventDefault(); e.stopImmediatePropagation();
        setAuthError('');
        const name=$('signupName')?.value.trim(), email=$('signupEmail')?.value.trim(), pw=$('signupPw')?.value||'', pw2=$('signupPw2')?.value||'';
        if(!name||!email||!pw){setAuthError('닉네임, 이메일, 비밀번호를 입력해 주세요.');return;}
        if(pw!==pw2){setAuthError('비밀번호가 서로 다릅니다.');return;}
        if(!$('terms')?.checked){setAuthError('서비스 이용 및 개인정보 처리 동의가 필요합니다.');return;}
        const btn=signup.querySelector('button[type="submit"]'); if(btn)btn.disabled=true;
        try{
          const cred=await auth.createUserWithEmailAndPassword(email,pw);
          if(cred.user && name) await cred.user.updateProfile({displayName:name});
          try{
            const store=window.firebase?.firestore?.();
            if(store) await store.collection('users').doc(cred.user.uid).set({profile:{name},onboarding:{complete:false},createdAt:new Date().toISOString()},{merge:true});
          }catch(err){console.warn('[GARANG V10.6] initial profile sync failed',err);}
        }catch(err){setAuthError(friendly(err));}
        finally{if(btn)btn.disabled=false;}
      },true);
    }
    if(reset && !reset.dataset.v106){
      reset.dataset.v106='1';
      reset.addEventListener('click',async e=>{
        e.preventDefault();e.stopImmediatePropagation();setAuthError('');
        const email=$('loginEmail')?.value.trim(); if(!email){setAuthError('이메일 주소를 먼저 입력해 주세요.');return;}
        try{await auth.sendPasswordResetEmail(email);setAuthError('비밀번호 재설정 이메일을 보냈습니다.');}catch(err){setAuthError(friendly(err));}
      },true);
    }
    if(google && !google.dataset.v106){
      google.dataset.v106='1';
      google.addEventListener('click',async e=>{
        e.preventDefault();e.stopImmediatePropagation();setAuthError('');
        try{await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());}catch(err){setAuthError(friendly(err));}
      },true);
    }
    if(apple && !apple.dataset.v106){
      apple.dataset.v106='1';
      apple.addEventListener('click',async e=>{
        e.preventDefault();e.stopImmediatePropagation();setAuthError('');
        try{await auth.signInWithPopup(new firebase.auth.OAuthProvider('apple.com'));}catch(err){setAuthError(friendly(err));}
      },true);
    }
    return true;
  }

  async function loadAccount(u){
    try{
      const store=window.firebase?.firestore?.();
      const localKey='fitmind_v2_'+u.uid;
      if(store){
        const snap=await store.collection('users').doc(u.uid).get();
        if(snap.exists){
          const data=snap.data()||{}; const d=db();
          Object.keys(d).forEach(k=>delete d[k]); Object.assign(d,data);
          window.__FitMindV6Save?.(); return;
        }
      }
      const cached=localStorage.getItem(localKey);
      if(cached){const data=JSON.parse(cached);const d=db();Object.keys(d).forEach(k=>delete d[k]);Object.assign(d,data);}
    }catch(e){console.warn('[GARANG V10.6] account load skipped',e);}
  }

  async function onAuthState(u){
    user=u||null; window.GARANG_CURRENT_USER=user; window.GARANG_AUTH=auth;
    const badge=$('planBadge'), account=$('accountBtn');
    if(badge){badge.hidden=!user;badge.textContent=user?'FREE':'FREE';}
    if(account){account.hidden=!user;account.textContent=user?.displayName?user.displayName+'님':'내정보';}
    if(!user){ authResolved=true; document.documentElement.classList.remove('garang-v106-boot'); setAuthError(''); route('auth'); return; }
    await loadAccount(user);
    authResolved=true; document.documentElement.classList.remove('garang-v106-boot');
    route(db().onboarding?.complete===false?'onboarding':'dashboard');
  }

  function guardClicks(){
    document.addEventListener('click',e=>{
      if(user) return;
      const el=e.target.closest?.('a,button'); if(!el) return;
      const target=(el.getAttribute('onclick')||'').match(/open(?:More)?Page\(['"]([^'"]+)/)?.[1];
      if(target && target!=='auth'){e.preventDefault();e.stopImmediatePropagation();route('auth');}
    },true);
  }

  function guardHash(){
    window.addEventListener('hashchange',()=>{ if(!authResolved||!user){route('auth');return;} const id=location.hash.slice(1);route(APP_IDS.has(id)||id==='onboarding'?id:'dashboard'); });
    window.addEventListener('popstate',()=>{ if(!authResolved||!user)route('auth'); });
  }

  function boot(){
    bindAuthForms(); guardClicks(); guardHash();
    auth=firebaseAuth();
    if(!auth){
      authResolved=true; document.documentElement.classList.remove('garang-v106-boot'); route('auth');
      setAuthError('Firebase 인증을 불러오지 못했습니다. Firebase 설정과 네트워크를 확인해 주세요.');
      return;
    }
    try{auth.onAuthStateChanged(onAuthState);}catch(e){console.error(e);onAuthState(null);}
    setTimeout(()=>{if(!authResolved)onAuthState(auth.currentUser||null);},5000);
  }

  const start=()=>setTimeout(boot,0);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
