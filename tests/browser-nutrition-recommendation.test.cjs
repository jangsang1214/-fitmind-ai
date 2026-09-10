'use strict';
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
    await context.addInitScript(payload => { localStorage.setItem('garang_demo', '1'); localStorage.setItem('garang_demo_state_v3', JSON.stringify(payload)); }, state());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error?.stack || error?.message || error)));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('appView') && !document.getElementById('appView').hidden, null, { timeout: 15000 });
    await route(page, 'nutrition');
    const surface = page.locator('[data-gnr-surface]');
    await surface.waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await page.locator('[data-gnr-surface]').count(), 1, 'Nutrition must expose one recommendation surface');
    assert.match(await surface.innerText(), /근육 증가/);
    assert.ok(await surface.locator('[data-gnr-add="0"]').count() === 1, 'the primary recommendation must be actionable');

    let before = await page.evaluate(() => window.GarangAgentStateBridge.getState());
    assert.equal(before.meals.length, 0, 'a recommendation must not auto-save a meal');
    await surface.locator('[data-gnr-add="0"]').click();
    await page.locator('.manual-entry').waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => document.querySelector('#mealDraftArea')?.innerText.includes('닭가슴살'), null, { timeout: 5000 });
    before = await page.evaluate(() => window.GarangAgentStateBridge.getState());
    assert.equal(before.meals.length, 0, 'adding a recommendation must only create a draft');
    assert.ok(await page.locator('#saveMeal').isEnabled(), 'the existing meal save action must receive the draft');
    const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    assert.ok(width.scroll <= width.client + 1, `Nutrition recommendation must not create horizontal overflow: ${JSON.stringify(width)}`);

    await page.locator('#saveMeal').click();
    await page.waitForFunction(() => window.GarangAgentStateBridge.getState()?.meals?.length === 1, null, { timeout: 7000 });
    const saved = await page.evaluate(() => window.GarangAgentStateBridge.getState());
    assert.ok(saved.meals[0].items.some(item => item.name === '닭가슴살'), 'saved meal must contain the recommended item');
    assert.deepEqual(errors, [], `Nutrition recommendation browser errors:\n${errors.join('\n')}`);
    await context.close();
    console.log('browser-nutrition-recommendation WebKit mobile: PASS');
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill('SIGTERM');
  }
})().catch(error => { console.error(error); process.exit(1); });
