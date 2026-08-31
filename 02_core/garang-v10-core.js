/* GARANG V10 Core — unified product contract for the static V10.7 baseline.
 * This file is intentionally dependency-free so GitHub Pages can load it.
 * A future backend/LLM can consume the same snapshot without changing the UI model.
 */
(() => {
  'use strict';
  const VERSION = '10.8-core';
  const keys = ['profile','workouts','meals','runs','body','planner','memory','plan','language','settings','aiChats'];
  function snapshot(state) {
    const out = {};
    for (const k of keys) out[k] = state?.[k] ?? null;
    return {version: VERSION, generatedAt: new Date().toISOString(), ...out};
  }
  function validate(s) {
    return {ok: !!s && typeof s === 'object', missing: keys.filter(k => !(k in (s || {})))};
  }
  window.GARANG_V10_CORE = {VERSION, keys, snapshot, validate};
})();
