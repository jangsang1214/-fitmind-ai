/**
 * Provider-neutral LLM router.
 * provider.generate() 계약만 맞추면 GPT/Claude/Gemini 등으로 교체 가능.
 */
export function createAIRouter(providers = {}, defaultProvider) {
  return {
    async generate(request) {
      const providerName = request.provider || defaultProvider;
      const provider = providers[providerName];

      if (!provider || typeof provider.generate !== "function") {
        throw new Error(`AI provider unavailable: ${providerName}`);
      }

      return provider.generate(request);
    },

    providers() {
      return Object.keys(providers);
    },
  };
}
