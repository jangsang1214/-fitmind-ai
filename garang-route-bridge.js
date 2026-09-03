/* GARANG secondary-route bridge.
   Uses the canonical bottom-nav click handler to reach existing routes without touching app.js. */
(() => {
  'use strict';
  const routeByLabel = {
    progress:'progress', running:'running', planner:'planner', memory:'memory', profile:'profile'
  };
  function go(route) {
    const proxy = document.querySelector('#bottomNav button');
    if (!proxy) return;
    const original = proxy.dataset.page;
    proxy.dataset.page = route;
    proxy.click();
    proxy.dataset.page = original;
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.gx-secondary-grid button');
    if (!b) return;
    const route = routeByLabel[b.textContent.trim().toLowerCase()];
    if (!route) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    go(route);
  }, true);
})();
