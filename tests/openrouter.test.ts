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
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-flash-lite");
    vi.stubEnv("GROQ_MODEL", "llama-3.3-70b-versatile");
    expect(getProvider("gemini").modelId).toBe("gemini-2.5-flash-lite");
    expect(getProvider("groq").modelId).toBe("llama-3.3-70b-versatile");
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
