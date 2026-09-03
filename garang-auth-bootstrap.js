/* GARANG AUTH BOOTSTRAP v1.1
   Keeps the first screen responsive even while app data is loading.
   app.js can safely overwrite these handlers once its normal boot finishes.
*/
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  function toast(message) {
    const t = $('toast');
    if (!t) return;
    t.textContent = message;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function ensureFirebase() {
    try {
      const cfg = window.GARANG_FIREBASE_CONFIG;
      if (!window.firebase || !cfg || !cfg.apiKey) return false;
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      return !!firebase.apps.length;
    } catch (e) {
      console.error('[GARANG auth bootstrap] Firebase init failed', e);
      return false;
    }
  }

  function firebaseMessage(e) {
    const code = e && e.code || '';
    const map = {
      'auth/invalid-credential':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/user-not-found':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/wrong-password':'이메일 또는 비밀번호가 올바르지 않습니다.',
      'auth/email-already-in-use':'이미 사용 중인 이메일입니다.',
      'auth/weak-password':'비밀번호는 6자 이상이어야 합니다.',
      'auth/invalid-email':'이메일 형식을 확인해 주세요.',
      'auth/popup-closed-by-user':'로그인이 취소되었습니다.',
      'auth/popup-blocked':'브라우저에서 로그인 팝업을 허용해 주세요.',
      'auth/operation-not-allowed':'Firebase Console에서 해당 로그인 방식을 활성화해 주세요.',
      'auth/unauthorized-domain':'Firebase Authentication 승인 도메인을 확인해 주세요.'
    };
    return map[code] || (e && e.message) || '인증 중 오류가 발생했습니다.';
  }

  async function emailAuth(signup) {
    if (!ensureFirebase()) return toast('Firebase 설정을 확인해 주세요.');
    const emailEl = $(signup ? 'signupEmail' : 'loginEmail');
    const pwEl = $(signup ? 'signupPassword' : 'loginPassword');
    const email = emailEl && emailEl.value.trim();
    const password = pwEl && pwEl.value;
    if (!email || !password) return toast('이메일과 비밀번호를 입력해 주세요.');
    try {
      if (signup) {
        const credential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        if (credential.user && !credential.user.displayName) {
          await credential.user.updateProfile({displayName: email.split('@')[0]});
        }
        toast('계정을 만들었습니다.');
      } else {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        toast('로그인했습니다.');
      }
    } catch (e) {
      toast(firebaseMessage(e));
    }
  }

  async function socialAuth(kind) {
    if (!ensureFirebase()) return toast('Firebase 설정을 확인해 주세요.');
    try {
      const provider = kind === 'google'
        ? new firebase.auth.GoogleAuthProvider()
        : new firebase.auth.OAuthProvider('apple.com');
      await firebase.auth().signInWithPopup(provider);
    } catch (e) {
      toast(firebaseMessage(e));
    }
  }

  async function resetPassword() {
    if (!ensureFirebase()) return toast('Firebase 설정을 확인해 주세요.');
    const email = $('loginEmail') && $('loginEmail').value.trim();
    if (!email) return toast('이메일을 먼저 입력해 주세요.');
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      toast('재설정 메일을 보냈습니다.');
    } catch (e) {
      toast(firebaseMessage(e));
    }
  }

  function bindImmediateAuth() {
    const authView = $('authView');
    const authCard = document.querySelector('.auth-card');
    if (!authView || !authCard) return;

    // Defensive interaction layer: decorative/runtime layers must never intercept auth.
    authView.style.pointerEvents = 'auto';
    authCard.style.position = 'relative';
    authCard.style.zIndex = '30';
    authCard.style.pointerEvents = 'auto';

    document.querySelectorAll('[data-auth-tab]').forEach(button => {
      button.onclick = () => {
        document.querySelectorAll('[data-auth-tab]').forEach(x => x.classList.remove('active'));
        button.classList.add('active');
        if ($('loginForm')) $('loginForm').hidden = button.dataset.authTab !== 'login';
        if ($('signupForm')) $('signupForm').hidden = button.dataset.authTab !== 'signup';
      };
    });

    if ($('loginForm')) $('loginForm').onsubmit = e => { e.preventDefault(); emailAuth(false); };
    if ($('signupForm')) $('signupForm').onsubmit = e => { e.preventDefault(); emailAuth(true); };
    if ($('resetPassword')) $('resetPassword').onclick = resetPassword;
    if ($('googleBtn')) $('googleBtn').onclick = () => socialAuth('google');
    if ($('appleBtn')) $('appleBtn').onclick = () => socialAuth('apple');
    if ($('demoBtn')) $('demoBtn').onclick = () => {
      localStorage.setItem('garang_demo', '1');
      const button = $('demoBtn');
      if (button) { button.disabled = true; button.textContent = 'GARANG 시작 중…'; }
      toast('데모를 준비하고 있습니다.');
      // app.js will pick up garang_demo as soon as its normal boot finishes.
      setTimeout(() => {
        if ($('authView') && !$('authView').hidden && button) {
          button.disabled = false;
          button.textContent = '데모로 시작하기';
          toast('초기화가 지연되고 있습니다. 다시 한 번 눌러 주세요.');
        }
      }, 4200);
    };

    authView.dataset.authBootstrap = 'ready';
  }

  bindImmediateAuth();
  window.addEventListener('load', () => {
    const auth = $('authView');
    if (auth && !auth.hidden && auth.dataset.authBootstrap !== 'ready') bindImmediateAuth();
  }, {once:true});
})();
