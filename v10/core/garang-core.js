import { createMemoryEngine } from "./memory-engine.js";
import { createDataEngine } from "./data-engine.js";
import { createAgentEngine } from "./agent-engine.js";
import { createToolRouter } from "./tool-router.js";
import { createAIRouter } from "./ai-router.js";

export function createGarangCore(config) {
  const memory = createMemoryEngine(config.memoryAdapter);
  const data = createDataEngine(config.dataAdapter);
  const tools = createToolRouter(config.tools);
  const agents = createAgentEngine({ agents: config.agents });
  const ai = createAIRouter(config.providers, config.defaultProvider);

  return {
    memory,
    data,
    tools,
    agents,
    ai,

    async coach({ userId, message, intent = "general" }) {
      if (!userId) throw new Error("userId is required");
      if (!message?.trim()) throw new Error("message is required");

      const [state, recent, memories] = await Promise.all([
        data.getUserState(userId),
        data.getRecentContext(userId, { days: 14 }),
        memory.getRelevant(userId, message, 20),
      ]);

      const agent = agents.resolve(intent);

      const result = await ai.generate({
        provider: config.defaultProvider,
        system: config.systemPrompt,
        input: {
          userId,
          message,
          state,
          recent,
          memories,
          agent: agent?.name || "core",
        },
      });

      return {
        answer: result,
        context: { state, recent, memories },
      };
    },
  };
}
