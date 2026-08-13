
/* GARANG V8.5.2 — Firebase Auth integration helper
   Provide window.GARANG_FIREBASE_CONFIG from your deployment environment.
*/
(function () {
  const config = window.GARANG_FIREBASE_CONFIG;
  if (!config || !window.firebase) return;

  try {
    if (!firebase.apps.length) firebase.initializeApp(config);
    const auth = firebase.auth();
    window.GARANG_AUTH = auth;

    window.garangCreateAccount = async function(email, password, displayName) {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      if (displayName && cred.user) await cred.user.updateProfile({displayName});
      return cred.user;
    };

    window.garangSignIn = async function(email, password) {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      return cred.user;
    };

    window.garangSignOut = () => auth.signOut();

    window.garangPasswordReset = email => auth.sendPasswordResetEmail(email);

    auth.onAuthStateChanged(user => {
      document.documentElement.dataset.authenticated = user ? "true" : "false";
      window.dispatchEvent(new CustomEvent("garang-auth-state", {detail:{user}}));
    });
  } catch (e) {
    console.error("[GARANG] Firebase Auth initialization failed:", e);
  }
})();
