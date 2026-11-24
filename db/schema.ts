/**
 * SQLite schema. The audit trail is part of the product, not an implementation
 * detail — see docs/03-database.md for the rationale behind every table.
 */
import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  contextNote: text("context_note"),
  isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
  archivedAt: integer("archived_at"),
});

export const claims = sqliteTable(
  "claims",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    rawText: text("raw_text").notNull(),
    population: text("population").notNull(),
    populationSpec: text("population_spec").notNull().default("{}"),
    predicate: text("predicate").notNull(),
    kind: text("kind").notNull(),
    claimType: text("claim_type").notNull(),
    claimedLevel: integer("claimed_level").notNull(),
    observedK: integer("observed_k"),
    observedN: integer("observed_n"),
    precisionTolerance: real("precision_tolerance"),
    proposedByAgent: integer("proposed_by_agent").notNull().default(1),
    modelProposal: text("model_proposal"),
    humanEditDiff: text("human_edit_diff"),
    ambiguityFlags: text("ambiguity_flags"),
    confirmedAt: integer("confirmed_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("claims_workspace_ordinal").on(table.workspaceId, table.ordinal),
    check("claims_level_range", sql`${table.claimedLevel} between 1 and 6`),
    check(
      "claims_type_valid",
      sql`${table.claimType} in ('theme','prevalence')`,
    ),
  ],
);

export const claimThresholds = sqliteTable(
  "claim_thresholds",
  {
    id: text("id").primaryKey(),
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    code: text("code").notNull(),
    scope: text("scope").notNull(),
    requiredValue: real("required_value").notNull(),
    rationale: text("rationale").notNull(),
    sourceRef: text("source_ref").notNull(),
    overridden: integer("overridden", { mode: "boolean" }).notNull().default(false),
    overrideValue: real("override_value"),
    overrideReason: text("override_reason"),
  },
  (table) => [
    uniqueIndex("claim_thresholds_unique").on(table.claimId, table.code, table.scope),
    check(
      "claim_thresholds_kind_valid",
      sql`${table.kind} in ('level','support','saturation','precision')`,
    ),
  ],
);

export const evidence = sqliteTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    interviewedAt: integer("interviewed_at").notNull(),
    role: text("role").notNull(),
    orgRef: text("org_ref").notNull(),
    segment: text("segment").notNull(),
    sourceChannel: text("source_channel").notNull(),
    relationship: text("relationship").notNull(),
    evidenceType: text("evidence_type").notNull(),
    durationMin: integer("duration_min"),
    notesRaw: text("notes_raw"),
    notesRedacted: text("notes_redacted"),
    importBatch: text("import_batch"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("evidence_workspace_segment").on(table.workspaceId, table.segment),
    index("evidence_workspace_org").on(table.workspaceId, table.orgRef),
    check(
      "evidence_role_valid",
      sql`${table.role} in ('economic','technical','user','influencer','none')`,
    ),
    check(
      "evidence_type_valid",
      sql`${table.evidenceType} in ('L1_internal','L2_stated','L3_concept','L4_commitment','L5_investment','L6_payment')`,
    ),
  ],
);

export const evidenceClaimTags = sqliteTable(
  "evidence_claim_tags",
  {
    id: text("id").primaryKey(),
    evidenceId: text("evidence_id")
      .notNull()
      .references(() => evidence.id, { onDelete: "cascade" }),
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    bearsOn: integer("bears_on", { mode: "boolean" }).notNull().default(true),
    polarity: text("polarity"),
    inPopulation: integer("in_population", { mode: "boolean" })
      .notNull()
      .default(false),
    populationMatchProducer: text("population_match_producer")
      .notNull()
      .default("rule"),
    producer: text("producer").notNull(),
    agentVersion: text("agent_version"),
    overriddenByUser: integer("overridden_by_user", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("tags_evidence_claim").on(table.evidenceId, table.claimId),
    index("tags_claim").on(table.claimId, table.bearsOn, table.polarity),
  ],
);

export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    engineVersion: text("engine_version").notNull(),
    thresholdVersion: text("threshold_version").notNull(),
    inputHash: text("input_hash").notNull(),
    findingHash: text("finding_hash"),
    providerId: text("provider_id"),
    modelId: text("model_id"),
    startedAt: integer("started_at").notNull(),
    finishedAt: integer("finished_at"),
    costEur: real("cost_eur").notNull().default(0),
    callCount: integer("call_count").notNull().default(0),
  },
  (table) => [
    index("runs_workspace_started").on(table.workspaceId, table.startedAt),
    index("runs_workspace_hash").on(table.workspaceId, table.inputHash),
    check(
      "runs_status_valid",
      sql`${table.status} in ('DRAFT','ANALYSED','BLOCKED','RESOLVED','EXPORTED','FAILED')`,
    ),
  ],
);

export const runFindings = sqliteTable(
  "run_findings",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    level: integer("level").notNull(),
    support: integer("support").notNull(),
    breadth: integer("breadth").notNull(),
    saturation: text("saturation"),
    intervalJson: text("interval_json"),
    finding: text("finding").notNull(),
    bindingCode: text("binding_code"),
    coverageJson: text("coverage_json").notNull(),
    diagnosticsJson: text("diagnostics_json").notNull(),
    explanation: text("explanation"),
  },
  (table) => [
    uniqueIndex("run_findings_run_claim").on(table.runId, table.claimId),
    check("findings_level_range", sql`${table.level} between 1 and 6`),
    check("findings_breadth", sql`${table.breadth} >= ${table.support}`),
    check(
      "findings_kind_valid",
      sql`${table.finding} in ('SUPPORTED','DOWNGRADE','IMPRECISE','WRONG_POPULATION','UNTOUCHED')`,
    ),
  ],
);

export const resolutions = sqliteTable(
  "resolutions",
  {
    id: text("id").primaryKey(),
    runId: text("run_id")
      .notNull()
      .references(() => runs.id, { onDelete: "cascade" }),
    claimId: text("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    targetLevel: integer("target_level"),
    falsifier: text("falsifier").notNull(),
    note: text("note"),
    resolvedAt: integer("resolved_at").notNull(),
  },
  (table) => [
    uniqueIndex("resolutions_run_claim").on(table.runId, table.claimId),
    check("resolutions_falsifier_length", sql`length(trim(${table.falsifier})) >= 40`),
    check(
      "resolutions_action_valid",
      sql`${table.action} in ('downgrade','fund_gap','accept_limitation')`,
    ),
  ],
);

export const modelCalls = sqliteTable(
  "model_calls",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").references(() => runs.id, { onDelete: "cascade" }),
    agent: text("agent").notNull(),
    promptVersion: text("prompt_version").notNull(),
    providerId: text("provider_id").notNull(),
    modelId: text("model_id").notNull(),
    inputHash: text("input_hash").notNull(),
    promptTokens: integer("prompt_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    ok: integer("ok", { mode: "boolean" }).notNull().default(true),
    errorCode: text("error_code"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("model_calls_run").on(table.runId),
    index("model_calls_cache").on(table.inputHash, table.agent, table.promptVersion),
  ],
);

export const events = sqliteTable(
  "events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    runId: text("run_id"),
    type: text("type").notNull(),
    payloadJson: text("payload_json").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("events_workspace_created").on(table.workspaceId, table.createdAt)],
);

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type ClaimRow = typeof claims.$inferSelect;
export type EvidenceRowDb = typeof evidence.$inferSelect;
export type RunRow = typeof runs.$inferSelect;
export type RunFindingRow = typeof runFindings.$inferSelect;
