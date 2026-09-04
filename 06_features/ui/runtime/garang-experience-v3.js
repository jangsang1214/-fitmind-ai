/* GARANG experience v3
   - Simplifies workout set recording without removing native data bindings.
   - Keeps Settings in one canonical top-bar route.
   - Hides manual Memory UI while preserving and enriching stored memory.
   - Adds Coach thread "학습시키기 / Learn" and injects learned conversations into future Coach context.
*/
(() => {
  'use strict';

  const main = document.getElementById('main');
  if (!main) return;

  const now = () => new Date().toISOString();
  const uid = () => globalThis.crypto?.randomUUID ? crypto.randomUUID() : `gx_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const isKo = () => document.documentElement.lang !== 'en';
  let scheduled = false;
  let memoryTimer = null;

  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._garangTimer);
    el._garangTimer = setTimeout(() => el.classList.remove('show'), 1800);
  }

  function currentScreen() {
    if (main.querySelector('#saveProfile')) return 'profile';
    if (main.querySelector('#savePreferences')) return 'settings';
    if (main.querySelector('#saveOnboarding')) return 'modeling';
    if (main.querySelector('.workout-builder-v2')) return 'workout';
    return document.querySelector('#bottomNav button.active')?.dataset.page || '';
  }

  function polishHeadersAndModeling() {
    const screen = currentScreen();
    const eyebrow = main.querySelector('.page-head .eyebrow');
    if (eyebrow) {
      const labels = {
        profile: isKo() ? 'PROFILE / 프로필' : 'PROFILE',
        settings: isKo() ? 'SETTING / 설정' : 'SETTING',
        modeling: isKo() ? 'MODELING / 모델링' : 'MODELING'
      };
      if (labels[screen]) eyebrow.textContent = labels[screen];
    }

    const modelEyebrow = main.querySelector('.profile-model-card .eyebrow');
    if (modelEyebrow) modelEyebrow.textContent = isKo() ? 'MODELING / 모델링' : 'MODELING';
    const modelButton = main.querySelector('.profile-model-card [data-pagego="onboarding"]');
    if (modelButton) modelButton.textContent = isKo() ? '모델링 수정' : 'Edit modeling';
  }

  function hideRedundantRoutes() {
    /* Settings has one canonical entry: the top-bar gear. */
    document.querySelectorAll('[data-pagego="settings"], [data-page="settings"]').forEach(el => {
      el.hidden = true;
      el.classList.add('garang-route-hidden');
      el.setAttribute('aria-hidden', 'true');
      el.tabIndex = -1;
    });

    /* Memory is intentionally invisible. It remains a background intelligence layer. */
    document.querySelectorAll('[data-pagego="memory"], [data-page="memory"]').forEach(el => {
      el.hidden = true;
      el.classList.add('garang-route-hidden');
      el.setAttribute('aria-hidden', 'true');
      el.tabIndex = -1;
    });

    main.querySelectorAll('.section-title h2').forEach(h => {
      if (h.textContent.trim() === '계획과 기억') h.textContent = isKo() ? '계획' : 'Plan';
      if (h.textContent.trim().toLowerCase() === 'plan & memory') h.textContent = 'Plan';
    });
  }

  function makeDetails(className, summaryText) {
    const details = document.createElement('details');
    details.className = className;
    const summary = document.createElement('summary');
    summary.textContent = summaryText;
    const body = document.createElement('div');
    body.className = `${className}-body`;
    details.append(summary, body);
    return { details, summary, body };
  }

  function polishSetRecorder() {
    if (currentScreen() !== 'workout') return;
    const card = main.querySelector('.workout-builder-v2');
    if (!card) return;

    card.classList.add('garang-set-minimal');
    const ko = isKo();

    const eyebrow = card.querySelector('.visual-section-head .eyebrow');
    const heading = card.querySelector('.visual-section-head h3');
    const pill = card.querySelector('.visual-section-head .pill');
    if (eyebrow) eyebrow.textContent = 'SESSION';
    if (heading) heading.textContent = ko ? '세트 기록' : 'Set record';
    if (pill) {
      const count = main.querySelectorAll('#workoutDraftArea .list-item').length;
      pill.textContent = ko ? `${count} 기록` : `${count} records`;
      pill.hidden = count === 0;
    }

    const fields = card.querySelector('.workout-fields');
    if (!fields) return;
    fields.classList.add('garang-set-quick-fields');

    let options = card.querySelector('.garang-set-options');
    if (!options) {
      const built = makeDetails('garang-set-options', ko ? '세부 설정' : 'Details');
      options = built.details;
      fields.insertAdjacentElement('afterend', options);

      const oneRm = card.querySelector('.one-rm-panel');
      if (oneRm) built.body.appendChild(oneRm);

      ['wRpe', 'wDuration', 'wBody'].forEach(id => {
        const input = card.querySelector(`#${id}`);
        const field = input?.closest('.field');
        if (field) built.body.appendChild(field);
      });

      const clear = card.querySelector('#clearWorkoutDraft');
      if (clear) {
        clear.textContent = ko ? '기록 초기화' : 'Clear records';
        clear.classList.add('garang-set-clear');
        built.body.appendChild(clear);
      }
    } else {
      const summary = options.querySelector('summary');
      if (summary) summary.textContent = ko ? '세부 설정' : 'Details';
    }

    const add = card.querySelector('#addWorkout');
    if (add) {
      add.textContent = ko ? '기록 추가' : 'Add record';
      add.classList.add('garang-set-primary');
    }

    const save = card.querySelector('#saveWorkoutSession');
    if (save) {
      save.textContent = ko ? '운동 저장' : 'Save workout';
      save.classList.toggle('garang-set-save-ready', !save.disabled);
    }

    const draft = card.querySelector('#workoutDraftArea');
    if (draft) draft.classList.toggle('garang-draft-empty', !!draft.querySelector('.empty'));
  }

  function activeAppRecord() {
    const rows = [];
    try {
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key || (!key.startsWith('garang_user_') && !key.startsWith('garang_demo_state'))) continue;
        const state = JSON.parse(localStorage.getItem(key) || 'null');
        if (state && typeof state === 'object') rows.push({ key, state });
      }
    } catch (error) {
      console.warn('[GARANG] active state scan failed', error);
    }
    rows.sort((a, b) => String(b.state?.meta?.updatedAt || '').localeCompare(String(a.state?.meta?.updatedAt || '')));
    return rows[0] || null;
  }

  function ensureMemoryShape(state) {
    state.memory = state.memory && typeof state.memory === 'object' ? state.memory : {};
    state.memory.entries = Array.isArray(state.memory.entries) ? state.memory.entries : [];
    state.memory.events = Array.isArray(state.memory.events) ? state.memory.events : [];
    state.actionLog = Array.isArray(state.actionLog) ? state.actionLog : [];
    return state.memory.entries;
  }

  function upsertMemory(entries, spec) {
    const existing = entries.find(x => x.key === spec.key);
    if (existing) {
      if (String(existing.value || '') === String(spec.value || '') && existing.type === spec.type) return false;
      existing.value = spec.value;
      existing.type = spec.type;
      existing.source = spec.source;
      existing.confidence = spec.confidence;
      existing.importance = spec.importance;
      existing.userConfirmed = spec.userConfirmed;
      existing.updatedAt = now();
      return true;
    }
    entries.push({
      id: uid(),
      type: spec.type,
      key: spec.key,
      value: spec.value,
      source: spec.source,
      confidence: spec.confidence,
      importance: spec.importance,
      userConfirmed: spec.userConfirmed,
      createdAt: now(),
      updatedAt: now(),
      expiresAt: null
    });
    return true;
  }

  function syncAutomaticMemory() {
    const rec = activeAppRecord();
    if (!rec) return;
    const { key, state } = rec;
    const entries = ensureMemoryShape(state);
    const profile = state.profile || {};
    const onboarding = state.onboarding || {};
    let changed = false;

    const goal = String(profile.goal || onboarding.goal || '').trim();
    if (goal) changed = upsertMemory(entries, {
      type: 'goal', key: 'auto:primary_goal', value: goal,
      source: 'automatic_profile', confidence: 1, importance: 5, userConfirmed: false
    }) || changed;

    const preferences = String(onboarding.preferences || '').trim();
    if (preferences) changed = upsertMemory(entries, {
      type: 'preference', key: 'auto:training_preferences', value: preferences,
      source: 'automatic_modeling', confidence: .95, importance: 4, userConfirmed: false
    }) || changed;

    const capacityParts = [];
    if (Number(onboarding.weeklyFrequency)) capacityParts.push(`${Number(onboarding.weeklyFrequency)}회/주`);
    if (Number(onboarding.availableMinutes)) capacityParts.push(`${Number(onboarding.availableMinutes)}분/일`);
    if (onboarding.experience) capacityParts.push(String(onboarding.experience));
    if (capacityParts.length) changed = upsertMemory(entries, {
      type: 'behavior', key: 'auto:training_capacity', value: capacityParts.join(' · '),
      source: 'automatic_modeling', confidence: .95, importance: 4, userConfirmed: false
    }) || changed;

    const workouts = Array.isArray(state.workouts) ? state.workouts.slice(-30) : [];
    if (workouts.length >= 3) {
      const counts = new Map();
      workouts.forEach(w => {
        const name = String(w?.name || '').trim();
        if (name) counts.set(name, (counts.get(name) || 0) + 1);
      });
      const frequent = [...counts.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 2).slice(0, 3);
      if (frequent.length) changed = upsertMemory(entries, {
        type: 'behavior', key: 'auto:frequent_exercises',
        value: frequent.map(([name, n]) => `${name} ${n}회`).join(' · '),
        source: 'automatic_workout_pattern', confidence: .85, importance: 3, userConfirmed: false
      }) || changed;
    }

    if (!changed) return;
    state.meta = state.meta && typeof state.meta === 'object' ? state.meta : {};
    state.meta.updatedAt = now();
    try { localStorage.setItem(key, JSON.stringify(state)); }
    catch (error) { console.warn('[GARANG] automatic memory save failed', error); }
  }

  function coachLearningKey(appKey) {
    return `garang_coach_learning_v1::${appKey}`;
  }

  function readCoachLearning(appKey) {
    try {
      const parsed = JSON.parse(localStorage.getItem(coachLearningKey(appKey)) || 'null');
      if (parsed?.version === 1 && Array.isArray(parsed.entries)) return parsed;
    } catch {}
    return { version: 1, entries: [] };
  }

  function saveCoachLearning(appKey, entry) {
    const store = readCoachLearning(appKey);
    const existing = store.entries.find(x => x.threadId === entry.threadId);
    if (existing) Object.assign(existing, entry);
    else store.entries.push(entry);
    store.entries = store.entries.sort((a, b) => String(a.learnedAt).localeCompare(String(b.learnedAt))).slice(-30);
    localStorage.setItem(coachLearningKey(appKey), JSON.stringify(store));
  }

  function learnCoachThread(threadId, button, popover) {
    const rec = activeAppRecord();
    if (!rec) return toast(isKo() ? '학습할 사용자 데이터가 없습니다.' : 'No user data to learn into.');

    const threadKey = `garang_coach_threads_v2::${rec.key}`;
    let store = null;
    try { store = JSON.parse(localStorage.getItem(threadKey) || 'null'); } catch {}
    const thread = store?.threads?.find(t => t.id === threadId);
    if (!thread || !Array.isArray(thread.messages) || !thread.messages.length) {
      return toast(isKo() ? '학습할 대화가 없습니다.' : 'There is no conversation to learn.');
    }

    const transcript = thread.messages.slice(-24).map(m => {
      const role = m.role === 'user' ? 'USER' : 'GARANG';
      return `${role}: ${String(m.text || '').trim()}`;
    }).filter(Boolean).join('\n').slice(0, 6500);
    const title = String(thread.title || 'Coach conversation').slice(0, 80);
    const learnedAt = now();

    /* Keep a dedicated learning store so ordinary app saves cannot accidentally erase a learned chat. */
    try {
      saveCoachLearning(rec.key, {
        threadId: thread.id,
        title,
        learnedAt,
        content: transcript
      });
    } catch (error) {
      console.warn('[GARANG] coach learning store failed', error);
      return toast(isKo() ? '학습 저장에 실패했습니다.' : 'Could not save learning.');
    }

    /* Mirror it into Memory as a user-confirmed high-importance insight. */
    const entries = ensureMemoryShape(rec.state);
    const memoryKey = `coach_thread:${thread.id}`;
    upsertMemory(entries, {
      type: 'coaching_insight', key: memoryKey,
      value: `[${title}]\n${transcript}`,
      source: 'coach_thread_learning', confidence: 1, importance: 5, userConfirmed: true
    });
    rec.state.actionLog.push({
      id: uid(), action: 'learn_coach_thread', targetId: thread.id,
      userConfirmed: true, sourceData: ['coach_thread'], at: learnedAt
    });
    rec.state.meta = rec.state.meta && typeof rec.state.meta === 'object' ? rec.state.meta : {};
    rec.state.meta.updatedAt = learnedAt;

    try { localStorage.setItem(rec.key, JSON.stringify(rec.state)); }
    catch (error) { console.warn('[GARANG] coach memory mirror failed', error); }

    button.textContent = isKo() ? '학습 완료 ✓' : 'Learned ✓';
    button.disabled = true;
    toast(isKo() ? '이 대화를 GARANG이 학습했습니다.' : 'GARANG learned from this conversation.');
    setTimeout(() => popover?.remove(), 500);
  }

  function injectCoachLearning(threadId) {
    const pop = document.querySelector('.g2-thread-popover');
    if (!pop || pop.querySelector('[data-act="learn"]')) return;
    const learn = document.createElement('button');
    learn.type = 'button';
    learn.dataset.act = 'learn';
    learn.className = 'g2-learn-thread';
    learn.textContent = isKo() ? '학습시키기' : 'Learn from chat';
    const danger = pop.querySelector('.danger');
    if (danger) pop.insertBefore(learn, danger); else pop.appendChild(learn);
    learn.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      learnCoachThread(threadId, learn, pop);
    });
  }

  function patchCoachFetch() {
    if (window.__garangCoachLearningFetchPatched) return;
    window.__garangCoachLearningFetchPatched = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      try {
        const endpoint = window.GARANG_SERVICES?.coachEndpoint;
        const requestUrl = typeof input === 'string' ? input : input?.url;
        const sameEndpoint = endpoint && requestUrl &&
          new URL(requestUrl, location.href).href === new URL(endpoint, location.href).href;
        if (sameEndpoint && typeof init?.body === 'string') {
          const payload = JSON.parse(init.body);
          const rec = activeAppRecord();
          const learned = rec ? readCoachLearning(rec.key).entries.slice(-6) : [];
          if (payload?.context && learned.length) {
            payload.context.learnedConversations = learned.map(x => ({
              threadId: x.threadId,
              title: x.title,
              learnedAt: x.learnedAt,
              content: x.content
            }));
            const existingMemory = Array.isArray(payload.context.memory) ? payload.context.memory : [];
            const learnedMemory = learned.map(x => ({
              type: 'coaching_insight',
              key: `coach_thread:${x.threadId}`,
              value: `[${x.title}]\n${x.content}`,
              source: 'coach_thread_learning',
              confidence: 1,
              importance: 5,
              userConfirmed: true,
              updatedAt: x.learnedAt
            }));
            payload.context.memory = [...existingMemory, ...learnedMemory].slice(-60);
            init = { ...init, body: JSON.stringify(payload) };
          }
        }
      } catch (error) {
        console.warn('[GARANG] learned Coach context injection skipped', error);
      }
      return nativeFetch(input, init);
    };
  }

  function run() {
    scheduled = false;
    polishHeadersAndModeling();
    hideRedundantRoutes();
    polishSetRecorder();
    clearTimeout(memoryTimer);
    memoryTimer = setTimeout(syncAutomaticMemory, 250);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  new MutationObserver(schedule).observe(main, { childList: true, subtree: true });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  document.addEventListener('click', event => {
    const threadMenu = event.target.closest('[data-thread-menu]');
    if (threadMenu) setTimeout(() => injectCoachLearning(threadMenu.dataset.threadMenu), 0);
    if (event.target.closest('[data-page],[data-pagego]')) setTimeout(schedule, 0);
  }, true);

  patchCoachFetch();
  setInterval(syncAutomaticMemory, 3000);
  schedule();
})();