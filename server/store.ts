/**
 * Application service layer. All writes go through here so the state machine,
 * the audit log and the export gate cannot be bypassed by a UI shortcut.
 */
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, sqlite } from "../db/client";
import {
  claimThresholds,
  claims,
  evidence,
  evidenceClaimTags,
  events,
  resolutions,
  runFindings,
  runs,
  workspaces,
} from "../db/schema";
import type {
  Binding,
  Claim,
  Finding,
  FindingKind,
  Interval,
  Saturation,
} from "../lib/types";
import type {
  AuditEventView,
  ClaimView,
  FindingView,
  MatrixView,
  RunView,
  ThresholdView,
  WorkspaceView,
} from "../lib/dto";
import {
  ENGINE_VERSION,
  THRESHOLD_VERSION,
  buildCoverage,
  buildFinding,
  explain,
  isInPopulation,
  verdictHash,
} from "./engine-services";
import {
  channelToSource,
  evidenceTypeToDb,
  relationshipToDb,
  toClaim,
  toEvidenceRow,
} from "./mappers";
import { seedDatabase } from "../db/seed-data";
import { contentHash } from "../lib/hash";
import { guard } from "../lib/guard";
import { checkFalsifier } from "../lib/falsifier";
import { parseRoster } from "../lib/csv";

export class UnresolvedFindingsError extends Error {
  constructor(readonly unresolved: string[]) {
    super("unresolved findings");
  }
}

function loadWorkspace(slug: string) {
  return db.select().from(workspaces).where(eq(workspaces.slug, slug)).get();
}

function loadEvidence(workspaceId: string) {
  const rows = db
    .select()
    .from(evidence)
    .where(eq(evidence.workspaceId, workspaceId))
    .all();
  return { rows, domain: rows.map(toEvidenceRow) };
}

function loadClaims(workspaceId: string): Claim[] {
  return db
    .select()
    .from(claims)
    .where(eq(claims.workspaceId, workspaceId))
    .orderBy(claims.ordinal)
    .all()
    .map(toClaim);
}

function workspaceStatsFor(workspaceId: string) {
  const claimCount = db
    .select({ id: claims.id })
    .from(claims)
    .where(eq(claims.workspaceId, workspaceId))
    .all().length;
  const evidenceRows = db
    .select({ id: evidence.id, orgRef: evidence.orgRef })
    .from(evidence)
    .where(eq(evidence.workspaceId, workspaceId))
    .all();
  const runCount = db
    .select({ id: runs.id })
    .from(runs)
    .where(eq(runs.workspaceId, workspaceId))
    .all().length;
  return {
    claimCount,
    evidenceCount: evidenceRows.length,
    orgCount: new Set(evidenceRows.map((row) => row.orgRef)).size,
    runCount,
  };
}

export function listWorkspaces(): WorkspaceView[] {
  let all = db.select().from(workspaces).all();
  // A fresh clone has no rows. Seed the four synthetic demos on first use so
  // `npm run dev` alone still shows the product.
  if (all.length === 0) {
    sqlite.transaction(() => {
      if (db.select({ id: workspaces.id }).from(workspaces).all().length === 0) {
        seedDatabase();
      }
    })();
    all = db.select().from(workspaces).all();
  }

  const claimCounts = new Map<string, number>();
  for (const row of db.select({ workspaceId: claims.workspaceId }).from(claims).all()) {
    claimCounts.set(row.workspaceId, (claimCounts.get(row.workspaceId) ?? 0) + 1);
  }

  const evidenceCounts = new Map<string, number>();
  const orgsByWorkspace = new Map<string, Set<string>>();
  for (const row of db
    .select({ workspaceId: evidence.workspaceId, orgRef: evidence.orgRef })
    .from(evidence)
    .all()) {
    evidenceCounts.set(row.workspaceId, (evidenceCounts.get(row.workspaceId) ?? 0) + 1);
    let orgs = orgsByWorkspace.get(row.workspaceId);
    if (!orgs) {
      orgs = new Set<string>();
      orgsByWorkspace.set(row.workspaceId, orgs);
    }
    orgs.add(row.orgRef);
  }

  const runCounts = new Map<string, number>();
  for (const row of db.select({ workspaceId: runs.workspaceId }).from(runs).all()) {
    runCounts.set(row.workspaceId, (runCounts.get(row.workspaceId) ?? 0) + 1);
  }

  return all.map((workspace) => ({
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    contextNote: workspace.contextNote,
    isDemo: workspace.isDemo,
    claimCount: claimCounts.get(workspace.id) ?? 0,
    evidenceCount: evidenceCounts.get(workspace.id) ?? 0,
    orgCount: orgsByWorkspace.get(workspace.id)?.size ?? 0,
    runCount: runCounts.get(workspace.id) ?? 0,
  }));
}

export function getWorkspace(slug: string): WorkspaceView | null {
  let workspace = loadWorkspace(slug);
  if (!workspace && db.select({ id: workspaces.id }).from(workspaces).all().length === 0) {
    sqlite.transaction(() => {
      if (db.select({ id: workspaces.id }).from(workspaces).all().length === 0) {
        seedDatabase();
      }
    })();
    workspace = loadWorkspace(slug);
  }
  if (!workspace) return null;
  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    contextNote: workspace.contextNote,
    isDemo: workspace.isDemo,
    ...workspaceStatsFor(workspace.id),
  };
}

export interface ImportEvidenceResult {
  readonly imported: number;
  readonly duplicates: number;
  readonly redacted: number;
  readonly injections: number;
  readonly errors: readonly { line: number; message: string }[];
  readonly batchId: string;
}

/**
 * Roster ingestion. Rows are validated individually, redacted before storage,
 * and given a content-derived identity so importing the same file twice is a
 * no-op rather than a doubled sample — the unit of evidence is the interview,
 * not the upload.
 */
export function importEvidence(slug: string, csv: string): ImportEvidenceResult {
  // One transaction: a failure midway rolls the whole import back instead of
  // leaving a half-imported roster (and it is far faster than per-row commits).
  return sqlite.transaction(() => importEvidenceInner(slug, csv))();
}

function importEvidenceInner(slug: string, csv: string): ImportEvidenceResult {
  const workspace = loadWorkspace(slug);
  if (!workspace) throw new Error(`Unknown workspace: ${slug}`);
  if (Buffer.byteLength(csv, "utf8") > 2_000_000) {
    throw new Error("CSV_TOO_LARGE");
  }

  const { rows, errors } = parseRoster(csv);
  if (rows.length > 500) throw new Error("CSV_TOO_MANY_ROWS");

  const claimsForTags = loadClaims(workspace.id);
  const batchId = contentHash([slug, rows.map((row) => [row.id, row.orgId])]);
  const now = Date.now();
  let imported = 0;
  let duplicates = 0;
  let redacted = 0;
  let injections = 0;
  const rejected = [...errors];

function isValidDateInput(raw: string): boolean {
  if (!Number.isFinite(Date.parse(raw))) return false;
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!isoMatch) return true;
  const year = Number(isoMatch[1]);
  const month = Number(isoMatch[2]);
  const day = Number(isoMatch[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

  for (const [index, row] of rows.entries()) {
    if (!isValidDateInput(row.date)) {
      rejected.push({ line: index + 2, message: "Invalid date" });
      continue;
    }

    const guarded = guard(row.notes);
    if (guarded.flags.length > 0) redacted += 1;
    if (guarded.injected) {
      injections += 1;
      db.insert(events)
        .values({
          id: nanoid(),
          workspaceId: workspace.id,
          type: "guard.injection_flagged",
          payloadJson: JSON.stringify({ line: index + 2, flags: guarded.flags }),
          createdAt: now,
        })
        .run();
    }

    // Deliberately do not persist notesRaw: the original text may contain PII.
    const id = contentHash([workspace.id, row]);
    const inserted = db
      .insert(evidence)
      .values({
        id,
        workspaceId: workspace.id,
        // Aliases are founder-supplied and may contain a real name. Redact at
        // the boundary too, even though they are never sent to a provider.
        alias: guard(row.alias).redacted,
        interviewedAt: Date.parse(row.date),
        role: row.role,
        orgRef: row.orgId,
        segment: row.segment,
        sourceChannel: channelToSource(row.channel),
        relationship: relationshipToDb(row.relationship),
        evidenceType: evidenceTypeToDb(row.evidenceType),
        durationMin: row.durationMin,
        notesRaw: null,
        notesRedacted: guarded.redacted,
        importBatch: batchId,
        createdAt: now,
      })
      .onConflictDoNothing()
      .run();

    if (inserted.changes === 0) {
      duplicates += 1;
      continue;
    }
    imported += 1;

    for (const claim of claimsForTags) {
      db.insert(evidenceClaimTags)
        .values({
          id: contentHash([id, claim.id]),
          evidenceId: id,
          claimId: claim.id,
          bearsOn: true,
          polarity: "supports",
          inPopulation: isInPopulation(row, claim),
          populationMatchProducer: "rule",
          producer: "human",
          createdAt: now,
        })
        .onConflictDoNothing()
        .run();
    }
  }

  db.insert(events)
    .values({
      id: nanoid(),
      workspaceId: workspace.id,
      type: "roster.imported",
      payloadJson: JSON.stringify({
        batchId,
        imported,
        duplicates,
        rejected: rejected.length,
        redacted,
        injections,
      }),
      createdAt: now,
    })
    .run();

  return { imported, duplicates, redacted, injections, errors: rejected, batchId };
}

export function listRuns(slug: string): RunView[] {
  const workspace = loadWorkspace(slug);
  if (!workspace) return [];
  const rows = db
    .select()
    .from(runs)
    .where(eq(runs.workspaceId, workspace.id))
    .orderBy(desc(runs.startedAt))
    .limit(20)
    .all();
  return rows.map((run) => hydrateRun(run));
}

function hydrateRun(run: typeof runs.$inferSelect): RunView {
  const findingRows = db
    .select()
    .from(runFindings)
    .where(eq(runFindings.runId, run.id))
    .all();
  const resolutionRows = db
    .select()
    .from(resolutions)
    .where(eq(resolutions.runId, run.id))
    .all();

  const claimRows = db
    .select()
    .from(claims)
    .where(
      findingRows.length > 0
        ? inArray(
            claims.id,
            findingRows.map((finding) => finding.claimId),
          )
        : sql`1 = 0`,
    )
    .all();
  const claimById = new Map(claimRows.map((row) => [row.id, row]));
  const tagRows = findingRows.length
    ? db
        .select({
          evidenceId: evidenceClaimTags.evidenceId,
          claimId: evidenceClaimTags.claimId,
          alias: evidence.alias,
          bearsOn: evidenceClaimTags.bearsOn,
          polarity: evidenceClaimTags.polarity,
          overriddenByUser: evidenceClaimTags.overriddenByUser,
          producer: evidenceClaimTags.producer,
        })
        .from(evidenceClaimTags)
        .innerJoin(evidence, eq(evidence.id, evidenceClaimTags.evidenceId))
        .where(
          inArray(
            evidenceClaimTags.claimId,
            findingRows.map((finding) => finding.claimId),
          ),
        )
        .all()
    : [];

  const claimIds = findingRows.map((finding) => finding.claimId);
  const thresholdRows =
    claimIds.length > 0
      ? db
          .select()
          .from(claimThresholds)
          .where(inArray(claimThresholds.claimId, claimIds))
          .all()
      : [];
  const thresholdsByClaim = new Map<string, ThresholdView[]>();
  for (const row of thresholdRows) {
    const list = thresholdsByClaim.get(row.claimId) ?? [];
    list.push({
      id: row.id,
      code: row.code,
      kind: row.kind,
      value: row.overridden && row.overrideValue !== null ? row.overrideValue : row.requiredValue,
      rationale: row.rationale,
      source: row.sourceRef,
      scope: row.scope,
      overridden: row.overridden,
    });
    thresholdsByClaim.set(row.claimId, list);
  }

  const findings: FindingView[] = findingRows.map((row) => {
    const claim = claimById.get(row.claimId);
    const resolution = resolutionRows.find((item) => item.claimId === row.claimId);
    return {
      claimId: row.claimId,
      claimText: claim?.rawText ?? row.claimId,
      claimType: (claim?.claimType ?? "theme") as FindingView["claimType"],
      claimed: (claim?.claimedLevel ?? row.level) as FindingView["claimed"],
      level: row.level as FindingView["level"],
      support: row.support,
      breadth: row.breadth,
      saturation: row.saturation as Saturation,
      interval: row.intervalJson
        ? (JSON.parse(row.intervalJson) as Interval)
        : null,
      finding: row.finding as FindingKind,
      binding: row.bindingCode as Binding,
      explanation: row.explanation ?? "",
      coverage: JSON.parse(row.coverageJson),
      diagnostics: JSON.parse(row.diagnosticsJson),
      resolution: resolution
        ? {
            action: resolution.action,
            targetLevel: resolution.targetLevel,
            falsifier: resolution.falsifier,
            note: resolution.note,
            resolvedAt: resolution.resolvedAt,
          }
        : null,
      thresholds: thresholdsByClaim.get(row.claimId) ?? [],
      trace: {
        population: claim?.population ?? "UNSPECIFIED",
        predicate: claim?.predicate ?? row.claimId,
        tags: tagRows
          .filter((tag) => tag.claimId === row.claimId)
          .map((tag) => ({
            evidenceId: tag.evidenceId,
            alias: tag.alias,
            bearsOn: tag.bearsOn,
            polarity: tag.polarity,
            overriddenByUser: tag.overriddenByUser,
            producer: tag.producer,
          })),
        binding: row.bindingCode as Binding,
        diagnostics: JSON.parse(row.diagnosticsJson),
      },
    };
  });

  const workspaceSlug =
    db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, run.workspaceId))
      .get()?.slug ?? "";

  return {
    id: run.id,
    workspaceSlug,
    status: run.status,
    providerId: run.providerId ?? "mock",
    modelId: run.modelId ?? "mock-v1",
    inputHash: run.inputHash,
    findingHash: run.findingHash ?? "",
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    costEur: run.costEur,
    callCount: run.callCount,
    findings,
  };
}

export function getRun(runId: string): RunView | null {
  const run = db.select().from(runs).where(eq(runs.id, runId)).get();
  return run ? hydrateRun(run) : null;
}

/** The confirmed inputs an agent pipeline may read. Never includes raw notes. */
export function workspaceInputs(slug: string) {
  const workspace = loadWorkspace(slug);
  if (!workspace) throw new Error(`Unknown workspace: ${slug}`);
  return {
    workspace,
    rows: loadEvidence(workspace.id).domain,
    claims: loadClaims(workspace.id).filter((claim) => claim.confirmed),
  };
}

function compute(workspaceId: string) {
  const domain = loadEvidence(workspaceId).domain;
  const claimRows = loadClaims(workspaceId).filter((claim) => claim.confirmed);
  const findings: Finding[] = [];
  const coverageByClaim = new Map<string, ReturnType<typeof buildCoverage>>();

  for (const claim of claimRows) {
    const coverage = buildCoverage(domain, claim);
    coverageByClaim.set(claim.id, coverage);
    // Only the engine decides a level. The store merely persists its output.
    findings.push(buildFinding(claim, coverage));
  }

  return { findings, coverageByClaim, claimRows, domain };
}

export function createRun(
  slug: string,
  providerId = "mock",
  modelId = "mock-v1",
): RunView {
  return sqlite.transaction(() => {
    const workspace = loadWorkspace(slug);
    if (!workspace) throw new Error(`Unknown workspace: ${slug}`);

    const { findings, coverageByClaim, claimRows, domain } = compute(workspace.id);
    const inputHash = verdictHash({ claims: claimRows, evidence: domain });
    const findingHash = verdictHash(findings);
    const unresolved = findings.filter((finding) => finding.kind !== "SUPPORTED");

    const runId = nanoid();
    const startedAt = Date.now();
    db.insert(runs)
      .values({
        id: runId,
        workspaceId: workspace.id,
        status: unresolved.length > 0 ? "BLOCKED" : "RESOLVED",
        engineVersion: ENGINE_VERSION,
        thresholdVersion: THRESHOLD_VERSION,
        inputHash,
        findingHash,
        providerId,
        modelId,
        startedAt,
        finishedAt: startedAt,
        costEur: 0,
        callCount: 0,
      })
      .run();

    for (const finding of findings) {
      const claim = claimRows.find((item) => item.id === finding.claimId);
      if (!claim) continue;
      const coverage = coverageByClaim.get(claim.id);
      db.insert(runFindings)
        .values({
          id: nanoid(),
          runId,
          claimId: claim.id,
          level: finding.verdict.level,
          support: finding.verdict.support,
          breadth: finding.verdict.breadth,
          saturation: finding.verdict.saturation,
          intervalJson: finding.verdict.interval
            ? JSON.stringify(finding.verdict.interval)
            : null,
          finding: finding.kind,
          bindingCode: finding.verdict.binding,
          coverageJson: JSON.stringify(coverage ?? {}),
          diagnosticsJson: JSON.stringify(coverage?.diagnostics ?? {}),
          explanation: explain(claim, finding),
        })
        .run();
    }

    db.insert(events)
      .values({
        id: nanoid(),
        workspaceId: workspace.id,
        runId,
        type: "run.analysed",
        payloadJson: JSON.stringify({
          providerId,
          modelId,
          findingHash,
          unresolved: unresolved.length,
        }),
        createdAt: startedAt,
      })
      .run();

    return hydrateRun(db.select().from(runs).where(eq(runs.id, runId)).get()!);
  })();
}

export function addResolution(
  runId: string,
  claimId: string,
  action: "downgrade" | "fund_gap" | "accept_limitation",
  targetLevel: number | null,
  falsifier: string,
  note: string | null,
): RunView {
  const trimmed = falsifier.trim();
  if (trimmed.length < 40) {
    throw new Error("A falsifier must be at least 40 characters.");
  }
  const validated = checkFalsifier(trimmed);
  if (!validated.ok) {
    throw new Error(validated.reason ?? "FALSIFIER_NOT_OBSERVABLE");
  }
  if (targetLevel !== null && (!Number.isInteger(targetLevel) || targetLevel < 1 || targetLevel > 6)) {
    throw new Error("INVALID_TARGET_LEVEL");
  }

  return sqlite.transaction(() => {
    const run = db.select().from(runs).where(eq(runs.id, runId)).get();
    if (!run) throw new Error(`Unknown run: ${runId}`);

    // The claim must be one of this run's findings, and be resolved only once.
    const finding = db
      .select({ id: runFindings.id })
      .from(runFindings)
      .where(and(eq(runFindings.runId, runId), eq(runFindings.claimId, claimId)))
      .get();
    if (!finding) throw new Error("UNKNOWN_FINDING");
    const existing = db
      .select({ id: resolutions.id })
      .from(resolutions)
      .where(and(eq(resolutions.runId, runId), eq(resolutions.claimId, claimId)))
      .get();
    if (existing) throw new Error("ALREADY_RESOLVED");

    const now = Date.now();
    db.insert(resolutions)
      .values({
        id: nanoid(),
        runId,
        claimId,
        action,
        targetLevel,
        falsifier: trimmed,
        note,
        resolvedAt: now,
      })
      .run();

    const remaining = unresolvedClaimIds(runId);
    db.update(runs)
      .set({
        status: remaining.length === 0 ? "RESOLVED" : "BLOCKED",
      })
      .where(eq(runs.id, runId))
      .run();

    db.insert(events)
      .values({
        id: nanoid(),
        workspaceId: run.workspaceId,
        runId,
        type: "checkpoint.resolved",
        payloadJson: JSON.stringify({ claimId, action, remaining: remaining.length }),
        createdAt: now,
      })
      .run();

    return getRun(runId)!;
  })();
}

function unresolvedClaimIds(runId: string): string[] {
  const rows = db
    .select({ claimId: runFindings.claimId })
    .from(runFindings)
    .leftJoin(
      resolutions,
      and(
        eq(resolutions.runId, runFindings.runId),
        eq(resolutions.claimId, runFindings.claimId),
      ),
    )
    .where(
      and(eq(runFindings.runId, runId), sql`${runFindings.finding} <> 'SUPPORTED'`, isNull(resolutions.id)),
    )
    .all();
  return rows.map((row) => row.claimId);
}

export function exportGate(runId: string): { ok: boolean; unresolved: string[]; empty: boolean } {
  const unresolved = unresolvedClaimIds(runId);
  // A run with no findings certifies nothing, so it must never export as
  // "verified".
  const findingCount = db
    .select({ id: runFindings.id })
    .from(runFindings)
    .where(eq(runFindings.runId, runId))
    .all().length;
  return {
    ok: unresolved.length === 0 && findingCount > 0,
    unresolved,
    empty: findingCount === 0,
  };
}

export function markExported(runId: string): RunView {
  return sqlite.transaction(() => {
    const run = db.select().from(runs).where(eq(runs.id, runId)).get();
    if (!run) {
      throw new Error("UNKNOWN_RUN");
    }
    const gate = exportGate(runId);
    if (!gate.ok) throw new UnresolvedFindingsError(gate.unresolved);

    db.update(runs).set({ status: "EXPORTED" }).where(eq(runs.id, runId)).run();
    db.insert(events)
      .values({
        id: nanoid(),
        workspaceId: run.workspaceId,
        runId,
        type: "export.created",
        payloadJson: JSON.stringify({ findingHash: run.findingHash }),
        createdAt: Date.now(),
      })
      .run();
    return getRun(runId)!;
  })();
}

/**
 * Re-runs the arithmetic with a different provider and proves the finding hash
 * is byte-identical. Only prose can change; numbers cannot.
 */
export function recompute(
  runId: string,
  providerId: string,
  modelId: string,
): { run: RunView; identical: boolean } {
  const original = db.select().from(runs).where(eq(runs.id, runId)).get();
  if (!original) throw new Error(`Unknown run: ${runId}`);

  const fresh = createRun(
    db
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, original.workspaceId))
      .get()!.slug,
    providerId,
    modelId,
  );

  const identical = fresh.findingHash === original.findingHash;
  db.insert(events)
    .values({
      id: nanoid(),
      workspaceId: original.workspaceId,
      runId,
      type: identical ? "run.recompute_identical" : "run.recompute_diverged",
      payloadJson: JSON.stringify({
        from: original.providerId,
        to: providerId,
        findingHash: original.findingHash,
        newFindingHash: fresh.findingHash,
      }),
      createdAt: Date.now(),
    })
    .run();

  return { run: fresh, identical };
}

export function auditEvents(slug: string): AuditEventView[] {
  const workspace = loadWorkspace(slug);
  if (!workspace) return [];
  return db
    .select()
    .from(events)
    .where(eq(events.workspaceId, workspace.id))
    .orderBy(desc(events.createdAt))
    .limit(100)
    .all()
    .map((event) => ({
      id: event.id,
      type: event.type,
      payload: JSON.parse(event.payloadJson),
      createdAt: event.createdAt,
    }));
}

export function thresholdDefinitions(claimId: string): ThresholdView[] {
  return db
    .select()
    .from(claimThresholds)
    .where(eq(claimThresholds.claimId, claimId))
    .all()
    .map((row) => ({
      id: row.id,
      code: row.code,
      kind: row.kind,
      value: row.overridden && row.overrideValue !== null ? row.overrideValue : row.requiredValue,
      rationale: row.rationale,
      source: row.sourceRef,
      scope: row.scope,
      overridden: row.overridden,
    }));
}

export function listClaims(slug: string): ClaimView[] {
  const workspace = loadWorkspace(slug);
  if (!workspace) return [];
  return db
    .select()
    .from(claims)
    .where(eq(claims.workspaceId, workspace.id))
    .orderBy(claims.ordinal)
    .all()
    .map((row) => ({
      id: row.id,
      ordinal: row.ordinal,
      rawText: row.rawText,
      population: row.population,
      predicate: row.predicate,
      kind: row.kind,
      claimType: row.claimType as ClaimView["claimType"],
      claimedLevel: row.claimedLevel,
      observed:
        row.observedK !== null && row.observedN !== null
          ? { k: row.observedK, n: row.observedN }
          : null,
      precisionTolerance: row.precisionTolerance,
      confirmed: row.confirmedAt !== null,
      confirmedAt: row.confirmedAt,
      ambiguousFlags: row.ambiguityFlags
        ? (JSON.parse(row.ambiguityFlags) as string[])
        : [],
    }));
}

export interface CreateClaimInput {
  readonly rawText: string;
  readonly population: string;
  readonly predicate: string;
  readonly kind: string;
  readonly claimType: string;
  readonly claimedLevel: number;
  readonly observed: { readonly k: number; readonly n: number } | null;
  readonly precisionTolerance: number | null;
  readonly ambiguityFlags?: readonly string[];
}

export function createClaim(slug: string, input: CreateClaimInput): ClaimView {
  if (input.rawText.trim().length === 0) {
    throw new Error("A claim with no text cannot be confirmed.");
  }
  if (input.population.trim().length === 0) {
    throw new Error("A claim with no population cannot be confirmed.");
  }
  if (input.predicate.trim().length === 0) {
    throw new Error("A claim with no predicate cannot be confirmed.");
  }
  if (!Number.isInteger(input.claimedLevel) || input.claimedLevel < 1 || input.claimedLevel > 6) {
    throw new Error("Claimed level must be L1–L6.");
  }
  if (input.observed) {
    const { k, n } = input.observed;
    if (!Number.isInteger(k) || !Number.isInteger(n) || k < 0 || n <= 0 || k > n) {
      throw new Error("Observed counts must satisfy 0 <= k <= n and n > 0.");
    }
  }
  if (
    input.precisionTolerance !== null &&
    (!Number.isFinite(input.precisionTolerance) || input.precisionTolerance <= 0)
  ) {
    throw new Error("Precision tolerance must be a positive number.");
  }

  return sqlite.transaction(() => {
    const workspace = loadWorkspace(slug);
    if (!workspace) throw new Error(`Unknown workspace: ${slug}`);

    const existing = db
      .select({ ordinal: claims.ordinal })
      .from(claims)
      .where(eq(claims.workspaceId, workspace.id))
      .all();
    const ordinal = existing.length === 0 ? 0 : Math.max(...existing.map((row) => row.ordinal)) + 1;
    const claimId = nanoid();
    const now = Date.now();

    db.insert(claims)
      .values({
        id: claimId,
        workspaceId: workspace.id,
        ordinal,
        rawText: input.rawText,
        population: input.population,
        populationSpec: JSON.stringify({}),
        predicate: input.predicate,
        kind: input.kind,
        claimType: input.claimType,
        claimedLevel: input.claimedLevel,
        observedK: input.observed?.k ?? null,
        observedN: input.observed?.n ?? null,
        precisionTolerance: input.precisionTolerance,
        ambiguityFlags: JSON.stringify(input.ambiguityFlags ?? []),
        confirmedAt: now,
        createdAt: now,
      })
      .run();

    const newClaim = toClaim(
      db.select().from(claims).where(eq(claims.id, claimId)).get()!,
    );
    const { domain: existingEvidence } = loadEvidence(workspace.id);
    for (const row of existingEvidence) {
      db.insert(evidenceClaimTags)
        .values({
          id: contentHash([row.id, claimId]),
          evidenceId: row.id,
          claimId,
          bearsOn: true,
          polarity: "supports",
          inPopulation: isInPopulation(row, newClaim),
          populationMatchProducer: "rule",
          producer: "human",
          createdAt: now,
        })
        .onConflictDoNothing()
        .run();
    }

    db.insert(events)
      .values({
        id: nanoid(),
        workspaceId: workspace.id,
        type: "claim.confirmed",
        payloadJson: JSON.stringify({ claimId, source: "formalisation-ui" }),
        createdAt: now,
      })
      .run();

    return listClaims(slug).find((claim) => claim.id === claimId)!;
  })();
}

/** Aggregate "who was in the room" matrix across every interview in a workspace. */
export function workspaceMatrix(slug: string): MatrixView {
  const workspace = loadWorkspace(slug);
  if (!workspace) {
    return { segments: [], roles: [], cells: {}, totalRows: 0, totalOrgs: 0 };
  }
  const rows = db
    .select({
      segment: evidence.segment,
      role: evidence.role,
      orgRef: evidence.orgRef,
      alias: evidence.alias,
    })
    .from(evidence)
    .where(eq(evidence.workspaceId, workspace.id))
    .all();

  const cells: Record<string, { rows: number; orgs: number; aliases: readonly string[] }> = {};
  const segments = new Set<string>();
  const roles = new Set<string>();
  const orgsByCell = new Map<string, Set<string>>();
  const aliasesByCell = new Map<string, Set<string>>();

  for (const row of rows) {
    segments.add(row.segment);
    roles.add(row.role);
    const key = `${row.segment}::${row.role}`;
    cells[key] = { rows: (cells[key]?.rows ?? 0) + 1, orgs: 0, aliases: [] };
    const orgs = orgsByCell.get(key) ?? new Set<string>();
    orgs.add(row.orgRef);
    orgsByCell.set(key, orgs);
    const aliases = aliasesByCell.get(key) ?? new Set<string>();
    aliases.add(row.alias);
    aliasesByCell.set(key, aliases);
  }
  for (const [key, orgs] of orgsByCell) {
    cells[key] = {
      ...cells[key]!,
      orgs: orgs.size,
      aliases: [...(aliasesByCell.get(key) ?? [])].sort(),
    };
  }

  return {
    segments: [...segments].sort(),
    roles: ["economic", "technical", "user", "influencer", "none"].filter((role) => roles.has(role)),
    cells,
    totalRows: rows.length,
    totalOrgs: new Set(rows.map((row) => row.orgRef)).size,
  };
}

export function confirmClaim(claimId: string): void {
  const claim = db.select().from(claims).where(eq(claims.id, claimId)).get();
  if (!claim) throw new Error(`Unknown claim: ${claimId}`);
  db.update(claims)
    .set({ confirmedAt: Date.now() })
    .where(eq(claims.id, claimId))
    .run();
  db.insert(events)
    .values({
      id: nanoid(),
      workspaceId: claim.workspaceId,
      type: "claim.confirmed",
      payloadJson: JSON.stringify({ claimId }),
      createdAt: Date.now(),
    })
    .run();
}
