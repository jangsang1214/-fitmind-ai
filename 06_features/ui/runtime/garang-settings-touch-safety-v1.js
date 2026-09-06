/* GARANG Settings Touch Safety v1.8
   Finish the physical iOS/WebKit tap before routing to Settings.
   Route through GARANG's already-bound bottom-nav handler, then clear stale transient hit layers after Settings renders. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  const gear = document.getElementById('settingsTopBtn');
  if (!main || !gear) return;

  let handledSettingsNode = null;
  let lastCleanupAt = 0;
  let lastNavigationAt = 0;
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

  function navigateSettingsNow() {
    const proxy = document.querySelector('#bottomNav button');
    if (!proxy || typeof proxy.onclick !== 'function') return false;

    const originalPage = proxy.dataset.page;
    try {
      proxy.dataset.page = 'settings';
      proxy.onclick.call(proxy);
      lastNavigationAt = Date.now();
      return true;
    } finally {
      proxy.dataset.page = originalPage;
      /* Direct gear navigation has no matching bottom-nav destination. */
      proxy.classList.remove('active');
    }
  }

  function deferTopSettingsNavigation() {
    if (gear.dataset.garangSettingsDeferred === '1') return true;

    gear.dataset.garangSettingsDeferred = '1';
    gear.onclick = function deferredSettingsClick() {
      if (pendingSettingsNav) return;
      pendingSettingsNav = true;

      /* Keep all page replacement outside the physical tap lifetime.
         100 ms is still visually immediate while staying comfortably beyond WebKit's touch completion task. */
      setTimeout(() => {
        pendingSettingsNav = false;
        navigateSettingsNow();
      }, 100);
    };
    return true;
  }

  deferTopSettingsNavigation();

  const observer = new MutationObserver(scheduleSettingsCleanup);
  observer.observe(main, {childList:true, subtree:true});
  scheduleSettingsCleanup();

  window.GarangSettingsTouchSafety = Object.freeze({
    version:'1.8.0',
    deactivateTransientLayers,
    scheduleSettingsCleanup,
    navigateSettingsNow,
    deferTopSettingsNavigation,
    get lastCleanupAt(){ return lastCleanupAt; },
    get lastNavigationAt(){ return lastNavigationAt; }
  });
})();
