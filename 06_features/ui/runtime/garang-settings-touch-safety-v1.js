/* GARANG Settings Touch Safety v2.1
   WebKit can finish the physical gear tap but never service a timer/rAF queued from that click task.
   Own the gear at window capture, stop downstream click delegates, and complete the canonical Settings route
   synchronously before WebKit leaves the isolated capture handler. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  const gear = document.getElementById('settingsTopBtn');
  if (!main || !gear) return;

  const canonicalSettingsClick = gear.onclick;
  let handledSettingsNode = null;
  let lastInterceptAt = 0;
  let lastCleanupAt = 0;
  let lastNavigationAttemptAt = 0;
  let lastNavigationAt = 0;
  let lastCanonicalStartAt = 0;
  let lastCanonicalReturnAt = 0;
  let navigating = false;

  function disableTransientLayer(el) {
    if (!el) return;
    el.style.pointerEvents = 'none';
    el.setAttribute('aria-hidden','true');
  }

  function neutralizeTransientHitLayers() {
    document.querySelectorAll('.garang-coach-v2.sidebar-open').forEach(root => root.classList.remove('sidebar-open'));
    document.querySelectorAll('.garang-more-sheet,.modal-backdrop,.gcp-backdrop,.gcp-panel').forEach(el => {
      disableTransientLayer(el);
      el.style.visibility = 'hidden';
    });
    document.body.classList.remove('menu-open');
  }

  function deactivateTransientLayers() {
    neutralizeTransientHitLayers();

    document.querySelectorAll('.garang-more-sheet').forEach(sheet => sheet.remove());
    document.querySelectorAll('.modal-backdrop,.gcp-backdrop,.gcp-panel').forEach(el => {
      if ('hidden' in el) el.hidden = true;
    });

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

    /* Do not depend on rAF/timers here: the bug itself is a WebKit task starvation case. */
    deactivateTransientLayers();
    return true;
  }

  function navigateSettingsNow() {
    if (typeof canonicalSettingsClick !== 'function' || navigating) return false;
    navigating = true;
    lastNavigationAttemptAt = Date.now();
    lastCanonicalStartAt = Date.now();

    /* app.js tails go() with window.scrollTo({behavior:'instant'}), which is not a standard
       Safari behavior value. Suppress only that tail call while keeping the canonical render/bind path. */
    const nativeScrollTo = window.scrollTo;
    let replacedScroll = false;
    try {
      try {
        window.scrollTo = () => {};
        replacedScroll = true;
      } catch {}

      canonicalSettingsClick.call(gear);
      lastCanonicalReturnAt = Date.now();
      lastNavigationAt = Date.now();

      const scroller = document.scrollingElement || document.documentElement;
      if (scroller) scroller.scrollTop = 0;
      scheduleSettingsCleanup();
      return true;
    } finally {
      if (replacedScroll) {
        try { window.scrollTo = nativeScrollTo; } catch {}
      }
      navigating = false;
    }
  }

  function isGearEvent(event) {
    const target = event?.target;
    return !!target && (target === gear || gear.contains(target));
  }

  function interceptGearClick(event) {
    if (!isGearEvent(event)) return;

    lastInterceptAt = Date.now();
    event.preventDefault();
    event.stopImmediatePropagation();

    /* Only mutate hit-testing state before the route; avoid removing nodes and waking body
       childList observers until the Settings DOM has already been rendered. */
    neutralizeTransientHitLayers();
    navigateSettingsNow();
  }

  function installCaptureIsolation() {
    if (gear.dataset.garangSettingsCapture === '1') return true;
    if (typeof canonicalSettingsClick !== 'function') return false;

    gear.dataset.garangSettingsCapture = '1';
    gear.dataset.garangSettingsSynchronous = '1';

    /* Direct onclick invocation fallback. Physical/programmatic click events are intercepted at window capture. */
    gear.onclick = function settingsFallbackClick() {
      neutralizeTransientHitLayers();
      navigateSettingsNow();
    };

    window.addEventListener('click', interceptGearClick, true);
    return true;
  }

  installCaptureIsolation();

  const observer = new MutationObserver(scheduleSettingsCleanup);
  observer.observe(main, {childList:true, subtree:true});
  scheduleSettingsCleanup();

  window.GarangSettingsTouchSafety = Object.freeze({
    version:'2.1.0',
    neutralizeTransientHitLayers,
    deactivateTransientLayers,
    scheduleSettingsCleanup,
    navigateSettingsNow,
    installCaptureIsolation,
    get lastInterceptAt(){ return lastInterceptAt; },
    get lastCleanupAt(){ return lastCleanupAt; },
    get lastNavigationAttemptAt(){ return lastNavigationAttemptAt; },
    get lastNavigationAt(){ return lastNavigationAt; },
    get lastCanonicalStartAt(){ return lastCanonicalStartAt; },
    get lastCanonicalReturnAt(){ return lastCanonicalReturnAt; }
  });
})();
