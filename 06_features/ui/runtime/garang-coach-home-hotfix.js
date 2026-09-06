/* GARANG Coach Shell v5
   Canonical mobile Coach shell owner.
   Legacy filename is intentionally kept so existing deployments load this upgrade without
   introducing another competing runtime layer.

   Responsibilities:
   - one mobile Coach header (no duplicate global chrome)
   - one hamburger that preserves both app navigation and conversation history
   - settings/new-chat remain directly reachable in the same header row
   - compact GARANG Decision strip by default
   - deterministic iOS hit testing: hidden layers cannot intercept touches
*/
(() => {
  'use strict';

  const main = document.getElementById('main');
  if (!main || window.__garangCoachShellV5) return;
  window.__garangCoachShellV5 = true;

  const STYLE_ID = 'garang-coach-shell-v5-style';
  const ACTIVE_ATTR = 'data-garang-coach-shell';
  let queued = false;

  const isKo = () => document.documentElement.lang !== 'en';

  const ROUTES = [
    ['today', 'Today', '오늘'],
    ['workout', 'Workout', '운동'],
    ['nutrition', 'Nutrition', '식단'],
    ['running', 'Running', '러닝'],
    ['body', 'Body', '체성분'],
    ['planner', 'Planner', '계획'],
    ['progress', 'Progress', '분석'],
    ['profile', 'Profile', '프로필'],
    ['onboarding', 'Modeling', '모델링']
  ];

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* Combined app + conversation menu. */
      .g5-app-nav{display:grid;gap:3px;padding:4px 2px 10px;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,.065)}
      .g5-app-nav-label{padding:5px 7px 6px;color:#696e69;font-size:7px;line-height:1;letter-spacing:.16em}
      .g5-app-nav-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px}
      .g5-app-route,.g5-app-action{min-height:36px;border:0;border-radius:8px;background:transparent;color:#9ba09b;text-align:left;padding:7px 8px;font:500 9px/1.2 var(--g2-ui,system-ui);touch-action:manipulation;pointer-events:auto}
      .g5-app-route span,.g5-app-action span{display:block;color:#5f6660;font-size:7px;margin-top:2px}
      .g5-app-route:hover,.g5-app-route:focus-visible,.g5-app-action:hover,.g5-app-action:focus-visible{background:#111412;color:#eceae5;outline:none}
      .g5-account-actions{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:2px}
      .g5-settings{flex:0 0 34px;width:34px;height:34px;padding:0;border:1px solid rgba(255,255,255,.09);border-radius:50%;background:#0b0d0c;color:#aeb2ad;display:grid;place-items:center;font-size:15px;touch-action:manipulation;pointer-events:auto}
      .g5-settings:hover,.g5-settings:focus-visible{border-color:rgba(79,174,146,.28);color:#e6e9e5;outline:none}

      /* Decision stays a strip until the user explicitly expands it. */
      .garang-coach-v2 > section.garang-decision-card{margin:6px 10px 7px!important;padding:0!important;min-height:0!important;height:auto!important;border-radius:12px!important;overflow:hidden!important}
      .garang-coach-v2 .garang-decision-toggle{min-height:46px!important;height:46px!important;padding:0 12px!important;gap:9px!important;touch-action:manipulation!important;pointer-events:auto!important}
      .garang-coach-v2 .garang-decision-kicker{font-size:8px!important;letter-spacing:.1em!important}
      .garang-coach-v2 .garang-decision-mode{font-size:13px!important;line-height:1!important}
      .garang-coach-v2 .garang-decision-chevron{width:26px!important;height:26px!important;font-size:14px!important}
      .garang-coach-v2 .garang-decision-card[data-expanded="false"] .garang-decision-details{display:none!important}
      .garang-coach-v2 .garang-decision-details{padding:0 12px 11px!important}
      .garang-coach-v2 .garang-decision-summary{margin:10px 0 8px!important;font-size:11px!important;line-height:1.5!important}
      .garang-coach-v2 .garang-decision-signals span{font-size:8px!important;padding:4px 6px!important}
      .garang-coach-v2 .garang-decision-foot{margin-top:9px!important;font-size:8px!important}

      @media(max-width:800px){
        /* The Coach owns its own header on mobile. The global fixed topbar must not remain
           above it or participate in hit-testing. */
        html[${ACTIVE_ATTR}="active"] #appView:not([hidden]) > .topbar{display:none!important;visibility:hidden!important;pointer-events:none!important}
        html[${ACTIVE_ATTR}="active"] #appView:not([hidden]) > #main{
          position:relative!important;display:block!important;width:100%!important;max-width:none!important;
          margin:0!important;padding:0!important;height:auto!important;min-height:0!important;
          overflow:hidden!important;contain:none!important;clip-path:none!important;transform:none!important;
          pointer-events:auto!important;
        }
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2{
          width:100%!important;height:calc(100dvh - 62px - env(safe-area-inset-bottom,0px))!important;
          min-height:0!important;margin:0!important;border:0!important;border-radius:0!important;overflow:hidden!important;
          grid-template-columns:1fr!important;isolation:isolate!important;
        }
        html[${ACTIVE_ATTR}="active"] .g2-chat-main{
          position:relative!important;z-index:1!important;height:100%!important;min-height:0!important;
          grid-template-rows:auto minmax(0,1fr) auto!important;overflow:hidden!important;pointer-events:auto!important;
        }
        html[${ACTIVE_ATTR}="active"] .g2-chat-head{
          position:relative!important;z-index:30!important;box-sizing:border-box!important;
          min-height:calc(54px + env(safe-area-inset-top,0px))!important;height:auto!important;
          padding:env(safe-area-inset-top,0px) 10px 0!important;background:#050605!important;
          pointer-events:auto!important;touch-action:manipulation!important;
        }
        html[${ACTIVE_ATTR}="active"] .g2-chat-head button,
        html[${ACTIVE_ATTR}="active"] .g2-composer,
        html[${ACTIVE_ATTR}="active"] .g2-composer button,
        html[${ACTIVE_ATTR}="active"] .g2-composer textarea,
        html[${ACTIVE_ATTR}="active"] .garang-decision-toggle{pointer-events:auto!important}
        html[${ACTIVE_ATTR}="active"] .g2-mobile-threads{display:grid!important;place-items:center!important;flex:0 0 34px!important;width:34px!important;height:34px!important;padding:0!important;touch-action:manipulation!important}
        html[${ACTIVE_ATTR}="active"] .g2-chat-head-copy{flex:1 1 auto!important;min-width:0!important}
        html[${ACTIVE_ATTR}="active"] .g2-head-new{margin-left:auto!important;flex:0 0 auto!important;height:34px!important;padding:0 10px!important;touch-action:manipulation!important}
        html[${ACTIVE_ATTR}="active"] .g2-chat-scroll{min-height:0!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;touch-action:pan-y!important;overscroll-behavior-y:contain!important;pointer-events:auto!important}
        html[${ACTIVE_ATTR}="active"] .g2-composer-wrap{position:relative!important;z-index:25!important;padding:8px 10px calc(10px + env(safe-area-inset-bottom,0px))!important;pointer-events:auto!important}

        /* Closed sidebar/backdrop are truly inert. Opacity alone is not a hit-test state. */
        html[${ACTIVE_ATTR}="active"] .g2-chat-sidebar{z-index:11020!important;padding-top:max(14px,env(safe-area-inset-top,0px))!important;pointer-events:auto!important}
        html[${ACTIVE_ATTR}="active"] .g2-sidebar-backdrop{z-index:11010!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2.sidebar-open .g2-sidebar-backdrop{visibility:visible!important;opacity:1!important;pointer-events:auto!important}

        /* Bottom navigation remains the only fixed app chrome while Coach is open. */
        html[${ACTIVE_ATTR}="active"] #appView:not([hidden]) > .bottom-nav{z-index:900!important;pointer-events:auto!important}
      }
    `;
    document.head.appendChild(style);
  }

  function closeSidebar(root) {
    root?.classList.remove('sidebar-open');
  }

  function fallbackRoute(route) {
    const pageGo = document.querySelector(`[data-pagego="${route}"]`);
    if (pageGo) { pageGo.click(); return true; }
    return false;
  }

  function navigate(route, root) {
    closeSidebar(root);

    if (route === 'settings') {
      const button = document.getElementById('settingsTopBtn');
      if (button) { button.click(); return; }
    }
    if (route === 'profile') {
      const button = document.getElementById('profileTopBtn');
      if (button) { button.click(); return; }
    }

    const bottom = document.querySelector(`#bottomNav [data-page="${route}"]`);
    if (bottom) { bottom.click(); return; }

    const globalMenu = document.getElementById('menuBtn');
    if (globalMenu) {
      globalMenu.click();
      requestAnimationFrame(() => {
        const target = document.querySelector(`.garang-more-sheet [data-route="${route}"]`);
        if (target) target.click(); else fallbackRoute(route);
      });
      return;
    }
    fallbackRoute(route);
  }

  function runAccountAction(action, root) {
    closeSidebar(root);
    const map = {
      settings: 'settingsTopBtn',
      profile: 'profileTopBtn',
      sync: 'syncBadge',
      logout: 'logoutBtn'
    };
    document.getElementById(map[action] || '')?.click();
  }

  function ensureCombinedSidebar(root) {
    const sidebar = root.querySelector('.g2-chat-sidebar');
    const brand = sidebar?.querySelector('.g2-sidebar-brand');
    if (!sidebar || !brand) return;

    let nav = sidebar.querySelector('.g5-app-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'g5-app-nav';
      nav.setAttribute('aria-label', isKo() ? 'GARANG 전체 기능' : 'GARANG app navigation');
      brand.insertAdjacentElement('afterend', nav);
    }

    const signature = isKo() ? 'ko' : 'en';
    if (nav.dataset.language !== signature) {
      nav.dataset.language = signature;
      const routes = ROUTES.map(([route, en, ko]) =>
        `<button type="button" class="g5-app-route" data-g5-route="${route}">${isKo() ? ko : en}<span>${en}</span></button>`
      ).join('');
      nav.innerHTML = `
        <div class="g5-app-nav-label">${isKo() ? 'GARANG 전체 기능' : 'GARANG APP'}</div>
        <div class="g5-app-nav-grid">${routes}</div>
        <div class="g5-account-actions">
          <button type="button" class="g5-app-action" data-g5-action="settings">${isKo() ? '설정' : 'Settings'}<span>SETTINGS</span></button>
          <button type="button" class="g5-app-action" data-g5-action="sync">${isKo() ? '동기화' : 'Sync'}<span>SYNC</span></button>
          <button type="button" class="g5-app-action" data-g5-action="profile">${isKo() ? '프로필' : 'Profile'}<span>PROFILE</span></button>
          <button type="button" class="g5-app-action" data-g5-action="logout">${isKo() ? '로그아웃' : 'Log out'}<span>ACCOUNT</span></button>
        </div>`;
      nav.querySelectorAll('[data-g5-route]').forEach(button => {
        button.onclick = () => navigate(button.dataset.g5Route, root);
      });
      nav.querySelectorAll('[data-g5-action]').forEach(button => {
        button.onclick = () => runAccountAction(button.dataset.g5Action, root);
      });
    }

    const conversationLabel = sidebar.querySelector('.g2-thread-label');
    if (conversationLabel) conversationLabel.textContent = isKo() ? '대화 기록 / CONVERSATIONS' : 'CONVERSATIONS';
  }

  function ensureHeader(root) {
    const head = root.querySelector('.g2-chat-head');
    if (!head) return;

    /* The old separate Home button was the source of the second left-side control. */
    head.querySelectorAll('.g2-home-exit').forEach(button => button.remove());

    const menu = head.querySelector('.g2-mobile-threads');
    if (menu) {
      menu.setAttribute('aria-label', isKo() ? '전체 기능 및 대화 목록' : 'App menu and conversations');
      menu.setAttribute('title', isKo() ? '전체 메뉴' : 'Menu');
    }

    let settings = head.querySelector('.g5-settings');
    if (!settings) {
      settings = document.createElement('button');
      settings.type = 'button';
      settings.className = 'g5-settings';
      settings.textContent = '⚙';
      head.appendChild(settings);
    }
    settings.setAttribute('aria-label', isKo() ? '설정' : 'Settings');
    settings.setAttribute('title', isKo() ? '설정' : 'Settings');
    settings.onclick = () => document.getElementById('settingsTopBtn')?.click();

    const newChat = head.querySelector('.g2-head-new');
    if (newChat) newChat.textContent = isKo() ? '＋ 새 대화' : '+ New chat';
  }

  function compactDecision(root) {
    const card = root.querySelector('.garang-decision-card');
    if (!card || card.dataset.g5CompactInitialized === '1') return;
    card.dataset.g5CompactInitialized = '1';
    card.dataset.expanded = 'false';
    const toggle = card.querySelector('.garang-decision-toggle');
    const details = card.querySelector('.garang-decision-details');
    toggle?.setAttribute('aria-expanded', 'false');
    if (details) details.hidden = true;
  }

  function syncShell() {
    queued = false;
    ensureStyle();
    const root = main.querySelector('.garang-coach-v2');
    if (!root) {
      document.documentElement.removeAttribute(ACTIVE_ATTR);
      return;
    }
    document.documentElement.setAttribute(ACTIVE_ATTR, 'active');
    ensureCombinedSidebar(root);
    ensureHeader(root);
    compactDecision(root);
  }

  function queueSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(syncShell);
  }

  new MutationObserver(queueSync).observe(main, { childList:true, subtree:true });
  new MutationObserver(queueSync).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });
  window.addEventListener('pageshow', queueSync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) queueSync(); });
  queueSync();
})();
