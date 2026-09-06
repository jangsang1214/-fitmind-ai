/* GARANG Settings Touch Safety v1.5
   Prevent stale full-screen overlays from owning iOS/WebKit hit testing during Settings navigation.
   The canonical Settings click handler is never replaced, delayed, prevented, or re-dispatched. */
(() => {
  'use strict';

  function disableTransientLayer(el) {
    if (!el) return;
    el.style.pointerEvents = 'none';
    el.setAttribute('aria-hidden','true');
  }

  function deactivateTransientLayers() {
    /* Close Coach mobile state first. Do not leave inline !important styles on its persistent backdrop. */
    document.querySelectorAll('.garang-coach-v2.sidebar-open').forEach(root => root.classList.remove('sidebar-open'));

    /* More is disposable DOM; remove it synchronously before the canonical Settings click renders. */
    document.querySelectorAll('.garang-more-sheet').forEach(sheet => {
      disableTransientLayer(sheet);
      sheet.remove();
    });

    /* These layers are transient and may otherwise remain in WebKit's compositor hit-test tree. */
    document.querySelectorAll('.modal-backdrop,.gcp-backdrop,.gcp-panel').forEach(el => {
      disableTransientLayer(el);
      if ('hidden' in el) el.hidden = true;
    });

    document.body.classList.remove('menu-open');
  }

  function bindTopSettings() {
    const button = document.getElementById('settingsTopBtn');
    if (!button || button.dataset.garangSettingsTouchBound === '1') return false;

    button.dataset.garangSettingsTouchBound = '1';

    /* Physical iOS/PWA input: release stale hit blockers before the browser creates the click.
       No preventDefault/stopPropagation here; app.js keeps full ownership of navigation. */
    button.addEventListener('touchstart', deactivateTransientLayers, {passive:true, capture:true});
    button.addEventListener('pointerdown', deactivateTransientLayers, {passive:true, capture:true});

    return true;
  }

  /* app.js already owns settingsTopBtn.onclick. This runtime only adds pre-click cleanup listeners. */
  bindTopSettings();

  /* If a stale composited sheet incorrectly owns hit testing over the gear, capture the first touch
     at document level, release blockers synchronously, and let the browser continue the same gesture. */
  document.addEventListener('touchstart', event => {
    if (!document.querySelector('.garang-more-sheet,.garang-coach-v2.sidebar-open,.modal-backdrop:not([hidden]),.gcp-backdrop:not([hidden]),.gcp-panel:not([hidden])')) return;
    const touch=event.touches?.[0];
    const gear=document.getElementById('settingsTopBtn');
    if (!touch || !gear) return;
    const r=gear.getBoundingClientRect();
    if (touch.clientX>=r.left && touch.clientX<=r.right && touch.clientY>=r.top && touch.clientY<=r.bottom) {
      deactivateTransientLayers();
    }
  }, {passive:true, capture:true});

  /* Re-apply if another runtime ever recreates the permanent top-bar button. */
  const observer = new MutationObserver(() => bindTopSettings());
  observer.observe(document.body, {childList:true, subtree:true});

  window.GarangSettingsTouchSafety = Object.freeze({
    version:'1.5.0',
    deactivateTransientLayers,
    bindTopSettings
  });
})();
