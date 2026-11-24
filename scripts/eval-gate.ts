/**
 * Eval harness and CI gate.
 *
 * One fixture per agent in `evals/`. Each case declares the expected schema and
 * a small set of acceptable outputs. The gate fails the build when a response
 * is schema-invalid or when the fallback rate exceeds the fixture threshold.
 *
 * These are deterministic mock/template scores. Hosted-model prompt quality is
 * not scored here and must be reviewed by a human.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { formalise } from "../agents/formaliser";
import { tagRelevance } from "../agents/relevance";
import { explainFinding } from "../agents/explainer";
import { composeStatement } from "../agents/statement";
import { guard } from "../lib/guard";
import { claimProposalSchema, relevanceTagSchema } from "../lib/schemas";
import { clearCache, MockProvider } from "../providers";
import type { Claim, EvidenceLevel, EvidenceRow } from "../lib/types";
import type { FindingView, RunView } from "../lib/dto";

interface Accept {
  readonly kind?: readonly string[];
  readonly claimType?: readonly string[];
  readonly populationAnyOf?: readonly string[];
  readonly flags?: readonly string[];
  readonly bearsOn?: readonly boolean[];
  readonly nameRedacted?: boolean;
  readonly mustContain?: readonly string[];
  readonly coverageContains?: readonly string[];
  readonly findingsContains?: readonly string[];
}

interface EvalCase {
  readonly id: string;
  readonly input: Record<string, unknown>;
  readonly accept: Accept;
}

interface Fixture {
  readonly agent: string;
  readonly schema: string;
  readonly maxFallbackRate: number;
  readonly cases: readonly EvalCase[];
}

interface Result {
  readonly id: string;
  readonly schemaValid: boolean;
  readonly acceptable: boolean;
}

function fixture(name: string): Fixture {
  return JSON.parse(readFileSync(path.join("evals", `${name}.json`), "utf8")) as Fixture;
}

function makeClaim(predicate: string, rawText = predicate): Claim {
  return {
    id: `eval-${predicate.slice(0, 8)}`,
    ordinal: 0,
    rawText,
    population: "UNSPECIFIED",
    populationSpec: {},
    predicate,
    kind: "pain",
    claimType: "theme",
    claimedLevel: 6,
    observed: null,
    precisionTolerance: null,
    confirmed: true,
  };
}

function makeRow(notes: string): EvidenceRow {
  return {
    id: `eval-${notes.slice(0, 6) || "empty"}`,
    orgId: "eval-org",
    alias: "PX",
    segment: "eval",
    role: "user",
    channel: "eval",
    relationship: "cold",
    evidenceType: 2,
    date: "2026-01-01",
    durationMin: 20,
    notes,
  };
}

function makeFindingView(input: Record<string, unknown>): FindingView {
  const level = Number(input.level ?? 2) as EvidenceLevel;
  return {
    claimId: `eval-${String(input.claimText ?? "claim").slice(0, 6)}`,
    claimText: String(input.claimText ?? ""),
    claimType: "theme",
    claimed: Number(input.claimed ?? level) as EvidenceLevel,
    level,
    support: Number(input.support ?? 0),
    breadth: Number(input.support ?? 0),
    saturation: null,
    interval: null,
    finding: (input.finding as FindingView["finding"]) ?? "DOWNGRADE",
    binding: null,
    explanation: "",
    coverage: {},
    diagnostics: {},
    resolution: null,
    thresholds: [],
    trace: { population: "", predicate: "", tags: [], binding: null, diagnostics: {} },
  };
}

function matchesAny(actual: string, allowed: readonly string[] | undefined): boolean {
  return !allowed || allowed.some((value) => actual.includes(value));
}

async function runFormaliser(file: Fixture): Promise<Result[]> {
  const provider = new MockProvider();
  const results: Result[] = [];
  for (const testCase of file.cases) {
    const rawText = String(testCase.input.rawText ?? "");
    const parsed = claimProposalSchema.safeParse(
      (await formalise(rawText, provider)).proposal,
    );
    const value = parsed.success ? parsed.data : null;
    const acceptable =
      parsed.success &&
      matchesAny(value!.kind, testCase.accept.kind) &&
      matchesAny(value!.claimType, testCase.accept.claimType) &&
      (!testCase.accept.populationAnyOf ||
        testCase.accept.populationAnyOf.some((part) => value!.population.includes(part))) &&
      (!testCase.accept.flags ||
        testCase.accept.flags.every((flag) => value!.ambiguityFlags.includes(flag)));
    results.push({ id: testCase.id, schemaValid: parsed.success, acceptable });
  }
  return results;
}

async function runRelevance(file: Fixture): Promise<Result[]> {
  const provider = new MockProvider();
  const results: Result[] = [];
  for (const testCase of file.cases) {
    const notes = String(testCase.input.notes ?? "");
    const predicate = String(testCase.input.predicate ?? "");
    const parsed = relevanceTagSchema.safeParse(
      (await tagRelevance([makeRow(notes)], [makeClaim(predicate)], provider)).tags[0],
    );
    const value = parsed.success ? parsed.data : null;
    const acceptable =
      parsed.success &&
      (!testCase.accept.bearsOn || testCase.accept.bearsOn.includes(value!.bearsOn)) &&
      (!testCase.accept.nameRedacted || guard(notes).redacted !== notes);
    results.push({ id: testCase.id, schemaValid: parsed.success, acceptable });
  }
  return results;
}

async function runExplanation(file: Fixture): Promise<Result[]> {
  const provider = new MockProvider();
  const results: Result[] = [];
  for (const testCase of file.cases) {
    const claim = makeClaim(String(testCase.input.claimText ?? ""));
    const finding = {
      claimId: claim.id,
      kind: "DOWNGRADE" as const,
      claimed: Number(testCase.input.claimed ?? 6) as EvidenceLevel,
      verdict: {
        level: Number(testCase.input.level ?? 2) as EvidenceLevel,
        support: Number(testCase.input.support ?? 0),
        breadth: 0,
        saturation: null,
        interval: null,
        binding: "support" as const,
      },
      evidenceElsewhere: 0,
    };
    const text = (await explainFinding(claim, finding, provider)).text;
    const schemaValid = typeof text === "string" && text.length > 20;
    const acceptable =
      schemaValid &&
      (!testCase.accept.mustContain ||
        testCase.accept.mustContain.every((part) => text.includes(part)));
    results.push({ id: testCase.id, schemaValid, acceptable });
  }
  return results;
}

function runStatement(file: Fixture): Result[] {
  return file.cases.map((testCase) => {
    const findings = ((testCase.input.findings as Record<string, unknown>[] | undefined) ?? []).map(
      makeFindingView,
    );
    const run = { findings } as unknown as RunView;
    const sections = composeStatement(run);
    const schemaValid = [sections.method, sections.coverage, sections.findings, sections.limitations]
      .every((section) => typeof section === "string" && section.length > 0);
    const acceptable =
      schemaValid &&
      (!testCase.accept.coverageContains ||
        testCase.accept.coverageContains.every((part) => sections.coverage.includes(part))) &&
      (!testCase.accept.findingsContains ||
        testCase.accept.findingsContains.every((part) => sections.findings.includes(part)));
    return { id: testCase.id, schemaValid, acceptable };
  });
}

async function main() {
  clearCache();
  const names = ["formaliser", "relevance", "explanation", "statement"] as const;
  const lines: string[] = [
    "# Agent evaluation gate",
    "",
    "Generated by `npm run eval:gate`. Deterministic mock/template path only.",
    "The gate fails on schema-invalid output or a fallback rate above the fixture threshold.",
    "",
    "| Agent | Schema valid | Acceptable | Fallback rate | Threshold | Gate |",
    "|---|---:|---:|---:|---:|---|",
  ];
  let failed = false;

  for (const name of names) {
    const file = fixture(name);
    const results =
      name === "formaliser"
        ? await runFormaliser(file)
        : name === "relevance"
          ? await runRelevance(file)
          : name === "explanation"
            ? await runExplanation(file)
            : runStatement(file);
    const schemaValid = results.filter((result) => result.schemaValid).length;
    const acceptable = results.filter((result) => result.acceptable).length;
    const fallbackRate = 1 - acceptable / results.length;
    const schemaOk = schemaValid === results.length;
    const rateOk = fallbackRate <= file.maxFallbackRate;
    if (!schemaOk || !rateOk) failed = true;
    lines.push(
      `| ${name} | ${schemaValid}/${results.length} | ${acceptable}/${results.length} | ${(fallbackRate * 100).toFixed(0)}% | ${(file.maxFallbackRate * 100).toFixed(0)}% | ${schemaOk && rateOk ? "PASS" : "FAIL"} |`,
    );
    for (const result of results) {
      if (!result.schemaValid || !result.acceptable) {
        lines.push(`  - ${name}/${result.id}: schemaValid=${result.schemaValid} acceptable=${result.acceptable}`);
      }
    }
  }

  lines.push("", "Hosted-model prompt quality is deliberately not scored here.", "");
  writeFileSync(path.join("docs", "eval-gate.md"), `${lines.join("\n")}\n`);
  console.log(lines.filter((line) => line.startsWith("|") || line.startsWith("  -")).join("\n"));
  if (failed) process.exitCode = 1;
}

void main();
