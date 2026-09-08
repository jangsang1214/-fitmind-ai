/* GARANG Simplified Shell v1
   Keeps every existing feature route and data flow while reducing first-level navigation.
   Record is a single quick-entry surface; legacy LOG stays available internally for compatibility. */
(() => {
  'use strict';
  if (window.GarangSimplifiedShell) return;

  const VERSION = '1.1.1';
  const RECORD_ROUTES = Object.freeze([
    { route:'workout', ko:'운동', en:'Workout', koMeta:'세트 · 인증', enMeta:'Sets · verification' },
    { route:'nutrition', ko:'식단', en:'Nutrition', koMeta:'사진 · 직접 입력', enMeta:'Photo · manual entry' },
    { route:'running', ko:'러닝', en:'Running', koMeta:'거리 · 페이스', enMeta:'Distance · pace' },
    { route:'body', ko:'체성분', en:'Body', koMeta:'측정 · 변화', enMeta:'Measurement · change' }
  ]);
  const RECORD_SCREENS = new Set(RECORD_ROUTES.map(x => x.route));
  const DUPLICATE_MENU_ROUTES = Object.freeze(['today','coach','log','workout','nutrition','running','body','progress']);
  const main = () => document.getElementById('main');
  const nav = () => document.getElementById('bottomNav');
  const primaryButtons = () => nav()?.querySelectorAll('[data-garang-primary-nav="1"]') || [];
  const isKo = () => document.documentElement.lang !== 'en';
  let sheet = null;
  let previousFocus = null;

  function text(el, value) {
    const next = String(value ?? '');
    if (el && el.textContent !== next) el.textContent = next;
  }

  function currentScreen() {
    const screen = main()?.dataset?.garangScreen;
    if (screen) return screen;
    try { return window.GarangRouter?.current?.() || 'today'; } catch { return 'today'; }
  }

  function navGroup(screen = currentScreen()) {
    if (RECORD_SCREENS.has(screen) || screen === 'log') return 'log';
    if (screen === 'progress') return 'progress';
    if (screen === 'coach') return 'coach';
    if (screen === 'today') return 'today';
    return null;
  }

  function labelNavigation() {
    const labels = isKo()
      ? { today:'Today', log:'Record', coach:'Coach', progress:'누적.' }
      : { today:'Today', log:'Record', coach:'Coach', progress:'Accumulation' };
    primaryButtons().forEach(button => {
      const label = button.querySelector('b');
      if (label && labels[button.dataset.page]) text(label, labels[button.dataset.page]);
    });
  }

  function syncActiveNavigation() {
    const active = sheet ? 'log' : navGroup();
    primaryButtons().forEach(button => {
      const selected = !!active && button.dataset.page === active;
      button.classList.toggle('active', selected);
      if (selected) button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
  }

  function hideTodayDuplicateRecordGrid() {
    if (currentScreen() !== 'today') return;
    const appMain = main();
    const grid = appMain?.querySelector('.quick-visual-grid');
    if (!grid) return;
    grid.hidden = true;
    grid.classList.add('garang-record-entry-internalized');
    const heading = [...appMain.querySelectorAll('.section-title')]
      .find(node => /빠른\s*기록|quick\s*record/i.test(node.textContent || ''));
    if (!heading) return;
    heading.hidden = true;
    heading.classList.add('garang-record-entry-internalized');
  }

  function hideDuplicateMenuRoutes() {
    const selector = DUPLICATE_MENU_ROUTES
      .map(route => `.garang-more-sheet [data-route="${route}"],.garang-more-sheet [data-pagego="${route}"]`)
      .join(',');
    document.querySelectorAll(selector).forEach(el => {
      el.hidden = true;
      el.setAttribute('aria-hidden','true');
      el.tabIndex = -1;
      el.classList.add('garang-shell-route-internalized');
    });
  }

  function closeRecordSheet({restoreFocus=true} = {}) {
    if (!sheet) return;
    const old = sheet;
    sheet = null;
    old.remove();
    document.body?.classList.remove('garang-record-open');
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({preventScroll:true});
    previousFocus = null;
    syncActiveNavigation();
  }

  function showRouteError() {
    const toast = document.getElementById('toast');
    if (!toast) return;
    text(toast,isKo()?'화면을 열지 못했습니다.':'Could not open the screen.');
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),1800);
  }

  function navigateCanonical(route, source) {
    let ok = false;
    try { ok = window.GarangRouter?.navigate?.(route,{source,force:true}) === true; } catch {}
    if (!ok) showRouteError();
    return ok;
  }

  function navigateRecord(route) {
    closeRecordSheet({restoreFocus:false});
    navigateCanonical(route,'simplified-shell-record');
  }

  function recordRows() {
    const ko = isKo();
    return RECORD_ROUTES.map(item => `<button type="button" class="garang-record-route" data-garang-record-route="${item.route}"><span><strong>${ko?item.ko:item.en}</strong><small>${ko?item.koMeta:item.enMeta}</small></span><b aria-hidden="true">→</b></button>`).join('');
  }

  function openRecordSheet(trigger) {
    if (sheet) return closeRecordSheet();
    try { window.GarangRouter?.cleanup?.(); } catch {}
    previousFocus = trigger || document.activeElement;
    const ko = isKo();
    const backdrop = document.createElement('div');
    backdrop.className = 'garang-record-backdrop';
    backdrop.dataset.garangRecordSheet = '1';
    backdrop.innerHTML = `<section class="garang-record-sheet" role="dialog" aria-modal="true" aria-labelledby="garangRecordTitle"><header><div><span>RECORD / ${ko?'기록':'LOG'}</span><h2 id="garangRecordTitle">${ko?'빠른 기록':'Quick record'}</h2></div><button type="button" class="garang-record-close" aria-label="${ko?'기록 메뉴 닫기':'Close record menu'}">×</button></header><div class="garang-record-routes">${recordRows()}</div><p>${ko?'필요한 기록만 바로 시작합니다.':'Start only the record you need.'}</p></section>`;
    document.body.appendChild(backdrop);
    sheet = backdrop;
    document.body.classList.add('garang-record-open');
    backdrop.querySelector('.garang-record-close').onclick = () => closeRecordSheet();
    backdrop.querySelectorAll('[data-garang-record-route]').forEach(button => {
      button.onclick = () => navigateRecord(button.dataset.garangRecordRoute);
    });
    backdrop.addEventListener('pointerdown', event => {
      if (event.target === backdrop) closeRecordSheet();
    });
    syncActiveNavigation();
    try { window.dispatchEvent(new CustomEvent('garang:record-sheet-opened',{detail:{source:'simplified-shell'}})); } catch {}
    requestAnimationFrame(()=>backdrop.querySelector('[data-garang-record-route]')?.focus({preventScroll:true}));
  }

  function reconcile() {
    labelNavigation();
    hideTodayDuplicateRecordGrid();
    hideDuplicateMenuRoutes();
    syncActiveNavigation();
    const menu = document.getElementById('menuBtn');
    if (menu) menu.setAttribute('aria-label',isKo()?'더보기':'More');
  }

  document.addEventListener('click', event => {
    const record = event.target.closest?.('#bottomNav [data-garang-primary-nav="1"][data-page="log"]');
    if (record) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openRecordSheet(record);
      return;
    }

    const moreRoute = event.target.closest?.('.garang-more-sheet [data-route],.garang-more-sheet [data-pagego]');
    if (moreRoute && !moreRoute.hidden && moreRoute.getAttribute('aria-hidden') !== 'true') {
      const route = String(moreRoute.dataset.route || moreRoute.dataset.pagego || '').trim().toLowerCase();
      if (route && !DUPLICATE_MENU_ROUTES.includes(route)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        navigateCanonical(route,'simplified-shell-more');
        return;
      }
    }

    if (event.target.closest?.('#menuBtn')) {
      setTimeout(hideDuplicateMenuRoutes,0);
      requestAnimationFrame(()=>requestAnimationFrame(hideDuplicateMenuRoutes));
    }
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sheet) {
      event.preventDefault();
      closeRecordSheet();
    }
  });
  window.addEventListener('garang:screen-rendered', reconcile);
  window.addEventListener('garang:route-completed', reconcile);
  window.addEventListener('garang:route-requested', () => { if (sheet) closeRecordSheet({restoreFocus:false}); });
  window.addEventListener('pageshow', reconcile);

  window.GarangSimplifiedShell = Object.freeze({
    version:VERSION,
    recordRoutes:RECORD_ROUTES,
    openRecordSheet,
    closeRecordSheet,
    reconcile
  });
  reconcile();
})();

/* Subordinate product-loop module. It is intentionally loaded by the Simplified Shell
   so the frozen authoritative boot order and existing single-owner contract stay unchanged. */
(() => {
  'use strict';
  if (window.GarangCoreLoopV1 || document.querySelector('script[data-garang-core-loop-v1]')) return;
  const script=document.createElement('script');
  script.src='./06_features/ui/runtime/garang-core-loop-v1.js?v=1.0.0';
  script.dataset.garangCoreLoopV1='1';
  script.async=false;
  document.head.appendChild(script);
})();
