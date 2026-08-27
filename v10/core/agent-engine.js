export function createAgentEngine({ agents = {} }) {
  return {
    resolve(intent) {
      const map = {
        workout: "workout",
        nutrition: "nutrition",
        running: "running",
        recovery: "recovery",
        report: "report",
      };
      return agents[map[intent]] || agents.core || null;
    },

    list() {
      return Object.keys(agents);
    },
  };
}
