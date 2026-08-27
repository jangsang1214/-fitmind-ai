/**
 * GARANG V10 Data Engine
 * 운동/식단/러닝/신체 데이터의 접근점을 하나로 추상화한다.
 */
export function createDataEngine(adapter) {
  if (!adapter) throw new Error("Data adapter is required");

  return {
    async getUserState(userId) {
      return adapter.getUserState(userId);
    },

    async getRecentContext(userId, options = {}) {
      return adapter.getRecentContext(userId, options);
    },

    async getWorkoutHistory(userId, options = {}) {
      return adapter.getWorkoutHistory(userId, options);
    },

    async getNutritionHistory(userId, options = {}) {
      return adapter.getNutritionHistory(userId, options);
    },

    async getRunningHistory(userId, options = {}) {
      return adapter.getRunningHistory(userId, options);
    },

    async getBodyMetrics(userId, options = {}) {
      return adapter.getBodyMetrics(userId, options);
    },
  };
}
