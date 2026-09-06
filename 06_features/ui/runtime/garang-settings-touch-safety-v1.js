/* GARANG Settings Touch Safety v2.2
   WebKit must be allowed to finish the physical Settings gear click before #main is replaced.
   Timer/rAF callbacks can starve after this specific touch sequence, so route work is dispatched through
   independent message task sources (MessageChannel + window.postMessage) and serviced exactly once. */
(() => {
  'use strict';

  const main = document.getElementById('main');
  const gear = document.getElementById('settingsTopBtn');
  if (!main || !gear) return;

  const canonicalSettingsClick = gear.onclick;
  const routeChannel = typeof MessageChannel === 'function' ? new MessageChannel() : null;
  const MESSAGE_TYPE = 'garang:settings-route:v2.2';

  let handledSettingsNode = null;
  let lastInterceptAt = 0;
  let lastCleanupAt = 0;
  let lastDispatchAt = 0;
  let lastTaskAt = 0;
  let lastNavigationAttemptAt = 0;
  let lastNavigationAt = 0;
  let lastCanonicalStartAt = 0;
  let lastCanonicalReturnAt = 0;
  let lastTaskSource = '';
  let dispatchSequence = 0;
  let serviceSequence = 0;
  let navigationSequence = 0;
  let pendingToken = 0;
  let navigating = false;

  function disableTransientLayer(el) {
    if (!el) return;
    el.style.pointerEvents = 'none';
    el.setAttribute('aria-hidden','true');
  }

  function neutralizeTransientHitLayers() {
    document.querySelectorAll('.garang-coach-v2.sidebar-open').forEach(root => root.classList.remove('sidebar-open'));
    document.querySelectorAll('.garang-more-sheet,.modal-backdrop,.gcp-backdrop,.gcp-panel').forEach(el => {
      disableTransientLayer(el);
      el.style.visibility = 'hidden';
    });
    document.body.classList.remove('menu-open');
  }

  function deactivateTransientLayers() {
    neutralizeTransientHitLayers();
    document.querySelectorAll('.garang-more-sheet').forEach(sheet => sheet.remove());
    document.querySelectorAll('.modal-backdrop,.gcp-backdrop,.gcp-panel').forEach(el => {
      if ('hidden' in el) el.hidden = true;
    });
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
    deactivateTransientLayers();
    return true;
  }

  function navigateSettingsNow() {
    if (typeof canonicalSettingsClick !== 'function' || navigating) return false;
    navigating = true;
    lastNavigationAttemptAt = Date.now();
    lastCanonicalStartAt = Date.now();

    /* app.js ends go() with window.scrollTo({behavior:'instant'}). Safari does not define
       "instant" as a ScrollBehavior value, so suppress only that route-tail call. */
    const nativeScrollTo = window.scrollTo;
    let replacedScroll = false;
    try {
      try {
        window.scrollTo = () => {};
        replacedScroll = true;
      } catch {}

      canonicalSettingsClick.call(gear);
      lastCanonicalReturnAt = Date.now();
      lastNavigationAt = Date.now();
      navigationSequence += 1;

      const scroller = document.scrollingElement || document.documentElement;
      if (scroller) scroller.scrollTop = 0;
      scheduleSettingsCleanup();
      return true;
    } finally {
      if (replacedScroll) {
        try { window.scrollTo = nativeScrollTo; } catch {}
      }
      navigating = false;
    }
  }

  function serviceQueuedNavigation(token, source) {
    const n = Number(token) || 0;
    if (!n || n !== pendingToken || n <= serviceSequence) return false;

    /* Claim the token before rendering so the second message source becomes a harmless no-op. */
    serviceSequence = n;
    pendingToken = 0;
    lastTaskAt = Date.now();
    lastTaskSource = source;
    neutralizeTransientHitLayers();
    return navigateSettingsNow();
  }

  function queueSettingsNavigation() {
    if (pendingToken) return pendingToken;

    const token = ++dispatchSequence;
    pendingToken = token;
    lastDispatchAt = Date.now();

    /* MessageChannel and postMessage are intentionally both dispatched. They use message task
       sources rather than the timer/animation queues that stalled in the physical WebKit case.
       serviceQueuedNavigation() makes the pair exactly-once. */
    try { routeChannel?.port2.postMessage(token); } catch {}
    try { window.postMessage({type:MESSAGE_TYPE,token}, '*'); } catch {}
    return token;
  }

  function isGearEvent(event) {
    const target = event?.target;
    return !!target && (target === gear || gear.contains(target));
  }

  function interceptGearClick(event) {
    if (!isGearEvent(event)) return;

    lastInterceptAt = Date.now();
    event.preventDefault();
    event.stopImmediatePropagation();

    /* No page render, node removal, timer or rAF in the physical click task. Only retire known
       stale hit layers and hand the route token to an independent browser task source. */
    neutralizeTransientHitLayers();
    queueSettingsNavigation();
  }

  function installCaptureIsolation() {
    if (gear.dataset.garangSettingsCapture === '1') return true;
    if (typeof canonicalSettingsClick !== 'function') return false;

    gear.dataset.garangSettingsCapture = '1';
    gear.dataset.garangSettingsMessageTask = '1';

    /* Direct onclick fallback for non-event invocation. Browser click events are owned at window capture. */
    gear.onclick = function settingsFallbackClick() {
      neutralizeTransientHitLayers();
      queueSettingsNavigation();
    };

    window.addEventListener('click', interceptGearClick, true);
    return true;
  }

  if (routeChannel) {
    routeChannel.port1.onmessage = event => serviceQueuedNavigation(event.data, 'message-channel');
  }
  window.addEventListener('message', event => {
    const data = event?.data;
    if (!data || data.type !== MESSAGE_TYPE) return;
    serviceQueuedNavigation(data.token, 'window-post-message');
  });

  installCaptureIsolation();

  const observer = new MutationObserver(scheduleSettingsCleanup);
  observer.observe(main, {childList:true, subtree:true});
  scheduleSettingsCleanup();

  window.GarangSettingsTouchSafety = Object.freeze({
    version:'2.2.0',
    neutralizeTransientHitLayers,
    deactivateTransientLayers,
    scheduleSettingsCleanup,
    navigateSettingsNow,
    queueSettingsNavigation,
    serviceQueuedNavigation,
    installCaptureIsolation,
    get lastInterceptAt(){ return lastInterceptAt; },
    get lastCleanupAt(){ return lastCleanupAt; },
    get lastDispatchAt(){ return lastDispatchAt; },
    get lastTaskAt(){ return lastTaskAt; },
    get lastTaskSource(){ return lastTaskSource; },
    get lastNavigationAttemptAt(){ return lastNavigationAttemptAt; },
    get lastNavigationAt(){ return lastNavigationAt; },
    get lastCanonicalStartAt(){ return lastCanonicalStartAt; },
    get lastCanonicalReturnAt(){ return lastCanonicalReturnAt; },
    get dispatchSequence(){ return dispatchSequence; },
    get serviceSequence(){ return serviceSequence; },
    get navigationSequence(){ return navigationSequence; },
    get pendingToken(){ return pendingToken; }
  });
})();
