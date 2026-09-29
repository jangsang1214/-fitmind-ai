/* GARANG Nutrition Recommendation Surface v1
   Keeps recommendation read-only until the user explicitly adds a choice to
   the existing Nutrition draft. The app CRUD remains the save owner.
*/
(() => {
  'use strict';

  const main = document.getElementById('main');
  const Core = window.GarangNutritionRecommendation;
  if (!main || !Core) return;

  const VERSION = 'garang-nutrition-recommendation-surface-v1.3.0-beginner-review';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const ko = () => document.documentElement.lang !== 'en';
  const state = () => { try { return window.GarangAgentStateBridge?.ready?.() ? window.GarangAgentStateBridge.getState() : null; } catch { return null; } };
  const raf = callback => typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame(callback) : window.setTimeout(callback, 0);
  let foodPromise = null;
  let scheduled = false;

  function currentDate() {
    return Core.localDate();
  }

  function loadFoods() {
    if (!foodPromise) {
      foodPromise = fetch('./04_data/knowledge/food-db.json', { cache: 'no-store' })
        .then(response => { if (!response.ok) throw new Error(`food-db ${response.status}`); return response.json(); })
        .then(value => Array.isArray(value) ? value : [])
        .catch(error => { console.warn('[GARANG] nutrition recommendation DB load failed', error); return []; });
    }
    return foodPromise;
  }

  function removeSurface() {
    main.querySelector('[data-gnr-surface]')?.remove();
  }

  function optionMarkup(option, index, language) {
    const label = language === 'en' ? `Option ${index + 1}` : `선택 ${index + 1}`;
    const items = option.items.map(item => `${esc(item.name)} ${Math.round(item.grams)}g`).join(' · ');
    const secondary = [Number.isFinite(Number(option.estimated?.fiber)) ? `Fiber ${Math.round(Number(option.estimated.fiber) * 10) / 10}g` : '', Number.isFinite(Number(option.estimated?.sodium)) ? `Na ${Math.round(Number(option.estimated.sodium))}mg` : ''].filter(Boolean).join(' · ');
    const nutrition = `약 ${Math.round(option.estimated.kcal)} kcal · P ${Math.round(option.estimated.protein)}g${secondary ? ` · ${secondary}` : ''}`;
    return `<article class="gnr-option" data-gnr-option="${index}"><div class="gnr-option-index">${String(index + 1).padStart(2, '0')}</div><div class="gnr-option-copy"><span>${label}</span><strong>${esc(option.title)}</strong><p>${esc(option.summary)}</p><small>${items}</small><small>${nutrition}</small></div><button type="button" class="gnr-add" data-gnr-add="${index}">${language === 'en' ? 'Add to draft' : '초안에 담기'}</button></article>`;
  }

  function reviewMarkup(review, language) {
    if (!review || review.status !== 'ready') return '';
    const koLang = language !== 'en';
    const headline = review.proteinState === 'enough'
      ? (koLang ? '식사 잘 기록했어요. 단백질은 충분해요.' : 'Meal saved. You have enough protein logged today.')
      : review.proteinState === 'more'
        ? (koLang ? '식사 잘 기록했어요. 단백질을 조금 더 먹으면 좋아요.' : 'Meal saved. A little more protein would help today.')
        : (koLang ? '식사 잘 기록했어요. 다음 한 끼는 평소처럼 균형 있게 드세요.' : 'Meal saved. Keep the next meal simple and balanced.');
    const next = review.proteinState === 'more'
      ? (koLang ? '다음 끼니는 단백질을 먼저 챙겨보세요.' : 'Make protein the first priority in the next meal.')
      : (koLang ? '다음 끼니도 무리 없이 균형을 이어가면 돼요.' : 'Keep the next meal balanced without overthinking it.');
    const rows = [
      ['kcal', 'kcal', review.details?.kcal],
      ['protein', koLang ? '단백질' : 'Protein', review.details?.protein, 'g'],
      ['carbs', koLang ? '탄수화물' : 'Carbs', review.details?.carbs, 'g'],
      ['fat', koLang ? '지방' : 'Fat', review.details?.fat, 'g'],
      ['fiber', koLang ? '식이섬유' : 'Fiber', review.details?.fiber, 'g'],
      ['sodium', koLang ? '나트륨' : 'Sodium', review.details?.sodium, 'mg']
    ].filter(row => Number.isFinite(Number(row[2])));
    const detail = rows.map(row => `<span><b>${esc(row[1])}</b><em>${Math.round(Number(row[2]) * 10) / 10}${row[3] || ''}</em></span>`).join('');
    return `<div class="gnr-review" data-gnr-review="1" data-protein-state="${esc(review.proteinState)}"><span class="gnr-eyebrow">GARANG / MEAL REVIEW</span><h2>${esc(headline)}</h2><p>${esc(next)}</p><div class="gnr-review-status"><span><b>${koLang ? '단백질' : 'Protein'}</b><em>${review.proteinState === 'enough' ? (koLang ? '충분' : 'Enough') : review.proteinState === 'more' ? (koLang ? '조금 더' : 'A little more') : (koLang ? '기록 확인 중' : 'Building signal')}</em></span></div>${detail ? `<details class="gnr-review-detail"><summary>${koLang ? '자세히 보기' : 'View details'}</summary><div>${detail}</div></details>` : ''}</div>`;
  }

  function surfaceMarkup(model, review) {
    const language = model.goalLabel && !ko() ? 'en' : 'ko';
    const target = model.target?.proteinTarget;
    const actual = Math.round(model.actual?.protein || 0);
    const targetLine = target ? (language === 'en' ? `Saved protein ${actual}g / ${target}g` : `저장된 단백질 ${actual}g / 목표 ${target}g`) : (language === 'en' ? 'Add a body-weight target to make this precise.' : '체중을 입력하면 목표 기준을 더 정확히 맞출 수 있습니다.');
    const follow = model.followThrough || {};
    const followLine = Number(follow.sampleSize) > 0
      ? (language === 'en'
        ? `Recent recommendation saves ${follow.sampleSize} · ${follow.inProgress ? `${follow.inProgress} still in progress` : `${follow.targetReached} same-day protein targets reached`}`
        : `최근 추천 선택 ${follow.sampleSize}회 저장 · ${follow.inProgress ? `${follow.inProgress}회 결과 기록 중` : `같은 날 저장 단백질 목표 도달 ${follow.targetReached}회`}`)
      : '';
    const reviewHtml = reviewMarkup(review, language);
    if (model.status !== 'ready') {
      return `<section class="gnr-surface" data-gnr-surface="1" data-gnr-version="${VERSION}">${reviewHtml}<div class="gnr-head"><div><span class="gnr-eyebrow">GARANG / NEXT MEAL</span><h2>${language === 'en' ? 'The next meal needs one clear signal.' : '다음 한 끼는 기준 하나면 충분합니다.'}</h2><p>${esc(model.message || '')}</p></div></div><small class="gnr-footnote">${language === 'en' ? 'Saved records only · no automatic save' : '저장된 기록 기준 · 자동 저장하지 않음'}</small></section>`;
    }
    const alternatives = model.options.slice(1).map((option, index) => optionMarkup(option, index + 1, language)).join('');
    return `<section class="gnr-surface" data-gnr-surface="1" data-gnr-version="${VERSION}">${reviewHtml}<div class="gnr-head"><div><span class="gnr-eyebrow">GARANG / NEXT MEAL</span><h2>${language === 'en' ? 'One useful next meal' : '다음 한 끼를 정하세요'}</h2><p>${esc(model.goalLabel)} · ${targetLine}</p>${followLine ? `<small class="gnr-footnote" data-gnr-follow-through="1">${esc(followLine)}</small>` : ''}</div><button type="button" class="gnr-refresh" data-gnr-refresh aria-label="${language === 'en' ? 'Refresh recommendation' : '추천 다시 계산'}">↻</button></div><div class="gnr-primary-option">${optionMarkup(model.options[0], 0, language)}</div>${alternatives ? `<details class="gnr-alternatives"><summary>${language === 'en' ? 'Other options' : '다른 선택 보기'}</summary><div>${alternatives}</div></details>` : ''}<small class="gnr-footnote">${language === 'en' ? 'Food DB reference values · secondary nutrients appear only when source data exists · add to draft before saving' : 'Food DB 참고치 · 보조 영양소는 출처 값이 있을 때만 표시 · 저장 전 식단 초안에 담습니다'}</small></section>`;
  }
  function mount(model, review) {
    if (main.dataset.garangScreen !== 'nutrition') return;
    removeSurface();
    const hero = main.querySelector('.nutrition-visual-hero')
      || main.querySelector('.nutrition-quick-summary')
      || main.querySelector('.meal-scan-card');
    if (!hero) return;
    const surface = document.createElement('div');
    surface.innerHTML = surfaceMarkup(model || { status: 'loading', message: ko() ? '저장된 기록을 기준으로 다음 한 끼를 계산하고 있습니다.' : 'Calculating the next meal from saved records.' }, review);
    const node = surface.firstElementChild;
    if (!node) return;
    node._garangNutritionModel = model || null;
    hero.insertAdjacentElement('afterend', node);
  }

  async function refresh() {
    if (main.dataset.garangScreen !== 'nutrition') return;
    const snapshot = state();
    if (!snapshot) return;
    const review = Core.reviewLatestMeal?.(snapshot, { date: currentDate() }) || null;
    mount(null, review);
    const foods = await loadFoods();
    if (main.dataset.garangScreen !== 'nutrition') return;
    mount(Core.recommend(snapshot, foods, { date: currentDate(), language: ko() ? 'ko' : 'en' }), review);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    raf(() => raf(() => { scheduled = false; refresh(); }));
  }

  document.addEventListener('click', event => {
    const add = event.target.closest?.('[data-gnr-add]');
    if (add) {
      const surface = add.closest('[data-gnr-surface]');
      const model = surface?._garangNutritionModel;
      const option = model?.options?.[Number(add.dataset.gnrAdd)];
      if (!option) return;
      event.preventDefault();
      const proteinTarget = Number.isFinite(Number(model.target?.proteinTarget)) ? Number(model.target.proteinTarget) : null, proteinActualBefore = Number.isFinite(Number(model.actual?.protein)) ? Number(model.actual.protein) : null, proteinRemainingBefore = Number.isFinite(Number(model.remaining?.protein)) ? Number(model.remaining.protein) : null, recommendationVersion = model.version || Core.VERSION || 'nutrition-v1', recommendationDate = model.date || currentDate(), optionId = option.id || String(Number(add.dataset.gnrAdd)), recommendationId = [recommendationDate, optionId, recommendationVersion, proteinTarget ?? 'na', proteinActualBefore ?? 'na', proteinRemainingBefore ?? 'na'].join(':');
      const recommendationContext = { recommendationId, source: 'next_meal', version: recommendationVersion, date: recommendationDate, optionId, goal: model.goal || '', basis: model.recommendationBasis || 'goal_and_food_db', proteinTarget, proteinActualBefore, proteinRemainingBefore };
      const result = window.GarangNutritionDraftBridge?.add?.(option.items.map(item => ({ ...item, recommendationContext })));
      if (!result?.ok) {
        add.textContent = ko() ? '초안에 담지 못했습니다' : 'Could not add';
        return;
      }
      add.disabled = true;
      add.textContent = ko() ? '초안에 담김' : 'Added to draft';
      raf(() => document.querySelector('.manual-entry')?.setAttribute('open', ''));
      return;
    }
    if (event.target.closest?.('[data-gnr-refresh]')) {
      event.preventDefault();
      schedule();
    }
  }, true);

  for (const eventName of ['garang:screen-rendered', 'garang:state-updated', 'garang:state-hydrated', 'garang:route-completed', 'garang:goal-alignment-ready']) window.addEventListener(eventName, schedule);
  document.documentElement.addEventListener('garang:language-changed', schedule);
  window.GarangNutritionRecommendationSurface = Object.freeze({ version: VERSION, refresh: schedule });
  schedule();
})();
