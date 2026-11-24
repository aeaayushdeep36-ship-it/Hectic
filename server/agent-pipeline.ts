/**
 * The orchestration layer that actually exercises the language agents.
 *
 * Arithmetic still happens in createRun() before any provider is called. The
 * agents may only propose meaning, tag relevance and rephrase; their output is
 * logged, never allowed to change a finding hash. Progress is reported through
 * a callback so the HTTP layer can stream it to the browser (U1).
 */
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { explainFinding } from "../agents/explainer";
import { formalise } from "../agents/formaliser";
import { composeStatement, type StatementSections } from "../agents/statement";
import { PROMPT_VERSION } from "../agents/prompts";
import { tagRelevance } from "../agents/relevance";
import { db, sqlite } from "../db/client";
import { events, modelCalls, runs } from "../db/schema";
import { audit } from "../engine/index";
import {
  cacheStats,
  getProvider,
  type Completion,
  type Provider,
  type RetryOptions,
} from "../providers";
import { contentHash } from "../lib/hash";
import { createRun, workspaceInputs } from "./store";

export interface AgentProgress {
  readonly type: "progress";
  readonly step: string;
  readonly detail: string;
  readonly completed: number;
  readonly total: number;
}

export interface AgentPipelineResult {
  readonly type: "done";
  readonly runId: string;
  readonly workspaceSlug: string;
  readonly findingHash: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly callCount: number;
  readonly cacheHits: number;
  readonly fallbackReasons: readonly string[];
  readonly latencyMs: number;
  readonly statement: StatementSections;
}

export interface AgentPipelineFailure {
  readonly type: "error";
  readonly message: string;
}

export type AgentPipelineEvent = AgentProgress | AgentPipelineResult | AgentPipelineFailure;

interface PipelineOptions {
  readonly provider?: Provider;
  readonly retry?: RetryOptions;
  readonly onProgress?: (event: AgentProgress) => void;
}

interface CallRecord {
  readonly agent: string;
  readonly promptVersion: string;
  readonly completion: Completion;
  readonly inputHash: string;
}

function agentOf(system: string): { agent: string; promptVersion: string } {
  if (/decide relevance/i.test(system)) return { agent: "A2", promptVersion: "relevance.v1" };
  if (/convert a founder's belief/i.test(system)) return { agent: "A1", promptVersion: PROMPT_VERSION };
  if (/rephrase the given verdict/i.test(system)) return { agent: "A3", promptVersion: "constraint-explainer.v1" };
  return { agent: "other", promptVersion: "unversioned" };
}

export async function runAgentPipeline(
  slug: string,
  providerId = "mock",
  options: PipelineOptions = {},
): Promise<AgentPipelineResult> {
  const started = Date.now();
  const base = options.provider ?? getProvider(providerId);
  const callRecords: CallRecord[] = [];
  const retry = options.retry ?? {};
  const onProgress = options.onProgress;

  let attempts = 0;
  const instrumented: Provider = {
    id: base.id,
    modelId: base.modelId,
    get callCount() {
      return attempts;
    },
    async complete(system: string, user: string): Promise<Completion> {
      attempts += 1;
      const completion = await base.complete(system, user);
      const { agent, promptVersion } = agentOf(system);
      callRecords.push({ agent, promptVersion, completion, inputHash: contentHash([system, user]) });
      return completion;
    },
  };

  // Retry happens once, inside each agent's completeWithRetry call. Wrapping
  // the provider here as well would compound the retry budget fourfold.
  const retryPolicy: RetryOptions = {
    ...retry,
    onRetry: (reason, attempt, delayMs) => {
      retry.onRetry?.(reason, attempt, delayMs);
      onProgress?.({
        type: "progress",
        step: "retry",
        detail: `${reason} — retry ${attempt} after ${delayMs}ms`,
        completed: attempt,
        total: (retry.maxRetries ?? 3) + 1,
      });
    },
  };
  const provider = instrumented;

  const report = (step: string, detail: string, completed: number, total: number) =>
    onProgress?.({ type: "progress", step, detail, completed, total });

  const inputs = workspaceInputs(slug);
  const run = createRun(slug, base.id, base.modelId);
  const findings = audit(inputs.rows, inputs.claims);
  const fallbackReasons: string[] = [];

  report("engine", "Verdicts computed by pure arithmetic — no model produced a number", 0, inputs.claims.length + findings.length + 2);

  let formalised = 0;
  for (const claim of inputs.claims) {
    formalised += 1;
    report("formalise", `Formalising claim ${formalised}/${inputs.claims.length}`, formalised, inputs.claims.length);
    const result = await formalise(claim.rawText, provider, { retry: retryPolicy });
    if (result.fallbackReason) fallbackReasons.push(`A1:${claim.id}:${result.fallbackReason}`);
  }

  let cacheHits = 0;
  const relevance = await tagRelevance(inputs.rows, inputs.claims, provider, {
    retry: retryPolicy,
    onBatch: (completed, total, rowCount) => {
      report(
        "tag",
        `Tagging relevance — claim ${completed}/${total}, ${rowCount} rows in one batch`,
        completed,
        total,
      );
    },
  });
  cacheHits = relevance.cacheHits;
  fallbackReasons.push(...relevance.fallbackReasons);

  for (const [index, finding] of findings.entries()) {
    const claim = inputs.claims.find((item) => item.id === finding.claimId);
    if (!claim) continue;
    report("explain", `Explaining finding ${index + 1}/${findings.length}`, index + 1, findings.length);
    const result = await explainFinding(claim, finding, provider, { retry: retryPolicy });
    if (result.fallbackReason) fallbackReasons.push(`A3:${claim.id}:${result.fallbackReason}`);
  }

  report("compose", "Composing the statement from the locked ledger", 1, 1);
  const statement = composeStatement(run);

  const now = Date.now();
  sqlite.transaction(() => {
    for (const record of callRecords) {
      db.insert(modelCalls)
        .values({
          id: nanoid(),
          runId: run.id,
          agent: record.agent,
          promptVersion: record.promptVersion,
          providerId: base.id,
          modelId: base.modelId,
          inputHash: record.inputHash,
          promptTokens: record.completion.promptTokens,
          outputTokens: record.completion.outputTokens,
          latencyMs: record.completion.latencyMs,
          ok: record.completion.ok,
          errorCode: record.completion.errorCode,
          createdAt: now,
        })
        .run();
    }
    db.update(runs).set({ callCount: attempts }).where(eq(runs.id, run.id)).run();
    db.insert(events)
      .values({
        id: nanoid(),
        workspaceId: inputs.workspace.id,
        runId: run.id,
        type: "agent.pipeline_completed",
        payloadJson: JSON.stringify({
          providerId: base.id,
          modelId: base.modelId,
          callCount: attempts,
          cacheHits,
          cache: cacheStats(),
          fallbackReasons,
          findingHash: run.findingHash,
          latencyMs: now - started,
        }),
        createdAt: now,
      })
      .run();
  })();

  return {
    type: "done",
    runId: run.id,
    workspaceSlug: inputs.workspace.slug,
    findingHash: run.findingHash ?? "",
    providerId: base.id,
    modelId: base.modelId,
    callCount: attempts,
    cacheHits,
    fallbackReasons,
    latencyMs: now - started,
    statement,
  };
}
