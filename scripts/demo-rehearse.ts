/**
 * `npm run demo:rehearse` — the five stress questions, as code.
 *
 * Runs the golden fixture through every available provider: the deterministic
 * mock (mandatory), the chaos wrapper (mandatory), then Gemini / Groq / Ollama
 * when a key or endpoint is present. Prints pass/fail and wall-clock latency.
 * No host is contacted without explicit local configuration, so this is safe
 * to run in CI.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  clearCache,
  ChaosProvider,
  MockProvider,
  getProvider,
  type Provider,
} from "../providers";
import { formalise } from "../agents/formaliser";
import { tagRelevance } from "../agents/relevance";
import { explainFinding } from "../agents/explainer";
import { audit, buildCoverage, buildFinding } from "../engine/index";
import { parseRoster } from "../lib/csv";
import { claimsFileSchema, claimProposalSchema, relevanceTagSchema } from "../lib/schemas";
import { verdictHash } from "../lib/hash";

const dir = path.join("fixtures", "clean");
const rows = parseRoster(readFileSync(path.join(dir, "roster.csv"), "utf8")).rows;
const claims = claimsFileSchema.parse(
  JSON.parse(readFileSync(path.join(dir, "claims.json"), "utf8")),
);
const golden = verdictHash(audit(rows, claims));

interface Source {
  readonly name: string;
  readonly provider: Provider;
  readonly mandatory: boolean;
  readonly note?: string;
}

const sources: Source[] = [
  { name: "mock", provider: new MockProvider(), mandatory: true },
  {
    name: "chaos",
    provider: new ChaosProvider(new MockProvider(), {
      rate429: 0.4,
      timeoutRate: 0.3,
      malformedRate: 0.25,
      seed: 11,
    }),
    mandatory: true,
    note: "seeded 429 / timeout / malformed JSON injection",
  },
];

if (process.env.GEMINI_API_KEY) {
  sources.push({ name: "gemini", provider: getProvider("gemini"), mandatory: false });
}
if (process.env.GROQ_API_KEY) {
  sources.push({ name: "groq", provider: getProvider("groq"), mandatory: false });
}
if (process.env.OPENROUTER_API_KEY) {
  sources.push({
    name: "openrouter",
    provider: getProvider("openrouter"),
    mandatory: false,
    note: "free Gemma 4 31B",
  });
}
if (process.env.OLLAMA_BASE_URL || process.env.HECTIC_REHEARSE_OLLAMA === "1") {
  sources.push({ name: "ollama", provider: getProvider("ollama"), mandatory: false });
}

interface RehearsalResult {
  readonly pass: boolean;
  readonly reason: string;
  readonly latencyMs: number;
  readonly fallbacks: number;
  readonly retries: number;
  readonly injections: number;
}

async function rehearse(source: Source): Promise<RehearsalResult> {
  clearCache();
  const started = Date.now();
  const fallbackReasons: string[] = [];
  const retryLog: string[] = [];
  const retry = {
    maxRetries: 2,
    sleep: async () => {},
    onRetry: (reason: string, attempt: number) => retryLog.push(`${reason}#${attempt}`),
  };
  const finish = (pass: boolean, reason: string): RehearsalResult => ({
    pass,
    reason,
    latencyMs: Date.now() - started,
    fallbacks: fallbackReasons.length,
    retries: retryLog.length,
    injections: source.provider instanceof ChaosProvider ? source.provider.injections.length : 0,
  });

  const formalised = await formalise(claims[0]!.rawText, source.provider, { retry });
  if (!claimProposalSchema.safeParse(formalised.proposal).success) return finish(false, "A1_SCHEMA_INVALID");
  if (formalised.fallbackReason) fallbackReasons.push(`A1:${formalised.fallbackReason}`);

  const tagged = await tagRelevance(rows, claims, source.provider, { retry });
  if (!relevanceTagSchema.array().safeParse(tagged.tags).success || tagged.tags.length !== rows.length * claims.length) {
    return finish(false, "A2_SCHEMA_INVALID");
  }
  fallbackReasons.push(...tagged.fallbackReasons);

  const finding = buildFinding(claims[0]!, buildCoverage(rows, claims[0]!));
  const explained = await explainFinding(claims[0]!, finding, source.provider, { retry });
  if (explained.text.length <= 20) return finish(false, "A3_EMPTY");
  if (explained.fallbackReason) fallbackReasons.push(`A3:${explained.fallbackReason}`);

  const hash = verdictHash(audit(rows, claims));
  return finish(hash === golden, hash === golden ? "OK" : "FINDING_HASH_DIVERGED");
}

async function main() {
  console.log(`Golden fixture: fixtures/clean · hash ${golden}`);
  console.log("| Provider | Result | Latency | Retries | Fallbacks | Injections | Note |");
  console.log("|---|---|---:|---:|---:|---:|---|");
  let failed = false;
  for (const source of sources) {
    const result = await rehearse(source);
    const status = result.pass ? "PASS" : source.mandatory ? "FAIL" : "FAIL (optional)";
    if (!result.pass && source.mandatory) failed = true;
    console.log(
      `| ${source.name} | ${status} · ${result.reason} | ${result.latencyMs} ms | ${result.retries} | ${result.fallbacks} | ${result.injections} | ${source.note ?? ""} |`,
    );
  }
  const skipped = ["gemini", "groq", "ollama", "openrouter"]
    .filter((name) => !sources.some((source) => source.name === name))
    .join(", ");
  if (skipped) console.log(`\nSkipped without local configuration: ${skipped}`);
  console.log("\nOptional providers are exercised locally when keys are present; CI runs mock + chaos only.");
  if (failed) process.exitCode = 1;
}

void main();
