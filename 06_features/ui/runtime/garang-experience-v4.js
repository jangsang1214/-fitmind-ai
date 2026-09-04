/* GARANG experience v4
   Memory remains part of GARANG's intelligence/data model, but has no user-facing page or route.
   Settings keeps one canonical entry at the top-bar gear. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  if (!main) return;
  let scheduled = false;
  let redirecting = false;

  const isKo = () => document.documentElement.lang !== 'en';

  function removeRoute(selector) {
    document.querySelectorAll(selector).forEach(el => {
      const parent = el.parentElement;
      el.remove();
      if (parent && (parent.classList.contains('grid') || parent.classList.contains('utility-row'))) {
        parent.classList.add('garang-single-route');
      }
    });
  }

  function internalizeMemorySurface() {
    /* No Memory entry point is rendered or kept hidden in the DOM. */
    removeRoute('[data-pagego="memory"], [data-page="memory"]');

    /* Settings is accessed only from the permanent top-bar gear. */
    removeRoute('[data-pagego="settings"], [data-page="settings"]');

    main.querySelectorAll('.section-title h2').forEach(title => {
      const text = title.textContent.trim();
      if (text === '계획과 기억' || text.toLowerCase() === 'plan & memory') {
        title.textContent = isKo() ? '계획' : 'Plan';
      }
    });

    /* Do not expose the implementation term Memory in plan marketing either. */
    main.querySelectorAll('.plan-choice li').forEach(item => {
      if (/advanced\s+memory/i.test(item.textContent)) {
        item.textContent = isKo() ? '지속 개인화' : 'Persistent personalization';
      }
    });

    /* Defense-in-depth: an old in-memory route can never stay visible. */
    if (!redirecting && main.querySelector('#saveMemory, .memory-card')) {
      const today = document.querySelector('#bottomNav [data-page="today"]');
      if (today) {
        redirecting = true;
        today.click();
        setTimeout(() => { redirecting = false; }, 0);
      } else {
        main.replaceChildren();
      }
    }
  }

  function run() {
    scheduled = false;
    internalizeMemorySurface();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-page],[data-pagego],#settingsTopBtn')) setTimeout(schedule, 0);
  }, true);

  schedule();
})();
