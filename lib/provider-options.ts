/**
 * Single source of truth for the provider/model catalog exposed to the UI and
 * route handlers. Keys and endpoints never live here — providers/index.ts
 * builds the real adapter server-side from environment variables.
 */

export const PROVIDER_IDS = ["mock", "openrouter", "gemini", "groq", "ollama"] as const;

export type ProviderIdOption = (typeof PROVIDER_IDS)[number];

export interface ProviderOption {
  readonly id: ProviderIdOption;
  readonly label: string;
  readonly modelId: string;
}

export const PROVIDER_OPTIONS: readonly ProviderOption[] = [
  { id: "mock", label: "mock · offline", modelId: "mock-v1" },
  { id: "openrouter", label: "openrouter · gemma 4 31B free", modelId: "google/gemma-4-31b-it:free" },
  { id: "gemini", label: "gemini", modelId: "gemini-2.0-flash-lite" },
  { id: "groq", label: "groq", modelId: "llama-3.1-8b-instant" },
  { id: "ollama", label: "ollama · local", modelId: "qwen2.5:7b" },
];

export const MODEL_BY_PROVIDER = Object.fromEntries(
  PROVIDER_OPTIONS.map((option) => [option.id, option.modelId]),
) as Readonly<Record<ProviderIdOption, string>>;

export const DEFAULT_ANALYSIS_PROVIDER: ProviderIdOption = "mock";
export const DEFAULT_RECOMPUTE_PROVIDER: ProviderIdOption = "ollama";

export interface ProviderSelection {
  readonly providerId: ProviderIdOption;
  readonly modelId: string;
}

const MODEL_ID_PATTERN = /^[A-Za-z0-9._:/-]{1,120}$/;

export function isProviderId(value: unknown): value is ProviderIdOption {
  return typeof value === "string" && (PROVIDER_IDS as readonly string[]).includes(value);
}

/**
 * Validate an untrusted route-handler body. Returns null instead of silently
 * accepting a provider or model that the server does not support.
 */
export function parseProviderSelection(
  body: unknown,
  fallbackProvider: ProviderIdOption = DEFAULT_ANALYSIS_PROVIDER,
): ProviderSelection | null {
  const input = (body ?? {}) as Record<string, unknown>;
  const providerId = input.providerId ?? fallbackProvider;
  if (!isProviderId(providerId)) return null;

  const modelId = input.modelId ?? MODEL_BY_PROVIDER[providerId];
  if (typeof modelId !== "string" || !MODEL_ID_PATTERN.test(modelId)) return null;

  return { providerId, modelId };
}
