/* GARANG Settings Touch Safety v1.7
   Let the physical iOS/WebKit tap finish before Settings synchronously replaces #main.
   Then clear stale transient hit layers after Settings renders. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  const gear = document.getElementById('settingsTopBtn');
  if (!main || !gear) return;

  let handledSettingsNode = null;
  let lastCleanupAt = 0;
  let pendingSettingsNav = false;

  function disableTransientLayer(el) {
    if (!el) return;
    el.style.pointerEvents = 'none';
    el.setAttribute('aria-hidden','true');
  }

  function deactivateTransientLayers() {
    document.querySelectorAll('.garang-coach-v2.sidebar-open').forEach(root => root.classList.remove('sidebar-open'));

    document.querySelectorAll('.garang-more-sheet').forEach(sheet => {
      disableTransientLayer(sheet);
      sheet.remove();
    });

    document.querySelectorAll('.modal-backdrop,.gcp-backdrop,.gcp-panel').forEach(el => {
      disableTransientLayer(el);
      if ('hidden' in el) el.hidden = true;
    });

    document.body.classList.remove('menu-open');
    lastCleanupAt = Date.now();
  }

  function scheduleSettingsCleanup() {
    const save = main.querySelector('#savePreferences');
    if (!save) {
      handledSettingsNode = null;
      return false;
    }
    if (save === handledSettingsNode) return false;
    handledSettingsNode = save;

    requestAnimationFrame(() => {
      deactivateTransientLayers();
      requestAnimationFrame(() => deactivateTransientLayers());
    });
    return true;
  }

  function deferTopSettingsNavigation() {
    if (gear.dataset.garangSettingsDeferred === '1') return true;
    const canonical = gear.onclick;
    if (typeof canonical !== 'function') return false;

    gear.dataset.garangSettingsDeferred = '1';
    gear.onclick = function deferredSettingsClick() {
      if (pendingSettingsNav) return;
      pendingSettingsNav = true;

      /* Do not replace #main while WebKit is still completing the physical tap/click task.
         ~2 frames is imperceptible to the user but lets iOS retire the current hit-test gesture. */
      setTimeout(() => {
        pendingSettingsNav = false;
        canonical.call(gear);
      }, 40);
    };
    return true;
  }

  deferTopSettingsNavigation();

  const observer = new MutationObserver(scheduleSettingsCleanup);
  observer.observe(main, {childList:true, subtree:true});
  scheduleSettingsCleanup();

  window.GarangSettingsTouchSafety = Object.freeze({
    version:'1.7.0',
    deactivateTransientLayers,
    scheduleSettingsCleanup,
    deferTopSettingsNavigation,
    get lastCleanupAt(){ return lastCleanupAt; }
  });
})();
