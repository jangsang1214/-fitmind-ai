/* GARANG Settings Touch Safety v3.0
   Root cause: Settings-specific UI polish can write identical textContent from a MutationObserver.
   In WebKit that creates a childList feedback loop while Settings owns #main, starving touch handling.
   Keep the canonical gear -> go('settings') route untouched; make no-op text writes truly idempotent
   on Settings and clear any stale transient hit layers after the canonical render completes. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  const gear = document.getElementById('settingsTopBtn');
  const NativeMutationObserver = window.MutationObserver;
  if (!main || !gear || typeof NativeMutationObserver !== 'function') return;

  let handledSettingsNode = null;
  let lastCleanupAt = 0;
  let sameTextWriteSuppressions = 0;

  function isSettingsScreen() {
    return !!main.querySelector('#savePreferences');
  }

  function installIdempotentSettingsTextGuard() {
    if (window.__garangSettingsTextGuardInstalled) return true;
    const descriptor = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    if (!descriptor?.get || !descriptor?.set || descriptor.configurable === false) return false;

    const nativeGet = descriptor.get;
    const nativeSet = descriptor.set;
    Object.defineProperty(Node.prototype, 'textContent', {
      configurable: descriptor.configurable,
      enumerable: descriptor.enumerable,
      get: nativeGet,
      set(value) {
        const next = value == null ? '' : String(value);
        if (
          isSettingsScreen() &&
          this?.nodeType === Node.ELEMENT_NODE &&
          main.contains(this) &&
          nativeGet.call(this) === next
        ) {
          sameTextWriteSuppressions += 1;
          return;
        }
        return nativeSet.call(this, value);
      }
    });
    window.__garangSettingsTextGuardInstalled = true;
    return true;
  }

  function deactivateTransientLayers() {
    document.querySelectorAll('.garang-coach-v2.sidebar-open').forEach(root => root.classList.remove('sidebar-open'));
    document.querySelectorAll(
      '.garang-more-sheet,.modal-backdrop,.gcp-backdrop,.gcp-panel,.g2-sidebar-backdrop'
    ).forEach(el => {
      el.style.setProperty('pointer-events', 'none', 'important');
      el.setAttribute('aria-hidden', 'true');
      if (el.classList.contains('garang-more-sheet')) {
        el.remove();
        return;
      }
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
    main.dataset.garangScreen = 'settings';
    deactivateTransientLayers();
    return true;
  }

  installIdempotentSettingsTextGuard();

  /* Use the native observer captured before any runtime wrapping. This observer never rewrites #main;
     it only marks the canonical Settings render and retires stale hit-test blockers once. */
  const settingsObserver = new NativeMutationObserver(settleSettingsScreen);
  settingsObserver.observe(main, { childList: true, subtree: true });
  settleSettingsScreen();

  window.GarangSettingsTouchSafety = Object.freeze({
    version: '3.0.0',
    isSettingsScreen,
    deactivateTransientLayers,
    settleSettingsScreen,
    get canonicalGearIntact() { return typeof gear.onclick === 'function'; },
    get sameTextWriteSuppressions() { return sameTextWriteSuppressions; },
    get lastCleanupAt() { return lastCleanupAt; }
  });
})();
