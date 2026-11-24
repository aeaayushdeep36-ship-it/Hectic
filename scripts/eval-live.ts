/**
 * Live iterative-loop harness (the process fix, made executable).
 *
 * Runs every configured real provider at least 10 times, plus the seeded chaos
 * provider, over the golden fixture. Every schema-invalid response, fallback,
 * retry and hash divergence is recorded in docs/eval-live.md. Keys are read
 * from the environment only; nothing is printed and nothing is committed.
 *
 *   OPENROUTER_API_KEY=... npm run eval:live
 *
 * `OPENROUTER_LIVE_MODELS` can pin an explicit comma-separated model list when
 * an upstream provider is rate-limited. `OPENROUTER_SECOND_MODEL` adds one or
 * more comma-separated models to the default Gemma model. `HECTIC_LIVE_RUNS`
 * and the `HECTIC_LIVE_MAX_RETRIES`/`*_DELAY_MS` knobs are for short probes;
 * the recorded gate must use the defaults (10 runs and bounded backoff).
 *
 * A run is only "PASS" when at least two real models and 10 repetitions per
 * model completed with no schema-invalid output and a fallback rate at or
 * below 10%. With fewer models the command prints INCOMPLETE rather than
 * claiming the gate was met.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { readFileSync } from "node:fs";
import { formalise } from "../agents/formaliser";
import { explainFinding } from "../agents/explainer";
import { tagRelevance } from "../agents/relevance";
import { buildCoverage, buildFinding } from "../engine/index";
import { verdictHash } from "../lib/hash";
import { parseRoster } from "../lib/csv";
import { loadEnvLocal } from "../lib/env";
import { claimsFileSchema, claimProposalSchema, relevanceTagSchema } from "../lib/schemas";
import {
  ChaosProvider,
  MockProvider,
  clearCache,
  getProvider,
  type Provider,
} from "../providers";

loadEnvLocal();

const RUNS = Math.max(1, Number(process.env.HECTIC_LIVE_RUNS ?? 10));
const MAX_FALLBACK_RATE = 0.1;

const dir = path.join("fixtures", "clean");
const rows = parseRoster(readFileSync(path.join(dir, "roster.csv"), "utf8")).rows;
const claims = claimsFileSchema.parse(
  JSON.parse(readFileSync(path.join(dir, "claims.json"), "utf8")),
);
const golden = verdictHash(
  claims.map((claim) => buildFinding(claim, buildCoverage(rows, claim))),
);

interface Source {
  readonly name: string;
  readonly provider: Provider;
  readonly real: boolean;
}

function modelList(value: string | undefined): readonly string[] {
  return [...new Set((value ?? "").split(",").map((item) => item.trim()).filter(Boolean))];
}

const sources: Source[] = [];
if (process.env.GEMINI_API_KEY) sources.push({ name: "gemini", provider: getProvider("gemini"), real: true });
if (process.env.GROQ_API_KEY) sources.push({ name: "groq", provider: getProvider("groq"), real: true });
if (process.env.OPENROUTER_API_KEY) {
  const pinned = modelList(process.env.OPENROUTER_LIVE_MODELS);
  const primary = getProvider("openrouter").modelId;
  // An explicit list lets the gate avoid an upstream model that is temporarily
  // rate-limited without changing the app's default provider configuration.
  const openRouterModels = pinned.length > 0
    ? pinned
    : [primary, ...modelList(process.env.OPENROUTER_SECOND_MODEL).filter((model) => model !== primary)];

  for (const [index, model] of openRouterModels.entries()) {
    // A second key doubles the daily free request allowance. Without one, the
    // same key is reused and the harness reports the rate-limit failures.
    const key = index === 0
      ? process.env.OPENROUTER_API_KEY
      : process.env.OPENROUTER_SECOND_API_KEY || process.env.OPENROUTER_API_KEY;
    sources.push({
      name: `openrouter:${model}`,
      provider: getProvider("openrouter", model, key),
      real: true,
    });
  }
}
if (process.env.OLLAMA_BASE_URL || process.env.HECTIC_REHEARSE_OLLAMA === "1") {
  sources.push({ name: "ollama", provider: getProvider("ollama"), real: true });
}
sources.push({
  name: "chaos",
  provider: new ChaosProvider(new MockProvider(), {
    rate429: 0.4,
    timeoutRate: 0.3,
    malformedRate: 0.25,
    seed: 11,
  }),
  real: false,
});

interface Failure {
  readonly provider: string;
  readonly run: number;
  readonly agent: string;
  readonly reason: string;
}

interface Summary {
  readonly name: string;
  readonly real: boolean;
  readonly runs: number;
  readonly schemaValid: number;
  readonly checks: number;
  readonly fallbacks: number;
  readonly hashStable: number;
  readonly latencyMs: number;
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

const retry = {
  // Free shared pools return 429 bursts. Respect Retry-After and keep a longer
  // bounded backoff than the app default so one burst is not a false gate fail.
  // The env knobs exist for short model probes; the recorded gate uses defaults.
  maxRetries: positiveInt(process.env.HECTIC_LIVE_MAX_RETRIES, 5),
  baseDelayMs: positiveInt(process.env.HECTIC_LIVE_BASE_DELAY_MS, 3000),
  maxDelayMs: positiveInt(process.env.HECTIC_LIVE_MAX_DELAY_MS, 20_000),
  sleep: async (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
};

async function once(source: Source, run: number): Promise<Failure[]> {
  const failures: Failure[] = [];
  const record = (agent: string, reason: string) =>
    failures.push({ provider: source.name, run, agent, reason });

  try {
    const formalised = await formalise(claims[0]!.rawText, source.provider, { retry });
    if (!claimProposalSchema.safeParse(formalised.proposal).success) record("A1", "SCHEMA_INVALID");
    if (formalised.fallbackReason) record("A1", formalised.fallbackReason);

    const tagged = await tagRelevance(rows.slice(0, 5), claims.slice(0, 2), source.provider, { retry });
    if (!relevanceTagSchema.array().safeParse(tagged.tags).success || tagged.tags.length !== 10) {
      record("A2", "SCHEMA_INVALID");
    }
    for (const reason of tagged.fallbackReasons) record("A2", reason);

    const finding = buildFinding(claims[0]!, buildCoverage(rows, claims[0]!));
    const explained = await explainFinding(claims[0]!, finding, source.provider, { retry });
    if (explained.text.length <= 20) record("A3", "EMPTY");
    if (explained.fallbackReason) record("A3", explained.fallbackReason);

    const hash = verdictHash(claims.map((claim) => buildFinding(claim, buildCoverage(rows, claim))));
    if (hash !== golden) record("ENGINE", "HASH_DIVERGED");
  } catch (error) {
    record("PIPELINE", error instanceof Error ? error.message.slice(0, 100) : "THREW");
  }
  return failures;
}

async function main() {
  const failures: Failure[] = [];
  const summaries: Summary[] = [];

  for (const source of sources) {
    clearCache();
    const started = Date.now();
    let schemaValid = 0;
    let fallbacks = 0;
    let hashStable = 0;
    for (let run = 1; run <= RUNS; run += 1) {
      clearCache();
      const runFailures = await once(source, run);
      const schemaOk = !runFailures.some((failure) => failure.reason === "SCHEMA_INVALID" || failure.reason === "EMPTY");
      if (schemaOk) schemaValid += 1;
      fallbacks += runFailures.filter((failure) => failure.reason !== "SCHEMA_INVALID" && failure.reason !== "EMPTY").length;
      if (!runFailures.some((failure) => failure.agent === "ENGINE")) hashStable += 1;
      failures.push(...runFailures);
    }
    summaries.push({
      name: source.name,
      real: source.real,
      runs: RUNS,
      schemaValid,
      checks: RUNS,
      fallbacks,
      hashStable,
      latencyMs: Date.now() - started,
    });
  }

  const real = summaries.filter((summary) => summary.real);
  // Chaos deliberately injects malformed JSON: its schema failures are the
  // control working, not a model-quality failure. Real models must be clean.
  const allSchemaValid = real.every((summary) => summary.schemaValid === summary.checks);
  const allHashStable = summaries.every((summary) => summary.hashStable === summary.checks);
  const ratesOk = real.every((summary) => summary.fallbacks / (summary.checks * 3) <= MAX_FALLBACK_RATE);
  const enoughModels = real.length >= 2;
  const enoughRuns = RUNS >= 10;
  const gate = enoughModels && enoughRuns && allSchemaValid && allHashStable && ratesOk ? "PASS" : "INCOMPLETE";

  const lines = [
    "# Live agent evaluation",
    "",
    `Generated by \`npm run eval:live\` on ${new Date().toISOString()}.`,
    `Golden fixture hash: \`${golden}\`. Repetitions per provider: ${RUNS}.`,
    "",
    "| Provider | Real model | Runs | Schema valid | Fallbacks | Hash stable | Latency |",
    "|---|---|---:|---:|---:|---:|---:|",
    ...summaries.map((s) =>
      `| ${s.name} | ${s.real ? "yes" : "no (chaos wrapper)"} | ${s.runs} | ${s.schemaValid}/${s.checks} | ${s.fallbacks} | ${s.hashStable}/${s.checks} | ${s.latencyMs} ms |`,
    ),
    "",
    `Gate: **${gate}**. Requires ≥2 real models, ≥10 repetitions each, zero schema-invalid output, stable hash and ≤${MAX_FALLBACK_RATE * 100}% fallback rate.`,
    "",
    "Chaos is an adversarial control: injected malformed JSON and forced fallbacks are expected there and are excluded from the schema/fallback gate. Hash stability is still required of it.",
    "",
  ];

  if (failures.length === 0) {
    lines.push("No failures observed.", "");
  } else {
    lines.push("## Captured failures (every one is a regression candidate)", "");
    lines.push("| Provider | Run | Agent | Reason |", "|---|---:|---|---|");
    for (const failure of failures) {
      lines.push(`| ${failure.provider} | ${failure.run} | ${failure.agent} | ${failure.reason} |`);
    }
    lines.push("");
  }

  if (!enoughModels) {
    lines.push(
      "Only " + real.length + " real model(s) configured. Set `OPENROUTER_LIVE_MODELS` (or `OPENROUTER_SECOND_MODEL`) or add a second runtime key (`GEMINI_API_KEY`, `GROQ_API_KEY`) or `OLLAMA_BASE_URL` to satisfy the two-model requirement.",
      "",
    );
  }

  writeFileSync(path.join("docs", "eval-live.md"), `${lines.join("\n")}\n`);
  console.log(lines.filter((line) => line.startsWith("|") || line.startsWith("Gate:") || line.startsWith("Only ")).join("\n"));
}

void main();
