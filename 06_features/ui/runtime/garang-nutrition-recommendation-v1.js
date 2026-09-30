/* GARANG Nutrition Recommendation Surface v1
   Keeps recommendation read-only until the user explicitly adds a choice to
   the existing Nutrition draft. The app CRUD remains the save owner.
*/
(() => {
  'use strict';

  const main = document.getElementById('main');
  const Core = window.GarangNutritionRecommendation;
  if (!main || !Core) return;

  const VERSION = 'garang-nutrition-recommendation-surface-v1.4.0-beginner-next-meal';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const ko = () => document.documentElement.lang !== 'en';
  const state = () => { try { return window.GarangAgentStateBridge?.ready?.() ? window.GarangAgentStateBridge.getState() : null; } catch { return null; } };
  const raf = callback => typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame(callback) : window.setTimeout(callback, 0);
  let foodPromise = null;
  let scheduled = false;
  const dismissedRecommendationIds = new Set();

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

  function recommendationEvidence(model, option, index = 0) {
    if (!model || !option) return null;
    const recommendationVersion = String(model.version || Core.VERSION || 'nutrition-v1');
    const recommendationDate = String(model.date || currentDate()).slice(0, 10);
    const optionId = String(option.id || index);
    const direction = String(model.direction?.code || 'balanced');
    const mealOrdinal = Math.max(0, Number(model.actual?.meals) || 0);
    const recommendationId = [recommendationDate, optionId, recommendationVersion, `m${mealOrdinal}`, direction].join(':');
    const proteinTarget = Number.isFinite(Number(model.target?.proteinTarget)) ? Number(model.target.proteinTarget) : null;
    const proteinActualBefore = Number.isFinite(Number(model.actual?.protein)) ? Number(model.actual.protein) : null;
    const proteinRemainingBefore = Number.isFinite(Number(model.remaining?.protein)) ? Number(model.remaining.protein) : null;
    return {
      analytics:{recommendationId,optionId,direction,source:'nutrition'},
      context:{recommendationId,source:'next_meal',version:recommendationVersion,date:recommendationDate,optionId,goal:model.goal || '',basis:model.recommendationBasis || 'goal_and_food_db',proteinTarget,proteinActualBefore,proteinRemainingBefore}
    };
  }

  function recordEvidence(name, props, once = true) {
    try { return window.GarangNutritionEvidenceBridge?.record?.(name, props, once) === true; } catch { return false; }
  }

  function optionMarkup(option, index, language) {
    const label = language === 'en' ? `Option ${index + 1}` : `선택 ${index + 1}`;
    const names = option.items.map(item => esc(item.name)).join(' · ');
    const portions = option.items.map(item => `${esc(item.name)} ${Math.round(item.grams)}g`).join(' · ');
    const secondary = [Number.isFinite(Number(option.estimated?.fiber)) ? `Fiber ${Math.round(Number(option.estimated.fiber) * 10) / 10}g` : '', Number.isFinite(Number(option.estimated?.sodium)) ? `Na ${Math.round(Number(option.estimated.sodium))}mg` : ''].filter(Boolean).join(' · ');
    const nutrition = `약 ${Math.round(option.estimated.kcal)} kcal · P ${Math.round(option.estimated.protein)}g${secondary ? ` · ${secondary}` : ''}`;
    const detailLabel = language === 'en' ? 'View portions and nutrition' : '양·영양정보 보기';
    return `<article class="gnr-option" data-gnr-option="${index}"><div class="gnr-option-index">${String(index + 1).padStart(2, '0')}</div><div class="gnr-option-copy"><span>${label}</span><strong>${esc(option.title)}</strong><p>${esc(option.summary)}</p><small class="gnr-option-foods">${names}</small><details class="gnr-option-detail"><summary>${detailLabel}</summary><div><small>${portions}</small><small>${nutrition}</small></div></details></div><button type="button" class="gnr-add" data-gnr-add="${index}">${language === 'en' ? 'Use this meal' : '이 추천 담기'}</button></article>`;
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
    const direction = model.direction || {};
    const follow = model.followThrough || {};
    const followLine = Number(follow.sampleSize) > 0
      ? (language === 'en'
        ? `Recent saved recommendations ${follow.sampleSize}`
        : `최근 추천 선택 ${follow.sampleSize}회 저장`)
      : '';
    const reviewHtml = reviewMarkup(review, language);
    if (model.status !== 'ready') {
      return `<section class="gnr-surface" data-gnr-surface="1" data-gnr-version="${VERSION}">${reviewHtml}<div class="gnr-head"><div><span class="gnr-eyebrow">GARANG / NEXT MEAL</span><h2>${esc(direction.headline || (language === 'en' ? 'One more signal will improve the next meal.' : '다음 한 끼는 기준 하나면 충분합니다.'))}</h2><p>${esc(model.message || direction.reason || '')}</p></div></div><small class="gnr-footnote">${language === 'en' ? 'Saved records only · no automatic save' : '저장된 기록 기준 · 자동 저장하지 않음'}</small></section>`;
    }
    const alternatives = model.options.slice(1).map((option, index) => optionMarkup(option, index + 1, language)).join('');
    const learning = followLine ? `<details class="gnr-learning-detail"><summary>${language === 'en' ? 'Recent recommendation history' : '최근 추천 반영 보기'}</summary><small data-gnr-follow-through="1">${esc(followLine)}</small></details>` : '';
    const primaryEvidence = recommendationEvidence(model, model.options[0], 0);
    if (primaryEvidence && dismissedRecommendationIds.has(primaryEvidence.analytics.recommendationId)) {
      return `<section class="gnr-surface" data-gnr-surface="1" data-gnr-version="${VERSION}">${reviewHtml}<div class="gnr-dismissed"><span class="gnr-eyebrow">GARANG / NEXT MEAL</span><p>${language === 'en' ? 'Recommendation hidden for now.' : '이번 추천은 잠시 숨겼어요.'}</p><button type="button" class="gnr-reopen" data-gnr-reopen="${esc(primaryEvidence.analytics.recommendationId)}">${language === 'en' ? 'Show again' : '다시 보기'}</button></div></section>`;
    }
    return `<section class="gnr-surface" data-gnr-surface="1" data-gnr-version="${VERSION}">${reviewHtml}<div class="gnr-head"><div><span class="gnr-eyebrow">GARANG / NEXT MEAL</span><h2>${esc(direction.headline || (language === 'en' ? 'Keep the next meal simple.' : '다음 끼니는 간단하게 이어가면 돼요.'))}</h2><p>${esc(direction.reason || '')}</p></div><button type="button" class="gnr-refresh" data-gnr-refresh aria-label="${language === 'en' ? 'Refresh recommendation' : '추천 다시 계산'}">↻</button></div><div class="gnr-primary-option">${optionMarkup(model.options[0], 0, language)}</div>${alternatives ? `<details class="gnr-alternatives"><summary>${language === 'en' ? 'Other options' : '다른 선택 보기'}</summary><div>${alternatives}</div></details>` : ''}<button type="button" class="gnr-dismiss" data-gnr-dismiss>${language === 'en' ? 'Skip for now' : '오늘은 건너뛰기'}</button>${learning}<small class="gnr-footnote">${language === 'en' ? 'Food DB based · review or edit before saving' : 'Food DB 기준 · 저장 전에 언제든 수정할 수 있어요'}</small></section>`;
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
    if (review?.status === 'ready' && review?.meal?.id) recordEvidence('meal_review_viewed',{mealId:review.meal.id,proteinState:review.proteinState || 'unknown',source:'nutrition'},true);
    if (model?.status === 'ready' && model.options?.[0]) {
      const evidence = recommendationEvidence(model, model.options[0], 0);
      if (evidence && !dismissedRecommendationIds.has(evidence.analytics.recommendationId)) recordEvidence('next_meal_recommendation_shown',evidence.analytics,true);
    }
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
    const reopen = event.target.closest?.('[data-gnr-reopen]');
    if (reopen) {
      event.preventDefault();
      dismissedRecommendationIds.delete(String(reopen.dataset.gnrReopen || ''));
      schedule();
      return;
    }
    const dismiss = event.target.closest?.('[data-gnr-dismiss]');
    if (dismiss) {
      const surface = dismiss.closest('[data-gnr-surface]');
      const model = surface?._garangNutritionModel;
      const option = model?.options?.[0];
      const evidence = recommendationEvidence(model, option, 0);
      if (!evidence) return;
      event.preventDefault();
      dismissedRecommendationIds.add(evidence.analytics.recommendationId);
      recordEvidence('next_meal_recommendation_dismissed', evidence.analytics, true);
      schedule();
      return;
    }
    const add = event.target.closest?.('[data-gnr-add]');
    if (add) {
      const surface = add.closest('[data-gnr-surface]');
      const model = surface?._garangNutritionModel;
      const index = Number(add.dataset.gnrAdd);
      const option = model?.options?.[index];
      const evidence = recommendationEvidence(model, option, index);
      if (!option || !evidence) return;
      event.preventDefault();
      const result = window.GarangNutritionDraftBridge?.add?.(option.items.map(item => ({ ...item, recommendationContext:evidence.context })));
      if (!result?.ok) {
        add.textContent = ko() ? '초안에 담지 못했습니다' : 'Could not add';
        return;
      }
      recordEvidence('next_meal_recommendation_accepted', evidence.analytics, true);
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


/* GARANG Beginner Meal Reminder Visibility v1 */
(() => {
  'use strict';
  if (window.GarangMealReminderNotificationV1) return;
  const VERSION='garang-meal-reminder-notification-v1.0.0';
  const NOTICE_ID='garangMealReminderNotification';
  const STYLE_ID='garangMealReminderNotificationStyle';
  const SETTINGS_ID='garangMealScheduleShortcut';
  let timer=null;
  const label={breakfast:{ko:'아침',en:'Breakfast'},lunch:{ko:'점심',en:'Lunch'},dinner:{ko:'저녁',en:'Dinner'}};
  const ko=()=>document.documentElement.lang!=='en';
  const bridge=()=>window.GarangMealReminderBridge||null;
  const key=candidate=>candidate?[candidate.localDate||'',candidate.mealType||''].join(':'):'';
  function isDismissed(candidate){try{return !!key(candidate)&&sessionStorage.getItem('garang_meal_reminder_later_v1')===key(candidate);}catch{return false;}}
  function dismiss(candidate){try{if(key(candidate))sessionStorage.setItem('garang_meal_reminder_later_v1',key(candidate));}catch{}document.getElementById(NOTICE_ID)?.remove();}
  function ensureStyle(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');style.id=STYLE_ID;
    style.textContent='#'+NOTICE_ID+'{position:fixed;z-index:260;top:calc(env(safe-area-inset-top,0px) + 66px);left:12px;right:12px;max-width:430px;margin:0 auto;padding:12px 13px;border-radius:18px;background:rgba(18,20,19,.96);color:#f7f7f4;box-shadow:0 12px 32px rgba(0,0,0,.22);backdrop-filter:blur(18px);display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center}#'+NOTICE_ID+' .gmr-copy{min-width:0;display:grid;gap:2px}#'+NOTICE_ID+' .gmr-copy small{font-size:10px;letter-spacing:.12em;opacity:.62}#'+NOTICE_ID+' .gmr-copy strong{font-size:14px;line-height:1.35}#'+NOTICE_ID+' .gmr-actions{display:flex;align-items:center;gap:6px}#'+NOTICE_ID+' button{min-height:40px;border-radius:12px;padding:0 11px;border:0;font:inherit;font-weight:700;cursor:pointer}#'+NOTICE_ID+' [data-gmr-open]{background:#f4f4ef;color:#151715}#'+NOTICE_ID+' [data-gmr-later]{background:transparent;color:inherit;opacity:.7;padding:0 7px}#'+SETTINGS_ID+'{margin:0 0 12px;padding:12px 14px;border:1px solid rgba(128,128,128,.18);border-radius:16px;display:flex;align-items:center;justify-content:space-between;gap:12px}#'+SETTINGS_ID+' .gmr-settings-copy{display:grid;gap:2px}#'+SETTINGS_ID+' .gmr-settings-copy strong{font-size:14px}#'+SETTINGS_ID+' .gmr-settings-copy small{opacity:.62}#'+SETTINGS_ID+' button{min-height:42px;white-space:nowrap}';
    document.head.appendChild(style);
  }
  function mountSettings(){
    const main=document.getElementById('main');
    if(!main||main.dataset.garangScreen!=='nutrition'){document.getElementById(SETTINGS_ID)?.remove();return;}
    if(document.getElementById(SETTINGS_ID))return;
    const anchor=main.querySelector('.meal-scan-card')||main.querySelector('[data-gnr-surface]')||main.firstElementChild;if(!anchor)return;
    const section=document.createElement('section');section.id=SETTINGS_ID;section.dataset.gmrSettingsShortcut='1';
    const isKo=ko();section.innerHTML='<span class="gmr-settings-copy"><strong>'+(isKo?'식사 시간 알림':'Meal time reminders')+'</strong><small>'+(isKo?'아침·점심·저녁 시간을 설정하세요':'Set breakfast, lunch and dinner times')+'</small></span><button type="button" class="ghost small" data-gmr-settings>'+(isKo?'시간 설정':'Set times')+'</button>';
    section.querySelector('[data-gmr-settings]')?.addEventListener('click',event=>{event.preventDefault();if(window.GarangRouter?.navigate?.('settings',{source:'meal-reminder-settings',force:true})===true)return;document.getElementById('settingsTopBtn')?.click();});
    anchor.insertAdjacentElement('beforebegin',section);
  }
  function mountNotice(){
    const b=bridge(),candidate=b?.current?.()||null;
    if(!candidate||isDismissed(candidate)||document.visibilityState==='hidden'){document.getElementById(NOTICE_ID)?.remove();return;}
    b?.markShown?.(candidate);
    if(document.getElementById(NOTICE_ID)?.dataset.key===key(candidate))return;
    document.getElementById(NOTICE_ID)?.remove();
    const isKo=ko(),meal=label[candidate.mealType]?.[isKo?'ko':'en']||(isKo?'식사':'Meal');
    const notice=document.createElement('aside');notice.id=NOTICE_ID;notice.dataset.key=key(candidate);notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
    notice.innerHTML='<span class="gmr-copy"><small>GARANG / '+(isKo?'식사 알림':'MEAL REMINDER')+'</small><strong>'+(isKo?meal+' 드실 시간이에요. 먹은 거 보여주세요.':'It is time for '+meal.toLowerCase()+'. Show GARANG what you eat.')+'</strong></span><span class="gmr-actions"><button type="button" data-gmr-later>'+(isKo?'나중에':'Later')+'</button><button type="button" data-gmr-open>'+(isKo?'사진 찍기':'Scan meal')+'</button></span>';
    notice.querySelector('[data-gmr-later]')?.addEventListener('click',()=>dismiss(candidate));
    notice.querySelector('[data-gmr-open]')?.addEventListener('click',event=>{event.preventDefault();if(b?.open?.(candidate)===true)notice.remove();});
    document.body.appendChild(notice);
  }
  function refresh(){ensureStyle();mountSettings();mountNotice();clearTimeout(timer);timer=setTimeout(refresh,60000);}
  for(const eventName of ['garang:screen-rendered','garang:state-updated','garang:state-hydrated','garang:route-completed','garang:cloud-state-ready'])window.addEventListener(eventName,refresh);
  document.addEventListener('visibilitychange',refresh);document.documentElement.addEventListener('garang:language-changed',refresh);
  window.GarangMealReminderNotificationV1=Object.freeze({version:VERSION,refresh});
  refresh();
})();
