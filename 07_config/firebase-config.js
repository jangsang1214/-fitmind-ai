/* GARANG Firebase Web App config.
   This is a browser-side Firebase config; it contains no service-account secret.

   Firebase SDK recovery:
   GitHub Pages depends on external Firebase compat scripts from gstatic. If a
   device/PWA fails to load any one of those scripts, GARANG used to fall into a
   permanent firebaseReady=false state and only the local demo remained usable.
   While this parser-blocking config file is executing, inject the same Firebase
   10.13.0 compat components from jsDelivr only when they are missing. Existing
   authenticated/local/Firestore data is never modified here.
*/
window.GARANG_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDq9kU2_tXyb8DKMxezdm7jwr4fvMuOWrE",
  authDomain: "fitfind-ai.firebaseapp.com",
  projectId: "fitfind-ai",
  storageBucket: "fitfind-ai.firebasestorage.app",
  messagingSenderId: "1025997386401",
  appId: "1:1025997386401:web:1d63900ff86bb1dcb036e0"
};

(() => {
  'use strict';
  /* Static/Node tooling reads this config too; fallback injection is browser-only. */
  if (typeof document === 'undefined' || typeof document.write !== 'function') return;

  const VERSION = '10.13.0';
  const FALLBACK_BASE = `https://cdn.jsdelivr.net/npm/firebase@${VERSION}/`;
  const diagnostics = window.GARANG_FIREBASE_BOOT = window.GARANG_FIREBASE_BOOT || {fallbacks:[]};

  function writeFallback(file, ready) {
    if (ready()) return;
    diagnostics.fallbacks.push(file);
    const src = `${FALLBACK_BASE}${file}`;
    document.write(`<script data-garang-firebase-fallback="${file}" src="${src}"><\/script>`);
  }

  writeFallback('firebase-app-compat.js', () => !!window.firebase && typeof window.firebase.initializeApp === 'function');
  writeFallback('firebase-auth-compat.js', () => !!window.firebase && typeof window.firebase.auth === 'function');
  writeFallback('firebase-firestore-compat.js', () => !!window.firebase && typeof window.firebase.firestore === 'function');

  /* Parser-inserted fallback scripts execute before the following app scripts. */
  window.addEventListener('DOMContentLoaded', () => {
    diagnostics.sdkReady = !!window.firebase &&
      typeof window.firebase.initializeApp === 'function' &&
      typeof window.firebase.auth === 'function' &&
      typeof window.firebase.firestore === 'function';
  }, {once:true});
})();
