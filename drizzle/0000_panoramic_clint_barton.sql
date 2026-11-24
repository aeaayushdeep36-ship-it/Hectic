CREATE TABLE `claim_thresholds` (
	`id` text PRIMARY KEY NOT NULL,
	`claim_id` text NOT NULL,
	`kind` text NOT NULL,
	`code` text NOT NULL,
	`scope` text NOT NULL,
	`required_value` real NOT NULL,
	`rationale` text NOT NULL,
	`source_ref` text NOT NULL,
	`overridden` integer DEFAULT false NOT NULL,
	`override_value` real,
	`override_reason` text,
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "claim_thresholds_kind_valid" CHECK("claim_thresholds"."kind" in ('level','support','saturation','precision'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claim_thresholds_unique` ON `claim_thresholds` (`claim_id`,`code`,`scope`);--> statement-breakpoint
CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`raw_text` text NOT NULL,
	`population` text NOT NULL,
	`population_spec` text DEFAULT '{}' NOT NULL,
	`predicate` text NOT NULL,
	`kind` text NOT NULL,
	`claim_type` text NOT NULL,
	`claimed_level` integer NOT NULL,
	`observed_k` integer,
	`observed_n` integer,
	`precision_tolerance` real,
	`proposed_by_agent` integer DEFAULT 1 NOT NULL,
	`model_proposal` text,
	`human_edit_diff` text,
	`ambiguity_flags` text,
	`confirmed_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "claims_level_range" CHECK("claims"."claimed_level" between 1 and 6),
	CONSTRAINT "claims_type_valid" CHECK("claims"."claim_type" in ('theme','prevalence'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claims_workspace_ordinal` ON `claims` (`workspace_id`,`ordinal`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`run_id` text,
	`type` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `events_workspace_created` ON `events` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`alias` text NOT NULL,
	`interviewed_at` integer NOT NULL,
	`role` text NOT NULL,
	`org_ref` text NOT NULL,
	`segment` text NOT NULL,
	`source_channel` text NOT NULL,
	`relationship` text NOT NULL,
	`evidence_type` text NOT NULL,
	`duration_min` integer,
	`notes_raw` text,
	`notes_redacted` text,
	`import_batch` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "evidence_role_valid" CHECK("evidence"."role" in ('economic','technical','user','influencer','none')),
	CONSTRAINT "evidence_type_valid" CHECK("evidence"."evidence_type" in ('L1_internal','L2_stated','L3_concept','L4_commitment','L5_investment','L6_payment'))
);
--> statement-breakpoint
CREATE INDEX `evidence_workspace_segment` ON `evidence` (`workspace_id`,`segment`);--> statement-breakpoint
CREATE INDEX `evidence_workspace_org` ON `evidence` (`workspace_id`,`org_ref`);--> statement-breakpoint
CREATE TABLE `evidence_claim_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`evidence_id` text NOT NULL,
	`claim_id` text NOT NULL,
	`bears_on` integer DEFAULT true NOT NULL,
	`polarity` text,
	`in_population` integer DEFAULT false NOT NULL,
	`population_match_producer` text DEFAULT 'rule' NOT NULL,
	`producer` text NOT NULL,
	`agent_version` text,
	`overridden_by_user` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_evidence_claim` ON `evidence_claim_tags` (`evidence_id`,`claim_id`);--> statement-breakpoint
CREATE INDEX `tags_claim` ON `evidence_claim_tags` (`claim_id`,`bears_on`,`polarity`);--> statement-breakpoint
CREATE TABLE `model_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text,
	`agent` text NOT NULL,
	`prompt_version` text NOT NULL,
	`provider_id` text NOT NULL,
	`model_id` text NOT NULL,
	`input_hash` text NOT NULL,
	`prompt_tokens` integer,
	`output_tokens` integer,
	`latency_ms` integer,
	`ok` integer DEFAULT true NOT NULL,
	`error_code` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `model_calls_run` ON `model_calls` (`run_id`);--> statement-breakpoint
CREATE INDEX `model_calls_cache` ON `model_calls` (`input_hash`,`agent`,`prompt_version`);--> statement-breakpoint
CREATE TABLE `resolutions` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`claim_id` text NOT NULL,
	`action` text NOT NULL,
	`target_level` integer,
	`falsifier` text NOT NULL,
	`note` text,
	`resolved_at` integer NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "resolutions_falsifier_length" CHECK(length(trim("resolutions"."falsifier")) >= 40),
	CONSTRAINT "resolutions_action_valid" CHECK("resolutions"."action" in ('downgrade','fund_gap','accept_limitation'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `resolutions_run_claim` ON `resolutions` (`run_id`,`claim_id`);--> statement-breakpoint
CREATE TABLE `run_findings` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`claim_id` text NOT NULL,
	`level` integer NOT NULL,
	`support` integer NOT NULL,
	`breadth` integer NOT NULL,
	`saturation` text,
	`interval_json` text,
	`finding` text NOT NULL,
	`binding_code` text,
	`coverage_json` text NOT NULL,
	`diagnostics_json` text NOT NULL,
	`explanation` text,
	FOREIGN KEY (`run_id`) REFERENCES `runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "findings_level_range" CHECK("run_findings"."level" between 1 and 6),
	CONSTRAINT "findings_breadth" CHECK("run_findings"."breadth" >= "run_findings"."support"),
	CONSTRAINT "findings_kind_valid" CHECK("run_findings"."finding" in ('SUPPORTED','DOWNGRADE','IMPRECISE','WRONG_POPULATION','UNTOUCHED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `run_findings_run_claim` ON `run_findings` (`run_id`,`claim_id`);--> statement-breakpoint
CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`status` text NOT NULL,
	`engine_version` text NOT NULL,
	`threshold_version` text NOT NULL,
	`input_hash` text NOT NULL,
	`finding_hash` text,
	`provider_id` text,
	`model_id` text,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`cost_eur` real DEFAULT 0 NOT NULL,
	`call_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "runs_status_valid" CHECK("runs"."status" in ('DRAFT','ANALYSED','BLOCKED','RESOLVED','EXPORTED','FAILED'))
);
--> statement-breakpoint
CREATE INDEX `runs_workspace_started` ON `runs` (`workspace_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `runs_workspace_hash` ON `runs` (`workspace_id`,`input_hash`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`context_note` text,
	`is_demo` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_slug_unique` ON `workspaces` (`slug`);
--> statement-breakpoint
-- The database is the last line of defence for the checkpoint: even a direct
-- UPDATE cannot mark a run EXPORTED while a non-SUPPORTED finding is unresolved.
CREATE TRIGGER `trg_export_requires_resolution`
BEFORE UPDATE OF `status` ON `runs`
WHEN NEW.`status` = 'EXPORTED'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM `run_findings` f
    LEFT JOIN `resolutions` r
      ON r.`run_id` = f.`run_id` AND r.`claim_id` = f.`claim_id`
    WHERE f.`run_id` = NEW.`id`
      AND f.`finding` <> 'SUPPORTED'
      AND r.`id` IS NULL
  ) THEN RAISE(ABORT, 'unresolved findings') END;
END;