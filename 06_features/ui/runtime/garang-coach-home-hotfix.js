/* GARANG Coach Shell v5.2
   Single-owner mobile Coach shell.
   Root-cause fixes:
   - reconciliation never observes and retriggers its own DOM writes;
   - a closed mobile sidebar and its controls cannot participate in hit testing;
   - manual sync closes the sidebar first and starts from a later task without global click interception.
*/
(() => {
  'use strict';

  const main = document.getElementById('main');
  if (!main || window.__garangCoachShellV52) return;
  window.__garangCoachShellV52 = true;

  const STYLE_ID = 'garang-coach-shell-v52-style';
  const ACTIVE_ATTR = 'data-garang-coach-shell';
  let queued = false;
  let syncing = false;
  let manualSyncTimer = null;

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

  function setText(el, value) {
    if (el && el.textContent !== value) el.textContent = value;
  }

  function setAttr(el, name, value) {
    if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .g5-app-nav{display:grid;gap:3px;padding:4px 2px 10px;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,.065)}
      .g5-app-nav-label{padding:5px 7px 6px;color:#696e69;font-size:7px;line-height:1;letter-spacing:.16em}
      .g5-app-nav-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px}
      .g5-app-route,.g5-app-action{min-height:36px;border:0;border-radius:8px;background:transparent;color:#9ba09b;text-align:left;padding:7px 8px;font:500 9px/1.2 var(--g2-ui,system-ui);touch-action:manipulation;pointer-events:auto}
      .g5-app-route span,.g5-app-action span{display:block;color:#5f6660;font-size:7px;margin-top:2px}
      .g5-app-route:hover,.g5-app-route:focus-visible,.g5-app-action:hover,.g5-app-action:focus-visible{background:#111412;color:#eceae5;outline:none}
      .g5-account-actions{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:2px}
      .g5-settings{flex:0 0 34px;width:34px;height:34px;padding:0;border:1px solid rgba(255,255,255,.09);border-radius:50%;background:#0b0d0c;color:#aeb2ad;display:grid;place-items:center;font-size:15px;touch-action:manipulation;pointer-events:auto}
      .g5-settings:hover,.g5-settings:focus-visible{border-color:rgba(79,174,146,.28);color:#e6e9e5;outline:none}

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
        html[${ACTIVE_ATTR}="active"] #appView:not([hidden]) > .topbar{display:none!important;visibility:hidden!important;pointer-events:none!important}
        html[${ACTIVE_ATTR}="active"] #appView:not([hidden]) > #main{
          position:relative!important;display:block!important;width:100%!important;max-width:none!important;
          margin:0!important;padding:0!important;height:auto!important;min-height:0!important;
          overflow:hidden!important;contain:none!important;clip-path:none!important;transform:none!important;
          pointer-events:auto!important
        }
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2{
          width:100%!important;height:calc(100dvh - 62px - env(safe-area-inset-bottom,0px))!important;
          min-height:0!important;margin:0!important;border:0!important;border-radius:0!important;overflow:hidden!important;
          grid-template-columns:1fr!important;isolation:isolate!important
        }
        html[${ACTIVE_ATTR}="active"] .g2-chat-main{
          position:relative!important;z-index:1!important;height:100%!important;min-height:0!important;
          grid-template-rows:auto minmax(0,1fr) auto!important;overflow:hidden!important;pointer-events:auto!important
        }
        html[${ACTIVE_ATTR}="active"] .g2-chat-head{
          position:relative!important;z-index:30!important;box-sizing:border-box!important;
          min-height:calc(54px + env(safe-area-inset-top,0px))!important;height:auto!important;
          padding:env(safe-area-inset-top,0px) 10px 0!important;background:#050605!important;
          pointer-events:auto!important;touch-action:manipulation!important
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

        html[${ACTIVE_ATTR}="active"] .g2-chat-sidebar{z-index:11020!important;padding-top:max(14px,env(safe-area-inset-top,0px))!important}
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2:not(.sidebar-open) .g2-chat-sidebar,
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2:not(.sidebar-open) .g2-chat-sidebar button,
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2:not(.sidebar-open) .g2-chat-sidebar a,
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2:not(.sidebar-open) .g2-chat-sidebar [role="button"]{pointer-events:none!important}
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2.sidebar-open .g2-chat-sidebar,
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2.sidebar-open .g2-chat-sidebar button,
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2.sidebar-open .g2-chat-sidebar a,
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2.sidebar-open .g2-chat-sidebar [role="button"]{pointer-events:auto!important}
        html[${ACTIVE_ATTR}="active"] .g2-sidebar-backdrop{z-index:11010!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
        html[${ACTIVE_ATTR}="active"] .garang-coach-v2.sidebar-open .g2-sidebar-backdrop{visibility:visible!important;opacity:1!important;pointer-events:auto!important}
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
    if (pageGo) {
      pageGo.click();
      return true;
    }
    return false;
  }

  function navigate(route, root) {
    closeSidebar(root);

    if (route === 'settings') {
      document.getElementById('settingsTopBtn')?.click();
      return;
    }
    if (route === 'profile') {
      document.getElementById('profileTopBtn')?.click();
      return;
    }

    const bottom = document.querySelector(`#bottomNav [data-page="${route}"]`);
    if (bottom) {
      bottom.click();
      return;
    }

    const globalMenu = document.getElementById('menuBtn');
    if (globalMenu) {
      globalMenu.click();
      requestAnimationFrame(() => {
        const target = document.querySelector(`.garang-more-sheet [data-route="${route}"]`);
        if (target) target.click();
        else fallbackRoute(route);
      });
      return;
    }
    fallbackRoute(route);
  }

  function runAccountAction(action, root) {
    closeSidebar(root);

    if (action === 'sync') {
      if (manualSyncTimer) {
        clearTimeout(manualSyncTimer);
        manualSyncTimer = null;
      }
      const button = root?.querySelector('.g5-app-action[data-g5-action="sync"]');
      button?.setAttribute('aria-busy', 'true');
      manualSyncTimer = setTimeout(() => {
        manualSyncTimer = null;
        button?.removeAttribute('aria-busy');
        document.getElementById('syncBadge')?.click();
      }, 220);
      return;
    }

    const map = {
      settings: 'settingsTopBtn',
      profile: 'profileTopBtn',
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
      brand.insertAdjacentElement('afterend', nav);
    }

    setAttr(nav, 'aria-label', isKo() ? 'GARANG 전체 기능' : 'GARANG app navigation');

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

    setText(
      sidebar.querySelector('.g2-thread-label'),
      isKo() ? '대화 기록 / CONVERSATIONS' : 'CONVERSATIONS'
    );
  }

  function ensureHeader(root) {
    const head = root.querySelector('.g2-chat-head');
    if (!head) return;

    head.querySelectorAll('.g2-home-exit').forEach(button => button.remove());

    const menu = head.querySelector('.g2-mobile-threads');
    setAttr(menu, 'aria-label', isKo() ? '전체 기능 및 대화 목록' : 'App menu and conversations');
    setAttr(menu, 'title', isKo() ? '전체 메뉴' : 'Menu');

    let settings = head.querySelector('.g5-settings');
    if (!settings) {
      settings = document.createElement('button');
      settings.type = 'button';
      settings.className = 'g5-settings';
      settings.textContent = '⚙';
      head.appendChild(settings);
    }
    setAttr(settings, 'aria-label', isKo() ? '설정' : 'Settings');
    setAttr(settings, 'title', isKo() ? '설정' : 'Settings');
    if (settings.dataset.g5Bound !== '1') {
      settings.dataset.g5Bound = '1';
      settings.addEventListener('click', () => document.getElementById('settingsTopBtn')?.click());
    }

    setText(head.querySelector('.g2-head-new'), isKo() ? '＋ 새 대화' : '+ New chat');
  }

  function compactDecision(root) {
    const card = root.querySelector('.garang-decision-card');
    if (!card || card.dataset.g5CompactInitialized === '1') return;
    card.dataset.g5CompactInitialized = '1';
    card.dataset.expanded = 'false';
    const toggle = card.querySelector('.garang-decision-toggle');
    const details = card.querySelector('.garang-decision-details');
    setAttr(toggle, 'aria-expanded', 'false');
    if (details) details.hidden = true;
  }

  function syncShell() {
    queued = false;
    if (syncing) return;
    syncing = true;

    /*
      Critical invariant: reconciliation cannot observe its own writes.
      The previous v5 observer watched main/subtree while syncShell() replaced text nodes,
      causing an endless MutationObserver -> RAF -> DOM-write loop on physical iOS.
    */
    try {
      ensureStyle();
      const root = main.querySelector('.garang-coach-v2');
      if (!root) {
        document.documentElement.removeAttribute(ACTIVE_ATTR);
        return;
      }

      if (document.documentElement.getAttribute(ACTIVE_ATTR) !== 'active') {
        document.documentElement.setAttribute(ACTIVE_ATTR, 'active');
      }
      ensureCombinedSidebar(root);
      ensureHeader(root);
    } finally {
      syncing = false;
    }
  }

  function queueSync() {
    if (queued || syncing) return;
    queued = true;
    requestAnimationFrame(syncShell);
  }

  window.addEventListener('garang:screen-rendered', queueSync);
  window.addEventListener('garang:coach-mounted', queueSync);
  window.addEventListener('garang:coach-decision-rendered', queueSync);

  new MutationObserver(queueSync).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang']
  });
  window.addEventListener('pageshow', queueSync);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) queueSync();
  });
  queueSync();
})();
