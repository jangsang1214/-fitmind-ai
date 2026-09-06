/* GARANG Settings Touch Safety v1.6
   Never mutate the DOM inside an iOS touch gesture.
   app.js keeps full ownership of Settings navigation; stale hit blockers are cleared only after Settings renders. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  if (!main) return;

  let handledSettingsNode = null;
  let lastCleanupAt = 0;

  function disableTransientLayer(el) {
    if (!el) return;
    el.style.pointerEvents = 'none';
    el.setAttribute('aria-hidden','true');
  }

  function deactivateTransientLayers() {
    /* Close persistent Coach state by class only; do not poison its backdrop for future opens. */
    document.querySelectorAll('.garang-coach-v2.sidebar-open').forEach(root => root.classList.remove('sidebar-open'));

    /* More sheets are disposable DOM. */
    document.querySelectorAll('.garang-more-sheet').forEach(sheet => {
      disableTransientLayer(sheet);
      sheet.remove();
    });

    /* Modal-style blockers must not survive behind the Settings route. */
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

    /* The originating iOS tap must finish before any compositor-affecting DOM mutation.
       Clear once on the next frame and once more after WebKit has rebuilt its hit-test tree. */
    requestAnimationFrame(() => {
      deactivateTransientLayers();
      requestAnimationFrame(() => deactivateTransientLayers());
    });
    return true;
  }

  /* render() replaces #main contents synchronously. Observe the resulting Settings DOM,
     rather than intercepting touchstart/pointerdown/click on the gear. */
  const observer = new MutationObserver(scheduleSettingsCleanup);
  observer.observe(main, {childList:true, subtree:true});

  scheduleSettingsCleanup();

  window.GarangSettingsTouchSafety = Object.freeze({
    version:'1.6.0',
    deactivateTransientLayers,
    scheduleSettingsCleanup,
    get lastCleanupAt(){ return lastCleanupAt; }
  });
})();
