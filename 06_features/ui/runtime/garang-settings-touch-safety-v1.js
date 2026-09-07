/* GARANG Settings Touch Safety v3.1
   Settings-specific observer loops are fixed at their source. This runtime no longer patches
   Node.prototype or intercepts touch/click; it only settles the canonical Settings render and
   retires stale transient hit-test layers. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  const gear = document.getElementById('settingsTopBtn');
  if (!main || !gear) return;

  let handledSettingsNode = null;
  let lastCleanupAt = 0;

  function isSettingsScreen() {
    return !!main.querySelector('#savePreferences');
  }

  function deactivateTransientLayers() {
    document.querySelectorAll('.garang-coach-v2.sidebar-open').forEach(root => root.classList.remove('sidebar-open'));

    document.querySelectorAll('.garang-more-sheet').forEach(el => {
      el.style.setProperty('pointer-events', 'none', 'important');
      el.setAttribute('aria-hidden', 'true');
      el.remove();
    });

    document.querySelectorAll('.modal-backdrop,.gcp-backdrop,.gcp-panel,.g2-sidebar-backdrop').forEach(el => {
      el.style.setProperty('pointer-events', 'none', 'important');
      el.setAttribute('aria-hidden', 'true');
      if ('hidden' in el) el.hidden = true;
      else el.style.setProperty('visibility', 'hidden', 'important');
    });

    document.body.classList.remove('menu-open');
    lastCleanupAt = Date.now();
  }

  function settleSettingsScreen() {
    const save = main.querySelector('#savePreferences');
    if (!save) {
      handledSettingsNode = null;
      return false;
    }
    if (save === handledSettingsNode) return false;

    handledSettingsNode = save;
    if (main.dataset.garangScreen !== 'settings') main.dataset.garangScreen = 'settings';
    deactivateTransientLayers();
    return true;
  }

  window.addEventListener('garang:screen-rendered', settleSettingsScreen);
  window.addEventListener('garang:state-hydrated', settleSettingsScreen);
  window.addEventListener('pageshow', settleSettingsScreen);
  settleSettingsScreen();

  window.GarangSettingsTouchSafety = Object.freeze({
    version: '3.1.0',
    isSettingsScreen,
    deactivateTransientLayers,
    settleSettingsScreen,
    get canonicalGearIntact() { return typeof gear.onclick === 'function'; },
    get lastCleanupAt() { return lastCleanupAt; }
  });
})();
