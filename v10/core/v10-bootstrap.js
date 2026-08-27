/**
 * GARANG V10 — Non-invasive bootstrap
 *
 * This file does NOT replace the existing GARANG app.
 * It creates a V10 Core instance only when the host application explicitly
 * calls initGarangV10().
 *
 * Provider adapters are injected by the host. No API key is embedded here.
 */

import { createGarangCore } from "../core/garang-core.js";
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

  const memoryAdapter = createLegacyMemoryAdapter({ getState, saveState });
  const dataAdapter = createLegacyDataAdapter({ getState });

  const core = createGarangCore({
    memoryAdapter,
    dataAdapter,
    tools,
    agents,
    providers,
    defaultProvider,
    systemPrompt,
  });

  return Object.freeze({
    version: "10.0.0-step1",
    userId,
    core,
  });
}
