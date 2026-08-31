/* GARANG V10.5 — stability / regression guard
   Single authority for AUTH <-> APP routing.
   Fixes the V9.9/V10 regression where stale hashes, legacy openPage wrappers,
   and multiple auth listeners could expose app pages over the login screen.
*/
(function () {
  'use strict';
  const APP = document.getElementById('app');
  const AUTH_ID = 'auth';
  const ONBOARD_ID = 'onboarding';
  const APP_IDS = new Set(['dashboard','workout','diet','running','body','report','chat','profile','v93Learning','v93Memory']);
  let auth = null;
  let user = null;
  let ready = false;
  let routeLock = false;

  document.documentElement.classList.add('garang-auth-booting');

  const $ = id => document.getElementById(id);
  const pageEls = () => Array.from(document.querySelectorAll('#app > main > .page'));

  function getAuth() {
    try {
      if (window.GARANG_AUTH) return window.GARANG_AUTH;
      if (window.fbAuth) return window.fbAuth;
      if (window.firebase?.auth) return window.firebase.auth();
    } catch (_) {}
    return null;
  }

  function setVisiblePage(id) {
    const target = $(id) || $(AUTH_ID);
    pageEls().forEach(p => {
      const active = p === target;
      p.classList.toggle('active', active);
      p.setAttribute('aria-hidden', active ? 'false' : 'true');
      p.style.display = active ? 'block' : 'none';
      p.style.visibility = active ? 'visible' : 'hidden';
      p.style.pointerEvents = active ? 'auto' : 'none';
    });

    const nav = $('mainNav');
    const isPublic = target?.id === AUTH_ID;
    if (nav) nav.classList.toggle('hidden', isPublic || !user);
    document.querySelectorAll('#mainNav button[data-page]').forEach(b => {
      b.classList.toggle('active', b.dataset.page === target?.id);
    });

    if (target?.id !== 'auth') $('moreNav')?.classList.remove('open');
    if (target?.id && target.id !== AUTH_ID) {
      try { history.replaceState({garangRoute: target.id}, '', location.pathname + '#' + target.id); } catch (_) {}
    } else {
      try { history.replaceState({garangRoute: 'auth'}, '', location.pathname); } catch (_) {}
    }
    window.scrollTo(0, 0);
  }

  function canUseApp() { return !!user; }

  function safeRoute(id) {
    if (routeLock) return;
    routeLock = true;
    try {
      if (!canUseApp()) {
        setVisiblePage(AUTH_ID);
        return;
      }
      if (id === AUTH_ID) {
        // A signed-in user never stays on the login surface.
        const d = window.__FitMindV6DB?.() || {};
        const needsOnboarding = !!d && d.onboarding && d.onboarding.complete === false;
        setVisiblePage(needsOnboarding ? ONBOARD_ID : 'dashboard');
        return;
      }
      if (id === ONBOARD_ID) { setVisiblePage(ONBOARD_ID); return; }
      setVisiblePage(APP_IDS.has(id) ? id : 'dashboard');
    } finally {
      routeLock = false;
    }
  }

  // Last-loaded authoritative router. Legacy routers may still exist internally,
  // but every public navigation passes through this guard.
  window.openPage = function (id) { safeRoute(String(id || 'dashboard')); };
  window.__GARANG_V105_ROUTE__ = safeRoute;

  function setAuthError(message) {
    const el = $('authError');
    if (el) el.textContent = message || '';
  }

  function authMessage(err) {
    const code = err?.code || '';
    const map = {
      'auth/email-already-in-use':'이미 가입된 이메일입니다.',
      'auth/invalid-email':'이메일 형식이 올바르지 않습니다.',
      'auth/weak-password':'비밀번호는 6자 이상이어야 합니다.',
      'auth/wrong-password':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/invalid-credential':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/user-not-found':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/operation-not-allowed':'Firebase에서 이메일/비밀번호 로그인을 활성화해야 합니다.',
      'auth/network-request-failed':'네트워크 연결을 확인해 주세요.',
      'auth/too-many-requests':'잠시 후 다시 시도해 주세요.',
      'auth/popup-blocked':'로그인 팝업이 차단되었습니다.',
      'auth/popup-closed-by-user':'로그인 창이 닫혔습니다.'
    };
    return map[code] || `로그인 처리 중 오류가 발생했습니다.${code ? ` (${code})` : ''}`;
  }

  function bindAuth() {
    auth = getAuth();
    if (!auth) return false;

    const login = $('loginForm');
    const signup = $('signupForm');
    const reset = $('resetPwBtn');
    const google = $('googleBtn');
    const apple = $('appleBtn');

    if (login && !login.dataset.v105Bound) {
      login.dataset.v105Bound = '1';
      login.addEventListener('submit', async e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        setAuthError('');
        const email = $('loginEmail')?.value.trim();
        const pw = $('loginPw')?.value || '';
        if (!email || !pw) return setAuthError('이메일과 비밀번호를 입력해 주세요.');
        try { await auth.signInWithEmailAndPassword(email, pw); }
        catch (err) { setAuthError(authMessage(err)); }
      }, true);
    }

    if (signup && !signup.dataset.v105Bound) {
      signup.dataset.v105Bound = '1';
      signup.addEventListener('submit', async e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        setAuthError('');
        const name = $('signupName')?.value.trim();
        const email = $('signupEmail')?.value.trim();
        const pw = $('signupPw')?.value || '';
        const pw2 = $('signupPw2')?.value || '';
        if (!name || !email || !pw) return setAuthError('닉네임, 이메일, 비밀번호를 입력해 주세요.');
        if (pw !== pw2) return setAuthError('비밀번호가 서로 다릅니다.');
        if (!$('terms')?.checked) return setAuthError('서비스 이용 및 개인정보 처리 동의가 필요합니다.');
        try {
          const cred = await auth.createUserWithEmailAndPassword(email, pw);
          if (cred.user && name) await cred.user.updateProfile({displayName:name});
          const db = window.__FitMindV6DB?.();
          if (db) {
            db.profile = Object.assign({}, db.profile, {name});
            db.onboarding = Object.assign({complete:false}, db.onboarding || {});
            window.__FitMindV6Save?.();
          }
          try { await firebase.firestore().collection('users').doc(cred.user.uid).set(db || {}, {merge:true}); } catch (_) {}
        } catch (err) { setAuthError(authMessage(err)); }
      }, true);
    }

    if (reset && !reset.dataset.v105Bound) {
      reset.dataset.v105Bound = '1';
      reset.addEventListener('click', async e => {
        e.preventDefault();
        setAuthError('');
        const email = $('loginEmail')?.value.trim();
        if (!email) return setAuthError('이메일 주소를 먼저 입력해 주세요.');
        try { await auth.sendPasswordResetEmail(email); setAuthError('비밀번호 재설정 이메일을 보냈습니다.'); }
        catch (err) { setAuthError(authMessage(err)); }
      }, true);
    }

    if (google && !google.dataset.v105Bound) {
      google.dataset.v105Bound = '1';
      google.addEventListener('click', async e => {
        e.preventDefault(); setAuthError('');
        try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
        catch (err) { setAuthError(authMessage(err)); }
      }, true);
    }

    if (apple && !apple.dataset.v105Bound) {
      apple.dataset.v105Bound = '1';
      apple.addEventListener('click', async e => {
        e.preventDefault(); setAuthError('');
        try { await auth.signInWithPopup(new firebase.auth.OAuthProvider('apple.com')); }
        catch (err) { setAuthError('Apple 로그인을 사용하려면 Firebase에서 Apple 제공자를 활성화해야 합니다.'); }
      }, true);
    }
    return true;
  }

  async function finishAuthState(nextUser) {
    user = nextUser || null;
    window.GARANG_AUTH = auth;
    window.GARANG_CURRENT_USER = user;
    const badge = $('planBadge');
    const account = $('accountBtn');
    if (badge) { badge.hidden = !user; badge.textContent = user ? 'FREE' : 'FREE'; }
    if (account) { account.hidden = !user; account.textContent = user?.displayName ? user.displayName + '님' : '내정보'; }

    if (!user) {
      ready = true;
      document.documentElement.classList.remove('garang-auth-booting');
      setAuthError('');
      setVisiblePage(AUTH_ID);
      return;
    }

    // Load the account state BEFORE exposing the app. This prevents the old
    // regression where a signed-in user briefly saw the wrong empty onboarding
    // state and where a stale hash could win over authentication state.
    try {
      const store = window.firebase?.firestore ? window.firebase.firestore() : null;
      const db = window.__FitMindV6DB?.();
      if (store && db) {
        const snap = await store.collection('users').doc(user.uid).get();
        if (snap.exists) {
          const data = snap.data() || {};
          Object.keys(db).forEach(k => delete db[k]);
          Object.assign(db, data);
          window.__FitMindV6Save?.();
        } else {
          const cached = localStorage.getItem('fitmind_v2_' + user.uid);
          if (cached) {
            const data = JSON.parse(cached);
            Object.keys(db).forEach(k => delete db[k]);
            Object.assign(db, data);
          }
        }
      }
    } catch (err) {
      console.warn('[GARANG V10.5] account state load failed', err);
    }

    ready = true;
    document.documentElement.classList.remove('garang-auth-booting');
    const db = window.__FitMindV6DB?.() || {};
    const needsOnboarding = db.onboarding?.complete === false;
    setVisiblePage(needsOnboarding ? ONBOARD_ID : 'dashboard');
  }

  function start() {
    bindAuth();
    auth = getAuth();
    if (auth) {
      try { auth.onAuthStateChanged(finishAuthState); }
      catch (_) { finishAuthState(null); }
      setTimeout(() => { if (!ready) finishAuthState(auth.currentUser || null); }, 3500);
    } else {
      // Firebase CDN/config failure must fail closed: auth only, never the app.
      finishAuthState(null);
      setAuthError('인증 서버를 불러오지 못했습니다. Firebase 설정 또는 네트워크를 확인해 주세요.');
    }
  }

  // Block legacy navigation while signed out, including stale onclick handlers.
  document.addEventListener('click', e => {
    if (user) return;
    const el = e.target.closest?.('a,button');
    if (!el) return;
    const onclick = el.getAttribute('onclick') || '';
    const target = onclick.match(/open(?:More)?Page\(['"]([^'"]+)/)?.[1];
    if (target && target !== AUTH_ID) {
      e.preventDefault(); e.stopImmediatePropagation(); setVisiblePage(AUTH_ID);
    }
  }, true);

  window.addEventListener('hashchange', () => {
    if (!user) return setVisiblePage(AUTH_ID);
    const id = location.hash.slice(1);
    if (APP_IDS.has(id) || id === ONBOARD_ID) safeRoute(id);
    else safeRoute('dashboard');
  });

  const boot = () => {
    addStabilityStyle();
    start();
  };

  function addStabilityStyle() {
    const s = document.createElement('style');
    s.id = 'garang-v105-stability-style';
    s.textContent = `
      html.garang-auth-booting #app{visibility:hidden!important}
      html.garang-auth-booting body:after{content:'GARANG';position:fixed;inset:0;display:grid;place-items:center;background:#070909;color:#39e66f;font:900 18px -apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:.24em;z-index:99999}
      #app>.page:not(.active){display:none!important;visibility:hidden!important;pointer-events:none!important}
      #auth.active{z-index:10}
      #mainNav.hidden{display:none!important}
    `;
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
