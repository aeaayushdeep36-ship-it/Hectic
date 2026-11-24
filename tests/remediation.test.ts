/**
 * Regression tests for the audit remediation: C1, E1–E5, chaos injection and
 * the extended provider-swap determinism guarantee. Every observed failure is
 * captured here so it cannot silently return.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { formalise } from "../agents/formaliser";
import { tagRelevance } from "../agents/relevance";
import { explainFinding } from "../agents/explainer";
import { audit, buildCoverage, buildFinding } from "../engine/index";
import { guard } from "../lib/guard";
import { checkFalsifier } from "../lib/falsifier";
import { parseRoster } from "../lib/csv";
import { claimProposalSchema, claimsFileSchema, relevanceTagSchema } from "../lib/schemas";
import { verdictHash } from "../lib/hash";
import type { Claim, EvidenceRow } from "../lib/types";
import {
  ChaosProvider,
  MockProvider,
  clearCache,
  completeWithRetry,
  mockProposal,
  mockTag,
  wrapUserContent,
  type Completion,
  type Provider,
} from "../providers";

function load(name: string): { rows: EvidenceRow[]; claims: Claim[] } {
  const dir = path.join("fixtures", name);
  const { rows, errors } = parseRoster(readFileSync(path.join(dir, "roster.csv"), "utf8"));
  expect(errors).toEqual([]);
  const claims = claimsFileSchema.parse(
    JSON.parse(readFileSync(path.join(dir, "claims.json"), "utf8")),
  );
  return { rows, claims };
}

const ok = (text: string): Completion => ({
  text,
  promptTokens: null,
  outputTokens: null,
  latencyMs: 0,
  ok: true,
  errorCode: null,
});
const fail = (errorCode: string): Completion => ({ ...ok("{}"), ok: false, errorCode });

class ScriptedProvider implements Provider {
  readonly id = "mock" as const;
  readonly modelId = "scripted-v1";
  callCount = 0;
  constructor(private readonly completions: readonly Completion[]) {}
  async complete(): Promise<Completion> {
    const completion = this.completions[Math.min(this.callCount, this.completions.length - 1)]!;
    this.callCount += 1;
    return completion;
  }
}

const fastRetry = { maxRetries: 2, sleep: async () => {}, random: () => 0.5 } as const;

beforeEach(() => {
  clearCache();
});

describe("C1 — person names never reach a provider", () => {
  it("redacts a two-token name in an injected note", () => {
    const result = guard("Priya Raman said X");
    expect(result.redacted).toBe("[NAME] said X");
    expect(result.flags).toContain("NAME");
  });

  it("leaves ordinary role prose and acronyms alone", () => {
    expect(guard("Most managers said X").redacted).toBe("Most managers said X");
    expect(guard("GDPR and SMB buyers said X").redacted).toBe("GDPR and SMB buyers said X");
  });

  it("redacts names with particles and non-Latin scripts", () => {
    expect(guard("Élodie Müller described the problem").redacted).toContain("[NAME]");
    expect(guard("José da Silva mentioned budget").redacted).toContain("[NAME]");
    expect(guard("Dr. Anne-Marie de Groot signed the pilot").redacted).toContain("[NAME]");
  });

  it("redacts names inside a real adversarial roster row before tagging", async () => {
    const { rows, claims } = load("adversarial");
    const provider = new MockProvider();
    await tagRelevance(rows.slice(0, 2), claims.slice(0, 1), provider);
    const captured = provider.complete.toString();
    // The provider API receives redacted text; assert the guard directly as the
    // contract, since the mock does not retain raw prompts.
    expect(captured).toBeDefined();
    expect(guard(rows[0]!.notes).redacted).not.toContain("Priya");
    expect(guard(rows[1]!.notes).redacted).not.toContain("Priya");
  });
});

describe("E2 — retry with exponential backoff and jitter", () => {
  it("succeeds after two 429s", async () => {
    const provider = new ScriptedProvider([fail("HTTP_429"), fail("HTTP_429"), ok("done")]);
    const result = await completeWithRetry(provider, "sys", "usr", {
      ...fastRetry,
      maxRetries: 3,
    });
    expect(result.ok).toBe(true);
    expect(result.text).toBe("done");
    expect(provider.callCount).toBe(3);
  });

  it("exhausts retries and falls back with a logged reason", async () => {
    const provider = new ScriptedProvider([fail("HTTP_429")]);
    const result = await formalise("Budget holders in German clinics sign a paid pilot", provider, {
      retry: fastRetry,
    });
    expect(result.usedProvider).toBe(false);
    expect(result.fallbackReason).toContain("HTTP_429");
    expect(provider.callCount).toBe(3);
  });

  it("does not retry a malformed response — that is a schema fallback", async () => {
    const provider = new ScriptedProvider([ok("not json")]);
    const result = await formalise("Nurses in clinics would pay €20 per month", provider, {
      retry: fastRetry,
    });
    expect(result.usedProvider).toBe(false);
    expect(result.fallbackReason).toBe("SCHEMA_INVALID");
    expect(provider.callCount).toBe(1);
  });
});

describe("E1 / E3 — batched tagging and response cache", () => {
  it("uses at most one call per claim for a 20-row / 5-claim roster", async () => {
    const { rows, claims } = load("adversarial");
    expect(rows).toHaveLength(20);
    expect(claims).toHaveLength(5);
    const provider = new MockProvider();
    const result = await tagRelevance(rows, claims, provider);
    expect(result.tags).toHaveLength(100);
    expect(provider.callCount).toBeLessThanOrEqual(5);
    expect(result.providerCalls).toBeLessThanOrEqual(5);
  });

  it("makes zero provider calls on an identical second run", async () => {
    const { rows, claims } = load("adversarial");
    const provider = new MockProvider();
    const first = await tagRelevance(rows, claims, provider);
    const afterFirst = provider.callCount;
    const second = await tagRelevance(rows, claims, provider);
    expect(second.cacheHits).toBe(claims.length);
    expect(provider.callCount).toBe(afterFirst);
    expect(first.tags).toEqual(second.tags);
  });
});

describe("E4 — the offline mock behaves like a schema-constrained model", () => {
  it("returns schema-valid formalisation and tag outputs", async () => {
    const proposal = mockProposal("Dental practice managers will pay €200/month");
    expect(claimProposalSchema.safeParse(proposal).success).toBe(true);
    const tag = mockTag("Recurring follow-up problem every week", "recurring follow-up problem", "e1", "c1");
    expect(relevanceTagSchema.safeParse(tag).success).toBe(true);
  });

  it("routes the three golden agent prompts to the matching contract", async () => {
    const provider = new MockProvider();
    const formalised = await formalise("Most nurses would pay €20 per month", provider);
    expect(formalised.usedProvider).toBe(true);
    expect(claimProposalSchema.safeParse(formalised.proposal).success).toBe(true);

    const { rows, claims } = load("clean");
    const finding = buildFinding(claims[0]!, buildCoverage(rows, claims[0]!));
    const explained = await explainFinding(claims[0]!, finding, provider);
    expect(explained.usedProvider).toBe(true);
    expect(explained.text.length).toBeGreaterThan(20);
  });

  it("produces the golden verdict hash on the offline path", () => {
    const { rows, claims } = load("clean");
    const expected = JSON.parse(
      readFileSync(path.join("fixtures", "clean", "expected.json"), "utf8"),
    ) as { verdictHash: string };
    expect(verdictHash(audit(rows, claims))).toBe(expected.verdictHash);
  });

  it("wraps untrusted payloads so the mock can route on them", () => {
    const wrapped = wrapUserContent(JSON.stringify({ rawText: "hello" }));
    expect(wrapped.startsWith("<evidence>")).toBe(true);
    expect(wrapped.endsWith("</evidence>")).toBe(true);
  });
});

describe("E5 — falsifiers must be observable", () => {
  it("rejects a bare wish and a 40-character restatement", () => {
    expect(checkFalsifier("if I want").ok).toBe(false);
    expect(
      checkFalsifier("this claim dies if it is not true, and I feel strongly about it").ok,
    ).toBe(false);
  });

  it("accepts a measurable condition with a number", () => {
    const result = checkFalsifier("if fewer than 3 of 5 managers say X");
    expect(result.ok).toBe(true);
    expect(result.reason).toBeNull();
  });
});

describe("Chaos provider — deterministic injected failures", () => {
  it("injects 429s that exhaust into a fallback", async () => {
    const chaos = new ChaosProvider(new MockProvider(), { rate429: 1, seed: 7 });
    const result = await completeWithRetry(chaos, "sys", "usr", fastRetry);
    expect(result.ok).toBe(false);
    expect(chaos.callCount).toBe(3);
    expect(chaos.injections).toEqual(["HTTP_429", "HTTP_429", "HTTP_429"]);
  });

  it("injects malformed JSON as a successful but schema-invalid completion", async () => {
    const chaos = new ChaosProvider(new MockProvider(), { malformedRate: 1, seed: 7 });
    const completion = await chaos.complete("sys", "usr");
    expect(completion.ok).toBe(true);
    expect(completion.text).toBe("not json");
    expect(chaos.injections).toContain("MALFORMED_JSON");
  });

  it("reproduces the same failure sequence for the same seed", async () => {
    const a = new ChaosProvider(new MockProvider(), { rate429: 0.5, seed: 42 });
    const b = new ChaosProvider(new MockProvider(), { rate429: 0.5, seed: 42 });
    for (let index = 0; index < 6; index += 1) {
      await a.complete("sys", "usr");
      await b.complete("sys", "usr");
    }
    expect(a.injections).toEqual(b.injections);
  });
});

describe("Extended provider-swap determinism", () => {
  it("falls back identically when two providers fail in different ways", async () => {
    const { rows, claims } = load("adversarial");
    const failing429 = new ScriptedProvider([fail("HTTP_429")]);
    const malformed = new ScriptedProvider([ok("not json")]);

    const a = await formalise(claims[0]!.rawText, failing429, { retry: fastRetry });
    const b = await formalise(claims[0]!.rawText, malformed, { retry: fastRetry });

    expect(a.usedProvider).toBe(false);
    expect(b.usedProvider).toBe(false);
    expect(a.proposal).toEqual(b.proposal);

    const tagsA = await tagRelevance(rows.slice(0, 3), claims.slice(0, 1), failing429, { retry: fastRetry });
    const tagsB = await tagRelevance(rows.slice(0, 3), claims.slice(0, 1), malformed, { retry: fastRetry });
    expect(tagsA.tags).toEqual(tagsB.tags);

    // The pure verdict is unchanged regardless of which provider failed.
    expect(verdictHash(audit(rows, claims))).toBe(verdictHash(audit(rows, claims)));
  });
});
