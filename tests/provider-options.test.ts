import { describe, expect, it } from "vitest";
import {
  DEFAULT_ANALYSIS_PROVIDER,
  MODEL_BY_PROVIDER,
  PROVIDER_OPTIONS,
  isProviderId,
  parseProviderSelection,
} from "../lib/provider-options";

describe("provider options", () => {
  it("exposes one catalog for UI labels and server defaults", () => {
    expect(PROVIDER_OPTIONS.map((option) => option.id)).toEqual(["mock", "openrouter", "gemini", "groq", "ollama"]);
    expect(MODEL_BY_PROVIDER.openrouter).toBe("google/gemma-4-31b-it:free");
    expect(DEFAULT_ANALYSIS_PROVIDER).toBe("mock");
  });

  it("accepts an empty body and an explicit valid selection", () => {
    expect(parseProviderSelection({})).toEqual({ providerId: "mock", modelId: "mock-v1" });
    expect(parseProviderSelection({ providerId: "openrouter" })).toEqual({
      providerId: "openrouter",
      modelId: "google/gemma-4-31b-it:free",
    });
    expect(parseProviderSelection({ providerId: "openrouter", modelId: "google/gemma-4-26b-a4b-it:free" })).toEqual({
      providerId: "openrouter",
      modelId: "google/gemma-4-26b-a4b-it:free",
    });
  });

  it("rejects unknown providers and unsafe model ids", () => {
    expect(isProviderId("made-up")).toBe(false);
    expect(parseProviderSelection({ providerId: "made-up" })).toBeNull();
    expect(parseProviderSelection({ modelId: "bad model\ninjection" })).toBeNull();
    expect(parseProviderSelection(null, "ollama")).toEqual({ providerId: "ollama", modelId: "qwen2.5:7b" });
  });
});
