/* GARANG Settings Touch Safety v1.0
   Prevent stale full-screen overlays from owning iOS/WebKit hit testing during utility-screen navigation. */
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

  function navigateViaCanonicalRouter(page) {
    const proxy = document.querySelector('#bottomNav button');
    if (!proxy) return;
    const oldPage = proxy.dataset.page;
    proxy.dataset.page = page;
    proxy.click();
    proxy.dataset.page = oldPage;
  }

  function safeNavigate(page) {
    if (!page || navigationPending) return;
    navigationPending = true;
    deactivateTransientLayers();

    /* WebKit can retain a removed fixed layer in the hit-test tree for the current frame.
       Cross two animation frames before mounting the destination screen. */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      navigationPending = false;
      navigateViaCanonicalRouter(page);
    }));
  }

  document.addEventListener('click', event => {
    const settingsButton = event.target?.closest?.('#settingsTopBtn');
    if (settingsButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      safeNavigate('settings');
      return;
    }

    const routeButton = event.target?.closest?.('.garang-more-sheet [data-route]');
    if (routeButton) {
      const route = routeButton.dataset.route;
      if (!route) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      safeNavigate(route);
    }
  }, true);

  window.GarangSettingsTouchSafety = Object.freeze({
    deactivateTransientLayers,
    safeNavigate
  });
})();
