/** OpenRouter readiness: free Gemma 4 31B, server-side key, tolerant JSON. */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formalise } from "../agents/formaliser";
import { explainFinding } from "../agents/explainer";
import { buildCoverage, buildFinding } from "../engine/index";
import { parseRoster } from "../lib/csv";
import { claimsFileSchema, claimProposalSchema } from "../lib/schemas";
import type { Claim, Finding } from "../lib/types";
import { getProvider, parseModelJson, type Completion, type Provider } from "../providers";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("server defaults", () => {
  it("uses the offline mock when no provider environment variable is set", () => {
    vi.stubEnv("LLM_PROVIDER", "");
    const provider = getProvider();
    expect(provider.id).toBe("mock");
    expect(provider.modelId).toBe("mock-v1");
  });
});

function fakeFetch(completion: Partial<Completion> = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fn = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: completion.text ?? "{}" } }],
        usage: { prompt_tokens: 11, completion_tokens: 7 },
      }),
    } as Response;
  };
  vi.stubGlobal("fetch", fn);
  return calls;
}

const claim: Claim = {
  id: "or-claim",
  ordinal: 0,
  rawText: "Dental practice managers will pay €200/month",
  population: "UNSPECIFIED",
  populationSpec: {},
  predicate: "will pay €200/month",
  kind: "pain",
  claimType: "theme",
  claimedLevel: 6,
  observed: null,
  precisionTolerance: null,
  confirmed: true,
};

function goldenFinding(): Finding {
  const dir = path.join("fixtures", "clean");
  const rows = parseRoster(readFileSync(path.join(dir, "roster.csv"), "utf8")).rows;
  const claims = claimsFileSchema.parse(
    JSON.parse(readFileSync(path.join(dir, "claims.json"), "utf8")),
  );
  const first = claims[0]!;
  return buildFinding(first, buildCoverage(rows, first));
}

describe("hosted provider model configuration", () => {
  it("honours explicit Gemini and Groq model overrides", () => {
    vi.stubEnv("GEMINI_MODEL", "gemma-4-31b-it");
    vi.stubEnv("GROQ_MODEL", "openai/gpt-oss-20b");
    expect(getProvider("gemini").modelId).toBe("gemma-4-31b-it");
    expect(getProvider("groq").modelId).toBe("openai/gpt-oss-20b");
  });

  it("does not force json_object mode on array-returning agents", async () => {
    vi.stubEnv("GEMINI_API_KEY", "unit-test-key");
    vi.stubEnv("GROQ_API_KEY", "unit-test-key");
    for (const id of ["gemini", "groq"] as const) {
      const calls = fakeFetch();
      await getProvider(id).complete("system", "user");
      expect(JSON.parse(calls[0]!.init.body as string)).not.toHaveProperty("response_format");
    }
  });
});

describe("OpenRouter provider", () => {
  it("defaults to the free tier of the open-weight Gemma 4 31B model", () => {
    const provider = getProvider("openrouter");
    expect(provider.id).toBe("openrouter");
    expect(provider.modelId).toBe("google/gemma-4-31b-it:free");
  });

  it("honours an explicit model override without a code change", () => {
    vi.stubEnv("OPENROUTER_MODEL", "google/gemma-4-31b-it");
    expect(getProvider("openrouter").modelId).toBe("google/gemma-4-31b-it");
  });

  it("accepts a per-source model override for the two-model live gate", () => {
    expect(getProvider("openrouter", "google/gemma-4-26b-a4b-it:free").modelId).toBe(
      "google/gemma-4-26b-a4b-it:free",
    );
  });

  it("sends the key only from the server environment, with no JSON-mode assumption", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "unit-test-key");
    const calls = fakeFetch();
    const completion = await getProvider("openrouter").complete("system", "user");

    expect(completion.ok).toBe(true);
    expect(completion.promptTokens).toBe(11);
    expect(completion.outputTokens).toBe(7);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://openrouter.ai/api/v1/chat/completions");
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer unit-test-key");
    expect(headers["X-Title"]).toBe("Hectic evidence auditor");
    expect(headers["HTTP-Referer"]).toBe("http://localhost:3000");
    const body = JSON.parse(calls[0]!.init.body as string) as Record<string, unknown>;
    expect(body.model).toBe("google/gemma-4-31b-it:free");
    expect(body).not.toHaveProperty("response_format");
  });

  it("uses an explicitly supplied key for a second live-gate model", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "first-key");
    const calls = fakeFetch();
    await getProvider("openrouter", "google/gemma-4-26b-a4b-it:free", "second-key").complete(
      "system",
      "user",
    );
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe(
      "Bearer second-key",
    );
    expect(JSON.parse(calls[0]!.init.body as string).model).toBe(
      "google/gemma-4-26b-a4b-it:free",
    );
  });

  it("never sends an authorization header when no key is configured", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    const calls = fakeFetch();
    await getProvider("openrouter").complete("system", "user");
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBeUndefined();
  });
});

describe("tolerant model output", () => {
  it("parses fenced and prose-wrapped JSON without evaluating code", () => {
    expect(parseModelJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseModelJson('Here is the result: [{"a":1}] — done.')).toEqual([{ a: 1 }]);
    expect(parseModelJson("not json")).toBeNull();
  });

  it("accepts a fenced A1 proposal and still refuses a numeric field", async () => {
    const provider: Provider = {
      id: "openrouter",
      modelId: "google/gemma-4-31b-it:free",
      complete: async () => ({
        text: '```json\n{"rawText":"Dental practice managers will pay €200/month","population":"dental practice managers","predicate":"will pay €200/month","kind":"pain","claimType":"theme","rationale":"from the sentence","ambiguityFlags":[]}\n```',
        promptTokens: 1,
        outputTokens: 1,
        latencyMs: 1,
        ok: true,
        errorCode: null,
      }),
    };
    const result = await formalise(claim.rawText, provider);
    expect(result.usedProvider).toBe(true);
    expect(result.fallbackReason).toBeNull();
    expect(claimProposalSchema.safeParse(result.proposal).success).toBe(true);
  });

  it("fills the server-owned rawText when an open model omits it", async () => {
    const provider: Provider = {
      id: "groq",
      modelId: "qwen/qwen3.8-27b",
      complete: async () => ({
        text: JSON.stringify({
          population: "Buyers in unspecified market segments",
          predicate: "have a recurring follow-up problem",
          kind: "frequency",
          claimType: "theme",
          rationale: "x".repeat(500),
          ambiguityFlags: [],
        }),
        promptTokens: 1,
        outputTokens: 1,
        latencyMs: 1,
        ok: true,
        errorCode: null,
      }),
    };
    const result = await formalise(claim.rawText, provider);
    expect(result.usedProvider).toBe(true);
    expect(result.fallbackReason).toBeNull();
    expect(claimProposalSchema.safeParse(result.proposal).success).toBe(true);
    expect(result.proposal.rawText).toBe(claim.rawText);
    expect(result.proposal.rationale).toHaveLength(400);
  });

  it("normalises snake_case field aliases from hosted models", async () => {
    const provider: Provider = {
      id: "gemini",
      modelId: "gemini-flash-lite-latest-alias-regression",
      complete: async () => ({
        text: JSON.stringify({
          population: "Buyers in these segments",
          predicate: "have a recurring follow-up problem",
          kind: "frequency",
          claim_type: "theme",
          rationale: "r".repeat(500),
          ambiguity_flags: ["population_scope_undefined"],
        }),
        promptTokens: 1,
        outputTokens: 1,
        latencyMs: 1,
        ok: true,
        errorCode: null,
      }),
    };
    const result = await formalise(claim.rawText, provider);
    expect(result.usedProvider).toBe(true);
    expect(result.fallbackReason).toBeNull();
    expect(claimProposalSchema.safeParse(result.proposal).success).toBe(true);
    expect(result.proposal.claimType).toBe("theme");
    expect(result.proposal.ambiguityFlags).toEqual(["population_scope_undefined"]);
  });

  it("accepts an array-wrapped A3 explanation under an alias key", async () => {
    const provider: Provider = {
      id: "groq",
      modelId: "qwen/qwen3.8-27b-a3-alias-regression",
      complete: async () => ({
        text: JSON.stringify([
          {
            explanation:
              "The available evidence is limited and does not establish the claim across the stated population.",
          },
        ]),
        promptTokens: 1,
        outputTokens: 1,
        latencyMs: 1,
        ok: true,
        errorCode: null,
      }),
    };
    const result = await explainFinding(claim, goldenFinding(), provider);
    expect(result.usedProvider).toBe(true);
    expect(result.fallbackReason).toBeNull();
    expect(result.text).toContain("The available evidence is limited");
  });

  it("keeps the A3 numeric guard even when the model wraps valid JSON", async () => {
    const provider: Provider = {
      id: "openrouter",
      modelId: "google/gemma-4-31b-it:free",
      complete: async () => ({
        text: '```json\n{"text":"The evidence is strong at L9 with 99 organisations."}\n```',
        promptTokens: 1,
        outputTokens: 1,
        latencyMs: 1,
        ok: true,
        errorCode: null,
      }),
    };
    const result = await explainFinding(claim, goldenFinding(), provider);
    expect(result.usedProvider).toBe(false);
    expect(result.fallbackReason).toBe("NUMERIC_GUARD");
    expect(result.text).not.toContain("L9");
  });
});
