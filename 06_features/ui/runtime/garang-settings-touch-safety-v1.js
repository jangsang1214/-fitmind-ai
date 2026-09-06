/* GARANG Settings Touch Safety v2.0
   iOS/WebKit can stall when document/body click delegates continue running after the top Settings gear tap.
   Intercept the gear at the earliest window capture phase, finish the physical click without downstream delegates,
   then route on a clean frame using GARANG's canonical Settings handler. */
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

    /* app.js tails go() with window.scrollTo({behavior:'instant'}).
       Keep that non-standard WebKit scroll outside the Settings render task only. */
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

  function queueSettingsNavigation() {
    if (pendingSettingsNav) return false;
    pendingSettingsNav = true;

    /* Leave the physical click task completely before replacing #main.
       Two animation frames also let WebKit retire the old hit-test/compositing tree. */
    setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          pendingSettingsNav = false;
          deactivateTransientLayers();
          navigateSettingsNow();
        });
      });
    }, 0);
    return true;
  }

  function isGearEvent(event) {
    const target = event?.target;
    return !!target && (target === gear || gear.contains(target));
  }

  function interceptGearClick(event) {
    if (!isGearEvent(event)) return;

    /* This is intentionally on window capture: it runs before document/body delegates.
       Those delegates were the remaining WebKit stall path after the physical tap settled. */
    lastInterceptAt = Date.now();
    event.preventDefault();
    event.stopImmediatePropagation();
    disableTransientLayer(document.querySelector('.garang-more-sheet'));
    queueSettingsNavigation();
  }

  function installCaptureIsolation() {
    if (gear.dataset.garangSettingsCapture === '1') return true;
    if (typeof canonicalSettingsClick !== 'function') return false;

    gear.dataset.garangSettingsCapture = '1';
    gear.dataset.garangSettingsDeferred = '1';

    /* Fallback for non-DOM click invocation; physical/browser clicks are intercepted at window capture. */
    gear.onclick = function settingsFallbackClick() {
      queueSettingsNavigation();
    };

    window.addEventListener('click', interceptGearClick, true);
    return true;
  }

  installCaptureIsolation();

  const observer = new MutationObserver(scheduleSettingsCleanup);
  observer.observe(main, {childList:true, subtree:true});
  scheduleSettingsCleanup();

  window.GarangSettingsTouchSafety = Object.freeze({
    version:'2.0.0',
    deactivateTransientLayers,
    scheduleSettingsCleanup,
    navigateSettingsNow,
    queueSettingsNavigation,
    installCaptureIsolation,
    get lastInterceptAt(){ return lastInterceptAt; },
    get lastCleanupAt(){ return lastCleanupAt; },
    get lastNavigationAttemptAt(){ return lastNavigationAttemptAt; },
    get lastNavigationAt(){ return lastNavigationAt; }
  });
})();
