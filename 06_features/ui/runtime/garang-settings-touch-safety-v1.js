/* GARANG Settings Touch Safety v1.3
   Prevent stale full-screen overlays from owning iOS/WebKit hit testing during Settings navigation.
   Settings has one canonical entry: the permanent top-bar gear. */
(() => {
  'use strict';

  let navigationPending = false;
  let lastTouchNavigationAt = 0;

  function disableHitTesting(el) {
    if (!el) return;
    el.style.setProperty('pointer-events','none','important');
    el.setAttribute('aria-hidden','true');
  }

  function deactivateTransientLayers() {
    document.querySelectorAll('.garang-coach-v2.sidebar-open').forEach(root => root.classList.remove('sidebar-open'));

    document.querySelectorAll('.garang-more-sheet,.modal-backdrop,.gcp-backdrop,.gcp-panel,.g2-sidebar-backdrop').forEach(el => {
      disableHitTesting(el);
      if (el.classList.contains('garang-more-sheet')) {
        el.remove();
        return;
      }
      if (!el.classList.contains('g2-sidebar-backdrop') && 'hidden' in el) el.hidden = true;
    });

    document.body.classList.remove('menu-open');
  }

  function afterWebKitSettles(run) {
    if (navigationPending || typeof run !== 'function') return false;
    navigationPending = true;
    deactivateTransientLayers();

    /* A removed fixed/composited layer can remain in WebKit's hit-test tree for the current frame.
       Cross two animation frames before executing the already-bound canonical route. */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      navigationPending = false;
      run();
    }));
    return true;
  }

  function bindTopSettings() {
    const button = document.getElementById('settingsTopBtn');
    if (!button || button.dataset.garangSettingsTouchBound === '1') return false;
    const canonicalClick = button.onclick;
    if (typeof canonicalClick !== 'function') return false;

    button.dataset.garangSettingsTouchBound = '1';

    /* Physical iOS/PWA taps are owned by touchend so navigation does not depend on WebKit
       producing a later synthetic click after composited layers have changed. */
    button.addEventListener('touchend', event => {
      event.preventDefault();
      event.stopPropagation();
      lastTouchNavigationAt = Date.now();
      afterWebKitSettles(() => canonicalClick.call(button, event));
    }, {passive:false});

    /* Mouse/keyboard/desktop fallback. Ignore the synthetic click that can follow touchend. */
    button.onclick = function(event) {
      if (Date.now() - lastTouchNavigationAt < 700) {
        event?.preventDefault?.();
        return;
      }
      event?.preventDefault?.();
      afterWebKitSettles(() => canonicalClick.call(button, event));
    };
    return true;
  }

  /* app.js binds the canonical Settings handler synchronously before this runtime loads. */
  bindTopSettings();

  /* Re-apply only if another runtime replaces/recreates the top-bar button. */
  const observer = new MutationObserver(() => bindTopSettings());
  observer.observe(document.body, {childList:true, subtree:true});

  window.GarangSettingsTouchSafety = Object.freeze({
    version:'1.3.0',
    deactivateTransientLayers,
    afterWebKitSettles,
    bindTopSettings
  });
})();
