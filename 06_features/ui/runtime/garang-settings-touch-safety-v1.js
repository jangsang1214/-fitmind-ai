/* GARANG Settings Touch Safety v1.9
   Finish the physical iOS/WebKit tap before routing to Settings.
   Keep GARANG's canonical Settings handler, but isolate its non-standard instant scroll from the render task.
   Clear stale transient hit layers after Settings renders. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  const gear = document.getElementById('settingsTopBtn');
  if (!main || !gear) return;

  const canonicalSettingsClick = gear.onclick;
  let handledSettingsNode = null;
  let lastCleanupAt = 0;
  let lastNavigationAttemptAt = 0;
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
    if (typeof canonicalSettingsClick !== 'function') return false;
    lastNavigationAttemptAt = Date.now();

    /* app.js uses window.scrollTo({behavior:'instant'}) at the tail of every go().
       On physical WebKit/PWA Settings navigation, replacing #main and immediately invoking this
       non-standard scroll mode can hold the UI task. Suppress only that one scroll call, then
       reset scroll position through the scrolling element after the render has completed. */
    const nativeScrollTo = window.scrollTo;
    let replacedScroll = false;
    try {
      try {
        window.scrollTo = () => {};
        replacedScroll = true;
      } catch {}
      canonicalSettingsClick.call(gear);
      lastNavigationAt = Date.now();
    } finally {
      if (replacedScroll) {
        try { window.scrollTo = nativeScrollTo; } catch {}
      }
    }

    requestAnimationFrame(() => {
      const scroller = document.scrollingElement || document.documentElement;
      if (scroller) scroller.scrollTop = 0;
    });
    return true;
  }

  function deferTopSettingsNavigation() {
    if (gear.dataset.garangSettingsDeferred === '1') return true;
    if (typeof canonicalSettingsClick !== 'function') return false;

    gear.dataset.garangSettingsDeferred = '1';
    gear.onclick = function deferredSettingsClick() {
      if (pendingSettingsNav) return;
      pendingSettingsNav = true;

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
    version:'1.9.0',
    deactivateTransientLayers,
    scheduleSettingsCleanup,
    navigateSettingsNow,
    deferTopSettingsNavigation,
    get lastCleanupAt(){ return lastCleanupAt; },
    get lastNavigationAttemptAt(){ return lastNavigationAttemptAt; },
    get lastNavigationAt(){ return lastNavigationAt; }
  });
})();
