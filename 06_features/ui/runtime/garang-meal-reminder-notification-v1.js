/* GARANG Beginner Meal Reminder Visibility v1
   Makes configured meal times discoverable from Nutrition and surfaces a
   global in-app reminder while the app is open. It reuses the canonical
   GarangMealReminderBridge and never requests notification permission.
*/
(() => {
  'use strict';
  if (window.GarangMealReminderNotificationV1) return;

  const VERSION = 'garang-meal-reminder-notification-v1.0.0';
  const NOTICE_ID = 'garangMealReminderNotification';
  const STYLE_ID = 'garangMealReminderNotificationStyle';
  const SETTINGS_ID = 'garangMealScheduleShortcut';
  let timer = null;

  const labels = {
    breakfast: { ko: '아침', en: 'Breakfast' },
    lunch: { ko: '점심', en: 'Lunch' },
    dinner: { ko: '저녁', en: 'Dinner' }
  };

  function isKo() {
    return document.documentElement.lang !== 'en';
  }

  function bridge() {
    return window.GarangMealReminderBridge || null;
  }

  function candidateKey(candidate) {
    if (!candidate) return '';
    return [candidate.localDate || '', candidate.mealType || ''].join(':');
  }

  function dismissed(candidate) {
    const key = candidateKey(candidate);
    if (!key) return false;
    try { return sessionStorage.getItem('garang_meal_reminder_later_v1') === key; }
    catch { return false; }
  }

  function dismiss(candidate) {
    const key = candidateKey(candidate);
    try { if (key) sessionStorage.setItem('garang_meal_reminder_later_v1', key); }
    catch {}
    document.getElementById(NOTICE_ID)?.remove();
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#'+NOTICE_ID+'{position:fixed;z-index:260;top:calc(env(safe-area-inset-top,0px) + 66px);left:12px;right:12px;max-width:430px;margin:0 auto;padding:12px 13px;border-radius:18px;background:rgba(18,20,19,.96);color:#f7f7f4;box-shadow:0 12px 32px rgba(0,0,0,.22);backdrop-filter:blur(18px);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}',
      '#'+NOTICE_ID+' .gmr-copy{min-width:0;display:grid;gap:2px}',
      '#'+NOTICE_ID+' .gmr-copy small{font-size:10px;letter-spacing:.12em;opacity:.62}',
      '#'+NOTICE_ID+' .gmr-copy strong{font-size:14px;line-height:1.35}',
      '#'+NOTICE_ID+' .gmr-actions{display:flex;align-items:center;gap:6px}',
      '#'+NOTICE_ID+' button{min-height:40px;border-radius:12px;padding:0 11px;border:0;font:inherit;font-weight:700;cursor:pointer}',
      '#'+NOTICE_ID+' [data-gmr-open]{background:#f4f4ef;color:#151715}',
      '#'+NOTICE_ID+' [data-gmr-later]{background:transparent;color:inherit;opacity:.7;padding:0 7px}',
      '#'+SETTINGS_ID+'{margin:0 0 12px;padding:12px 14px;border:1px solid rgba(128,128,128,.18);border-radius:16px;display:flex;align-items:center;justify-content:space-between;gap:12px}',
      '#'+SETTINGS_ID+' .gmr-settings-copy{display:grid;gap:2px}',
      '#'+SETTINGS_ID+' .gmr-settings-copy strong{font-size:14px}',
      '#'+SETTINGS_ID+' .gmr-settings-copy small{opacity:.62}',
      '#'+SETTINGS_ID+' button{min-height:42px;white-space:nowrap}'
    ].join('');
    document.head.appendChild(style);
  }

  function mountSettingsShortcut() {
    const main = document.getElementById('main');
    if (!main || main.dataset.garangScreen !== 'nutrition') {
      document.getElementById(SETTINGS_ID)?.remove();
      return;
    }
    if (document.getElementById(SETTINGS_ID)) return;
    const anchor = main.querySelector('.meal-scan-card') || main.querySelector('[data-gnr-surface]') || main.firstElementChild;
    if (!anchor) return;
    const section = document.createElement('section');
    section.id = SETTINGS_ID;
    section.setAttribute('data-gmr-settings-shortcut','1');
    const ko = isKo();
    section.innerHTML = '<span class="gmr-settings-copy"><strong>'+(ko?'식사 시간 알림':'Meal time reminders')+'</strong><small>'+(ko?'아침·점심·저녁 시간을 설정하세요':'Set breakfast, lunch and dinner times')+'</small></span><button type="button" class="ghost small" data-gmr-settings>'+(ko?'시간 설정':'Set times')+'</button>';
    section.querySelector('[data-gmr-settings]')?.addEventListener('click', event => {
      event.preventDefault();
      const router = window.GarangRouter;
      if (router?.navigate?.('settings',{source:'meal-reminder-settings',force:true}) === true) return;
      document.getElementById('settingsTopBtn')?.click();
    });
    anchor.insertAdjacentElement('beforebegin', section);
  }

  function mountNotice() {
    const b = bridge();
    const candidate = b?.current?.() || null;
    if (!candidate || dismissed(candidate) || document.visibilityState === 'hidden') {
      document.getElementById(NOTICE_ID)?.remove();
      return;
    }
    b?.markShown?.(candidate);
    if (document.getElementById(NOTICE_ID)?.dataset.key === candidateKey(candidate)) return;
    document.getElementById(NOTICE_ID)?.remove();

    const ko = isKo();
    const mealLabel = labels[candidate.mealType]?.[ko ? 'ko' : 'en'] || (ko ? '식사' : 'Meal');
    const notice = document.createElement('aside');
    notice.id = NOTICE_ID;
    notice.dataset.key = candidateKey(candidate);
    notice.setAttribute('role','status');
    notice.setAttribute('aria-live','polite');
    notice.innerHTML = '<span class="gmr-copy"><small>GARANG / '+(ko?'식사 알림':'MEAL REMINDER')+'</small><strong>'+(ko ? mealLabel+' 드실 시간이에요. 먹은 거 보여주세요.' : 'It is time for '+mealLabel.toLowerCase()+'. Show GARANG what you eat.')+'</strong></span><span class="gmr-actions"><button type="button" data-gmr-later>'+(ko?'나중에':'Later')+'</button><button type="button" data-gmr-open>'+(ko?'사진 찍기':'Scan meal')+'</button></span>';
    notice.querySelector('[data-gmr-later]')?.addEventListener('click', () => dismiss(candidate));
    notice.querySelector('[data-gmr-open]')?.addEventListener('click', event => {
      event.preventDefault();
      if (b?.open?.(candidate) === true) notice.remove();
    });
    document.body.appendChild(notice);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(refresh, 60000);
  }

  function refresh() {
    ensureStyle();
    mountSettingsShortcut();
    mountNotice();
    schedule();
  }

  for (const eventName of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed','garang:cloud-state-ready']) {
    window.addEventListener(eventName, refresh);
  }
  document.addEventListener('visibilitychange', refresh);
  document.documentElement.addEventListener('garang:language-changed', refresh);

  window.GarangMealReminderNotificationV1 = Object.freeze({ version: VERSION, refresh });
  refresh();
})();
