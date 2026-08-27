/**
 * GARANG V10 bootstrap
 * Safe, non-invasive bridge for the existing application.
 */
import { createGarangCore } from "./garang-core.js";
import {
  createLegacyDataAdapter,
  createLegacyMemoryAdapter,
} from "./legacy-adapter.js";

export function initGarangV10({
  userId,
  getState,
  saveState,
  providers = {},
  tools = {},
  agents = {},
  defaultProvider = "legacy",
  systemPrompt = "",
} = {}) {
  if (!userId) throw new Error("initGarangV10: userId is required");
  if (typeof getState !== "function") {
    throw new Error("initGarangV10: getState() is required");
  }

  const memoryAdapter = createLegacyMemoryAdapter({ getState, saveState });
  const dataAdapter = createLegacyDataAdapter({ getState });

  return Object.freeze({
    version: "10.0.0",
    userId,
    core: createGarangCore({
      memoryAdapter,
      dataAdapter,
      tools,
      agents,
      providers,
      defaultProvider,
      systemPrompt,
    }),
  });
}
