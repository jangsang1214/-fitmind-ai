/**
 * GARANG V10 Memory Engine
 * 저장소(Firestore 등)는 adapter로 주입한다.
 */
export function createMemoryEngine(adapter) {
  if (!adapter) throw new Error("Memory adapter is required");

  return {
    async getRelevant(userId, query, limit = 20) {
      if (!userId) throw new Error("userId is required");
      return adapter.search({ userId, query, limit });
    },

    async saveCandidate(userId, candidate) {
      if (!userId) throw new Error("userId is required");
      if (!candidate?.type || !candidate?.content) return { saved: false };

      // 장기기억은 사실/목표/선호 등 구조화된 후보만 저장한다.
      return adapter.upsert({
        userId,
        ...candidate,
        updatedAt: new Date().toISOString(),
      });
    },
  };
}
