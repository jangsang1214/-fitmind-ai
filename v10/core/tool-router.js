export function createToolRouter(tools = {}) {
  return {
    has(name) {
      return typeof tools[name] === "function";
    },

    async call(name, args = {}) {
      const tool = tools[name];
      if (typeof tool !== "function") {
        throw new Error(`Unknown GARANG tool: ${name}`);
      }
      return tool(args);
    },
  };
}
