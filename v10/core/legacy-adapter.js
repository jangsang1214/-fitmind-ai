/**
 * GARANG V10 — Legacy Compatibility Adapter
 *
 * Purpose:
 * Connect the existing V9.x state shape to the V10 Core interfaces
 * WITHOUT changing the existing UI or replacing the legacy app.
 *
 * The adapter is intentionally dependency-free. The host app injects
 * read/write functions so this file does not assume Firebase or localStorage.
 */

const asArray = (v) => Array.isArray(v) ? v : [];
const n = (v, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};

export function createLegacyDataAdapter({ getState }) {
  if (typeof getState !== "function") {
    throw new Error("createLegacyDataAdapter requires getState()");
  }

  const snapshot = () => {
    const s = getState() || {};
    return {
      profile: s.profile ?? null,
      workouts: asArray(s.workouts),
      meals: asArray(s.meals),
      runs: asArray(s.runs),
      body: asArray(s.body),
      plan: s.plan === "PRO" ? "PRO" : "FREE",
    };
  };

  const withinDays = (items, days = 14) => {
    const cutoff = Date.now() - Math.max(0, days) * 86400000;
    return items.filter(x => {
      const t = Date.parse(x?.date || x?.createdAt || "");
      return !Number.isFinite(t) || t >= cutoff;
    });
  };

  return {
    async getUserState(userId) {
      if (!userId) throw new Error("userId is required");
      const s = snapshot();
      return {
        userId,
        profile: s.profile,
        plan: s.plan,
        counts: {
          workouts: s.workouts.length,
          meals: s.meals.length,
          runs: s.runs.length,
          body: s.body.length,
        },
        latestBody: s.body.at(-1) ?? null,
      };
    },

    async getRecentContext(userId, options = {}) {
      if (!userId) throw new Error("userId is required");
      const s = snapshot();
      const days = n(options.days, 14);
      return {
        workouts: withinDays(s.workouts, days).slice(-50),
        meals: withinDays(s.meals, days).slice(-50),
        runs: withinDays(s.runs, days).slice(-50),
        body: withinDays(s.body, days).slice(-50),
      };
    },

    async getWorkoutHistory(userId, options = {}) {
      return withinDays(snapshot().workouts, n(options.days, 90)).slice(-200);
    },

    async getNutritionHistory(userId, options = {}) {
      return withinDays(snapshot().meals, n(options.days, 90)).slice(-200);
    },

    async getRunningHistory(userId, options = {}) {
      return withinDays(snapshot().runs, n(options.days, 90)).slice(-200);
    },

    async getBodyMetrics(userId, options = {}) {
      return withinDays(snapshot().body, n(options.days, 365)).slice(-200);
    },
  };
}

export function createLegacyMemoryAdapter({ getState, saveState }) {
  if (typeof getState !== "function") {
    throw new Error("createLegacyMemoryAdapter requires getState()");
  }

  const ensure = () => {
    const s = getState() || {};
    s.memory ??= {};
    for (const key of ["facts", "preferences", "goals", "events", "shortTerm"]) {
      s.memory[key] = Array.isArray(s.memory[key]) ? s.memory[key] : [];
    }
    return s;
  };

  const textOf = (m) =>
    String(m?.content ?? m?.text ?? m?.value ?? "").toLowerCase();

  return {
    async search({ userId, query, limit = 20 }) {
      if (!userId) throw new Error("userId is required");
      const s = ensure();
      const q = String(query || "").trim().toLowerCase();
      if (!q) return [];

      const all = [
        ...s.memory.facts.map(x => ({ ...x, type: x.type || "fact" })),
        ...s.memory.preferences.map(x => ({ ...x, type: x.type || "preference" })),
        ...s.memory.goals.map(x => ({ ...x, type: x.type || "goal" })),
        ...s.memory.events.map(x => ({ ...x, type: x.type || "event" })),
        ...s.memory.shortTerm.map(x => ({ ...x, type: x.type || "shortTerm" })),
      ];

      const scored = all.map((item, index) => {
        const text = textOf(item);
        const score = q.split(/\s+/).filter(Boolean)
          .reduce((sum, token) => sum + (text.includes(token) ? 1 : 0), 0);
        return { item, score, index };
      });

      return scored
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score || b.index - a.index)
        .slice(0, Math.max(0, limit))
        .map(x => x.item);
    },

    async upsert({ userId, type, content, confidence = 0.7, source = "coach", ...rest }) {
      if (!userId) throw new Error("userId is required");
      const s = ensure();

      const bucket =
        type === "preference" ? "preferences" :
        type === "goal" ? "goals" :
        type === "event" ? "events" :
        type === "shortTerm" ? "shortTerm" : "facts";

      const item = {
        id: rest.id || globalThis.crypto?.randomUUID?.() || `mem_${Date.now()}`,
        type,
        content: String(content),
        confidence: Math.max(0, Math.min(1, n(confidence, 0.7))),
        source,
        updatedAt: new Date().toISOString(),
        ...rest,
      };

      s.memory[bucket].push(item);

      // Keep legacy memory bounded; this is not destructive to workout/meal data.
      if (s.memory[bucket].length > 500) {
        s.memory[bucket] = s.memory[bucket].slice(-500);
      }

      if (typeof saveState === "function") await saveState();
      return { saved: true, item };
    },
  };
}
