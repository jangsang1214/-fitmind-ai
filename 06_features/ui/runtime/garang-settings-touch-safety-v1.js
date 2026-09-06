/* GARANG Settings Touch Safety v1.2
   Prevent stale full-screen overlays from owning iOS/WebKit hit testing during Settings navigation.
   Preserve the canonical app/router handlers and only delay their execution until WebKit settles. */
(() => {
  'use strict';

  let navigationPending = false;

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

    /* A removed fixed layer can remain in WebKit's hit-test tree for the current frame.
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
    const original = button.onclick;
    if (typeof original !== 'function') return false;

    button.dataset.garangSettingsTouchBound = '1';
    button.onclick = function(event) {
      event?.preventDefault?.();
      afterWebKitSettles(() => original.call(button, event));
    };
    return true;
  }

  function bindSheetSettings(root = document) {
    const buttons = root.querySelectorAll?.('.garang-more-sheet [data-route="settings"]') || [];
    buttons.forEach(button => {
      if (button.dataset.garangSettingsTouchBound === '1') return;
      const original = button.onclick;
      if (typeof original !== 'function') return;

      button.dataset.garangSettingsTouchBound = '1';
      button.onclick = function(event) {
        event?.preventDefault?.();
        afterWebKitSettles(() => original.call(button, event));
      };
    });
  }

  /* app.js binds the top Settings handler synchronously before this runtime loads. */
  bindTopSettings();
  bindSheetSettings();

  /* More-sheet controls are created dynamically. MutationObserver runs after Functional Recovery
     has created the sheet and assigned its canonical onclick handlers. */
  const observer = new MutationObserver(() => {
    bindTopSettings();
    bindSheetSettings();
  });
  observer.observe(document.body, {childList:true, subtree:true});

  window.GarangSettingsTouchSafety = Object.freeze({
    deactivateTransientLayers,
    afterWebKitSettles,
    bindTopSettings,
    bindSheetSettings
  });
})();
