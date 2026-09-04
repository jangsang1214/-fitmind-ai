/* GARANG experience v4.1
   - Memory remains fully internal to GARANG's intelligence/data model.
   - Settings has one canonical entry: the permanent top-bar gear.
   - Today removes the obsolete duplicate FRONT/BACK tools; only the interactive compact switch remains.
   - Settings keeps the compact SETTING / 설정 eyebrow and removes the oversized page title.
*/
(() => {
  'use strict';

  const main = document.getElementById('main');
  if (!main) return;
  let scheduled = false;
  let redirecting = false;

  const isKo = () => document.documentElement.lang !== 'en';

  function markSingleRoute(parent) {
    if (parent && (parent.classList.contains('grid') || parent.classList.contains('utility-row'))) {
      parent.classList.add('garang-single-route');
    }
  }

  function removeRoute(selector) {
    document.querySelectorAll(selector).forEach(el => {
      const parent = el.parentElement;
      el.remove();
      markSingleRoute(parent);
    });
  }

  function cleanMoreSheet() {
    document.querySelectorAll('.garang-more-sheet [data-route="memory"], .garang-more-sheet [data-route="settings"]').forEach(el => {
      const parent = el.parentElement;
      el.remove();
      markSingleRoute(parent);
    });
  }

  function cleanTodayAnatomy() {
    /* Old Polish v3 controls are obsolete on Today and can otherwise appear as a second FRONT/BACK switch. */
    main.querySelectorAll('.today-body-panel .g3-anatomy-tools').forEach(el => el.remove());
  }

  function cleanSettingsHeading() {
    if (!main.querySelector('#savePreferences')) return;
    const head = main.querySelector('.page-head');
    if (!head) return;
    head.querySelector('h1')?.remove();
  }

  function internalizeMemorySurface() {
    /* No Memory entry point is rendered or kept hidden in the DOM. */
    removeRoute('[data-pagego="memory"], [data-page="memory"]');

    /* Settings is accessed only from the permanent top-bar gear. */
    removeRoute('[data-pagego="settings"], [data-page="settings"]');

    /* The hamburger sheet is rendered under body, so strip these routes there as well. */
    cleanMoreSheet();

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
    cleanTodayAnatomy();
    cleanSettingsHeading();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
  /* Hamburger sheet lives outside main, so watch body for newly inserted route buttons too. */
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('click', event => {
    if (event.target.closest('[data-page],[data-pagego],#menuBtn,#settingsTopBtn')) setTimeout(schedule, 0);
  }, true);

  schedule();
})();
