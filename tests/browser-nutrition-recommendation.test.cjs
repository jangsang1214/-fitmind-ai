'use strict';
const {installAuthenticatedFirebaseMock}=require('./helpers/authenticated-browser-fixture.cjs');
const { startStaticServer } = require('./helpers/static-server.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { webkit } = require('playwright');

const root = path.resolve(__dirname, '..');
const serveRoot = path.join(root, 'dist');
const port = 8789;
const baseURL = `http://127.0.0.1:${port}`;
const pad = value => String(value).padStart(2, '0');
const localDate = () => { const date = new Date(); date.setHours(12, 0, 0, 0); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };
const state = () => ({
  meta: { schemaVersion: 5, updatedAt: new Date().toISOString() },
  profile: { name: 'Nutrition Recommendation', age: 29, height: 174, weight: 70, gender: 'male', goal: '근육 증가' },
  onboarding: { complete: true, skipped: false, goal: '근육 증가', experience: 'intermediate', weeklyFrequency: 4, availableMinutes: 60, preferences: '' },
  preferences: { language: 'ko', unit: 'metric' },
  planner: [], workouts: [], meals: [], runs: [], body: [], checkins: [], dailyCheckins: [], aiChat: [], actionLog: [], errors: [],
  analytics: { events: [] }, memory: { entries: [], facts: [], preferences: [], goals: [], events: [] }, plan: 'FREE'
});
async function waitForServer() { const deadline = Date.now() + 15000; while (Date.now() < deadline) { try { const response = await fetch(baseURL); if (response.ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 180)); } throw new Error('nutrition recommendation preview server did not start'); }
async function route(page, screen) { const ok = await page.evaluate(next => window.GarangRouter?.navigate?.(next, { source: 'nutrition-recommendation-browser', force: true }), screen); assert.equal(ok, true, `${screen} must remain reachable through the canonical Router`); await page.waitForFunction(expected => document.getElementById('main')?.dataset?.garangScreen === expected, screen, { timeout: 7000 }); }

(async () => {
  const server = startStaticServer(serveRoot, port);
  let browser;
  try {
    await waitForServer();
    browser = await webkit.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await installAuthenticatedFirebaseMock(context);
    await context.addInitScript(payload => { localStorage.setItem('garang_user_mock-user_v3', JSON.stringify(payload)); }, state());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error?.stack || error?.message || error)));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('appView') && !document.getElementById('appView').hidden, null, { timeout: 15000 });
    await route(page, 'nutrition');
    const surface = page.locator('[data-gnr-surface]');
    await surface.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(() => {
      const node = document.querySelector('[data-gnr-surface]');
      return !!node && /다음 끼니|단백질/.test(node.innerText || '') && !!node.querySelector('[data-gnr-add="0"]');
    }, null, { timeout: 8000 });
    assert.equal(await page.locator('[data-gnr-surface]').count(), 1, 'Nutrition must expose one recommendation surface');
    assert.equal(await page.locator('.nutrition-quick-summary').evaluate(el => el.tagName), 'DETAILS', 'technical macro dashboard must use progressive disclosure');
    assert.equal(await page.locator('.nutrition-quick-summary').getAttribute('open'), null, 'technical nutrition numbers must be collapsed by default');
    assert.match(await surface.innerText(), /다음 끼니|단백질/);
    assert.ok(await surface.locator('[data-gnr-add="0"]').count() === 1, 'the primary recommendation must be actionable');
    assert.doesNotMatch(await surface.innerText(), /Fiber|Na|약 \d+ kcal|P \d+g/, 'default next-meal guidance must hide technical nutrition numbers');
    await page.waitForFunction(() => window.GarangAgentStateBridge.getState()?.analytics?.events?.some(event => event.name === 'next_meal_recommendation_shown'), null, { timeout: 5000 });
    const shownEvidence = await page.evaluate(() => window.GarangAgentStateBridge.getState().analytics.events.find(event => event.name === 'next_meal_recommendation_shown'));
    assert.ok(shownEvidence?.props?.recommendationId,'shown recommendation must carry a stable lineage id');
    assert.doesNotMatch(shownEvidence.props.recommendationId,/112|protein/i,'analytics recommendation id must not encode nutrient measurements');
    await surface.locator('[data-gnr-dismiss]').click();
    await page.waitForFunction(() => document.querySelector('[data-gnr-reopen]') && window.GarangAgentStateBridge.getState()?.analytics?.events?.some(event => event.name === 'next_meal_recommendation_dismissed'), null, { timeout: 5000 });
    await page.locator('[data-gnr-reopen]').click();
    await page.waitForFunction(() => document.querySelector('[data-gnr-add="0"]'), null, { timeout: 5000 });
    const optionDetail=surface.locator('.gnr-primary-option .gnr-option-detail');assert.equal(await optionDetail.getAttribute('open'),null,'portion and nutrient detail must be collapsed by default');await optionDetail.locator('summary').click();assert.match(await optionDetail.innerText(),/kcal/,'technical option detail must remain available on demand');

    let before = await page.evaluate(() => window.GarangAgentStateBridge.getState());
    assert.equal(before.meals.length, 0, 'a recommendation must not auto-save a meal');
    await page.locator('[data-gnr-surface] [data-gnr-add="0"]').click();
    await page.waitForFunction(() => window.GarangAgentStateBridge.getState()?.analytics?.events?.some(event => event.name === 'next_meal_recommendation_accepted'), null, { timeout: 5000 });
    await page.locator('.manual-entry').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('#mealDraftArea')?.innerText.includes('닭가슴살'), null, { timeout: 5000 });
    before = await page.evaluate(() => window.GarangAgentStateBridge.getState());
    assert.equal(before.meals.length, 0, 'adding a recommendation must only create a draft');
    assert.ok(await page.locator('#saveMeal').isEnabled(), 'the existing meal save action must receive the draft');
    await page.locator('[data-edit-food="0"]').click();
    await page.waitForFunction(() => window.GarangAgentStateBridge.getState()?.analytics?.events?.some(event => event.name === 'next_meal_recommendation_modified'), null, { timeout: 5000 });
    await page.locator('#addFood').click();
    await page.waitForFunction(() => document.querySelector('#mealDraftArea')?.innerText.includes('닭가슴살'), null, { timeout: 5000 });
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert.ok(width.scroll <= width.client + 1, `Nutrition recommendation must not create horizontal overflow: ${JSON.stringify(width)}`);

    await page.locator('#saveMeal').click();
    await page.waitForFunction(() => window.GarangAgentStateBridge.getState()?.meals?.length === 1, null, { timeout: 7000 });
    const saved = await page.evaluate(() => window.GarangAgentStateBridge.getState());
    assert.ok(saved.meals[0].items.some(item => item.name === '닭가슴살'), 'saved meal must contain the recommended item');
    assert.equal(saved.meals[0].recommendationContexts?.[0]?.source, 'next_meal', 'saved meal must retain recommendation origin');
    assert.equal(saved.meals[0].recommendationContexts?.[0]?.optionId, 'protein-rice', 'saved meal must retain the selected recommendation option');
    assert.equal(saved.meals[0].recommendationContexts?.[0]?.proteinTarget, 112, 'saved recommendation must retain its protein target snapshot');
    assert.equal(saved.meals[0].recommendationContexts?.[0]?.proteinActualBefore, 0, 'saved recommendation must retain pre-choice protein state');
    assert.equal(saved.meals[0].recommendationContexts?.[0]?.proteinRemainingBefore, 112, 'saved recommendation must retain pre-choice remaining protein');
    assert.ok(saved.meals[0].items.some(item => item.recommendationContext?.recommendationId === saved.meals[0].recommendationContexts?.[0]?.recommendationId), 'recommended items must retain the same recommendation lineage');
    const evidenceNames=saved.analytics.events.map(event=>event.name);
    assert.ok(evidenceNames.includes('next_meal_recorded'),'saving the next meal must close recommendation outcome evidence');
    const accepted=saved.analytics.events.find(event=>event.name==='next_meal_recommendation_accepted'),recorded=saved.analytics.events.find(event=>event.name==='next_meal_recorded');
    assert.equal(accepted.props.recommendationId,recorded.props.recommendationId,'accepted and recorded evidence must retain one recommendation lineage');
    await page.waitForFunction(() => /최근 추천 선택 1회 저장/.test(document.querySelector('[data-gnr-follow-through]')?.textContent || ''), null, { timeout: 7000 });
    const learningDetail=page.locator('.gnr-learning-detail');assert.equal(await learningDetail.getAttribute('open'),null,'recommendation history must stay collapsed by default');await learningDetail.locator('summary').click();assert.match(await page.locator('[data-gnr-follow-through]').innerText(), /최근 추천 선택 1회 저장/);
    const review = page.locator('[data-gnr-review="1"]');
    await review.waitFor({ state: 'visible', timeout: 7000 });
    assert.match(await review.innerText(), /식사 잘 기록했어요/, 'post-meal review must lead with beginner language');
    await page.waitForFunction(() => window.GarangAgentStateBridge.getState()?.analytics?.events?.some(event => event.name === 'meal_review_viewed'), null, { timeout: 5000 });
    assert.match(await review.innerText(), /단백질/);
    const detail = review.locator('.gnr-review-detail');
    assert.equal(await detail.count(), 1, 'numeric meal detail must remain available');
    assert.equal(await detail.getAttribute('open'), null, 'numeric meal detail must stay collapsed by default');
    await detail.locator('summary').click();
    assert.match(await detail.innerText(), /kcal/);
    assert.match(await detail.innerText(), /단백질/);
    assert.deepEqual(errors, [], `Nutrition recommendation browser errors:\n${errors.join('\n')}`);
    await context.close();
    console.log('browser-nutrition-recommendation WebKit mobile: PASS');
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill('SIGTERM');
  }
})().catch(error => { console.error(error); process.exit(1); });
