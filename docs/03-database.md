# 03 — Database

SQLite via `better-sqlite3`, schema and migrations via Drizzle ORM. One file. No server.

---

## 1. Why a database at all

The obvious alternative is JSON files. Rejected for one reason: **the audit trail is part of the product.**

A judge asking "how do I know the model didn't make this up?" needs to be able to see: which run produced this finding, which prompt version, which provider, which thresholds were in force, and whether a human overrode anything. That is a temporal record with foreign keys. Files would mean hand-rolling transactions and referential integrity for no benefit.

SQLite also lets the seeded demo ship as a single committed `.db` file, so the app has content before the judge types anything.

---

## 2. Entity relationship

```
workspaces ──┬── claims ──── claim_thresholds
             │      │
             │      └────── resolutions ──┐
             │                            │
             ├── evidence ──── evidence_claim_tags
             │                            │
             └── runs ─────── run_findings┘
                    │
                    ├── model_calls
                    └── events
```

---

## 3. Schema

### 3.1 `workspaces`

```sql
CREATE TABLE workspaces (
  id            TEXT PRIMARY KEY,          -- nanoid
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  context_note  TEXT,                      -- one line: what the founder is building
  created_at    INTEGER NOT NULL,          -- unix ms
  archived_at   INTEGER
);
```

### 3.2 `claims`

```sql
CREATE TABLE claims (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  ordinal           INTEGER NOT NULL,
  raw_text          TEXT NOT NULL,
  population        TEXT NOT NULL,
  predicate         TEXT NOT NULL,
  kind              TEXT NOT NULL CHECK (kind IN (
                      'pain','frequency','willingness_to_pay',
                      'role_ownership','displacement','retention','comparative')),
  claim_type        TEXT NOT NULL CHECK (claim_type IN ('theme','prevalence')),
  claimed_level     INTEGER NOT NULL CHECK (claimed_level BETWEEN 1 AND 6),

  -- provenance of the formalisation
  proposed_by_agent INTEGER NOT NULL DEFAULT 1,   -- 0 = human wrote it directly
  model_proposal    TEXT,                          -- JSON, the raw proposal
  human_edit_diff   TEXT,                          -- JSON, what the founder changed
  ambiguity_flags   TEXT,                          -- JSON array
  confirmed_at      INTEGER,

  created_at        INTEGER NOT NULL,
  UNIQUE (workspace_id, ordinal)
);

CREATE INDEX idx_claims_workspace ON claims(workspace_id, ordinal);
```

`confirmed_at IS NULL` means the claim is a draft and cannot be analysed. This is the DB-level expression of "the human confirms."

### 3.3 `claim_thresholds`

Materialised, not computed on read. Reason: if the threshold table changes in v1.2, historical findings must still show the thresholds that were in force when they were computed.

```sql
CREATE TABLE claim_thresholds (
  id             TEXT PRIMARY KEY,
  claim_id       TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL CHECK (kind IN (
                   'level','support','saturation','precision')),
  code           TEXT NOT NULL,      -- SATURATION_BASIC, SATURATION_CODE,
                                     -- SATURATION_MEANING, WILSON_Z, ...
  scope          TEXT NOT NULL,      -- 'theme' | 'prevalence' | 'all'
  required_value REAL NOT NULL,
  rationale      TEXT NOT NULL,
  source_ref     TEXT NOT NULL,
  overridden     INTEGER NOT NULL DEFAULT 0,
  override_value REAL,
  override_reason TEXT,
  UNIQUE (claim_id, code, scope)
);
```

The `kind` column is load-bearing. A saturation count and a precision target are different kinds of threshold and must never be substituted for one another in the UI or the export.

**Deliberately absent:** `MIN_CHANNELS` and `MAX_NETWORK_SHARE`. Those heuristics had no direct source and the old L1 channel rule nullified four prepayments in testing. Channel and network composition are stored and displayed as diagnostics on `run_findings.diagnostics_json`, never as gates.

`engine_version` and `threshold_version` are also stored on the run (below), so a finding is reproducible against the exact rule set that produced it.

### 3.4 `evidence`

```sql
CREATE TABLE evidence (
  id              TEXT PRIMARY KEY,
  workspace_id    TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  alias           TEXT NOT NULL,
  interviewed_at  INTEGER NOT NULL,
  role            TEXT NOT NULL,
  seniority       TEXT,
  org_ref         TEXT NOT NULL,          -- hashed at import, see §5
  org_size        TEXT,
  segment         TEXT NOT NULL,
  country         TEXT,
  source_channel  TEXT NOT NULL CHECK (source_channel IN (
                    'network','linkedin','community','panel','event','inbound','other')),
  relationship    TEXT NOT NULL CHECK (relationship IN (
                    'stranger','acquaintance','friend','family','colleague')),
  budget_authority TEXT NOT NULL CHECK (budget_authority IN (
                    'economic','technical','user','influencer','none')),
  duration_min    INTEGER,
  evidence_type   TEXT NOT NULL CHECK (evidence_type IN (
                    'L1_internal','L2_stated','L3_concept',
                    'L4_commitment','L5_investment','L6_payment')),
                  -- from the roster CSV, entered by the founder. Never model-produced.
  notes_raw       TEXT,
  notes_redacted  TEXT,
  import_batch    TEXT,
  created_at      INTEGER NOT NULL
);

CREATE INDEX idx_evidence_workspace ON evidence(workspace_id, segment);
CREATE INDEX idx_evidence_org       ON evidence(workspace_id, org_ref);
```

`org_ref` is `sha256(lower(trim(org_name)) + workspace_id)` truncated to 16 hex chars. Independence counting works; the real company name is never stored. See §5.

### 3.5 `evidence_claim_tags`

```sql
CREATE TABLE evidence_claim_tags (
  id              TEXT PRIMARY KEY,
  evidence_id     TEXT NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  claim_id        TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  bears_on        INTEGER NOT NULL,        -- 0 | 1
  polarity        TEXT CHECK (polarity IN ('supports','contradicts','ambiguous')),
  in_population   INTEGER NOT NULL DEFAULT 0, -- rule-derived, human-overridable
  population_match_producer TEXT NOT NULL DEFAULT 'rule'
                    CHECK (population_match_producer IN ('rule','human')),
  producer        TEXT NOT NULL CHECK (producer IN ('agent','human')),
  agent_version   TEXT,
  overridden_by_user INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  UNIQUE (evidence_id, claim_id)
);

CREATE INDEX idx_tags_claim ON evidence_claim_tags(claim_id, bears_on, polarity);
```

### 3.6 `runs`

```sql
CREATE TABLE runs (
  id                TEXT PRIMARY KEY,
  workspace_id      TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  status            TEXT NOT NULL CHECK (status IN (
                      'DRAFT','ANALYSED','BLOCKED','RESOLVED','EXPORTED','FAILED')),
  engine_version    TEXT NOT NULL,
  threshold_version TEXT NOT NULL,
  input_hash        TEXT NOT NULL,
  finding_hash      TEXT,                  -- sha256 of canonical findings
  provider_id       TEXT,
  model_id          TEXT,
  started_at        INTEGER NOT NULL,
  finished_at       INTEGER,
  cost_eur          REAL NOT NULL DEFAULT 0,
  call_count        INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_runs_workspace ON runs(workspace_id, started_at DESC);
CREATE INDEX idx_runs_hash      ON runs(workspace_id, input_hash);
```

`finding_hash` is what makes the determinism claim checkable. Two runs with different `provider_id` and identical `finding_hash` is the proof.

### 3.7 `run_findings`

```sql
CREATE TABLE run_findings (
  id                 TEXT PRIMARY KEY,
  run_id             TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  claim_id           TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  level              INTEGER NOT NULL CHECK (level BETWEEN 1 AND 6),
  support            INTEGER NOT NULL CHECK (support >= 0),
  breadth            INTEGER NOT NULL CHECK (breadth >= support),
  saturation         TEXT CHECK (saturation IN (
                       'insufficient','basic','code','meaning')),
  interval_json      TEXT,                 -- [lo, hi, width], prevalence claims only
  finding            TEXT NOT NULL CHECK (finding IN (
                       'SUPPORTED','DOWNGRADE','IMPRECISE',
                       'WRONG_POPULATION','UNTOUCHED')),
  binding_code       TEXT CHECK (binding_code IN (
                       'population','type','support')),
  coverage_json      TEXT NOT NULL,        -- JSON: matrix + totals used
  diagnostics_json   TEXT NOT NULL,        -- channel spread, network chain; never gates
  explanation        TEXT,                 -- agent prose, nullable
  UNIQUE (run_id, claim_id)
);
```

`coverage_json` snapshots every number the verdict was computed from. A judge can recompute `level`, `support`, and the interval by hand from this column alone. That is deliberate. `diagnostics_json` is kept beside it but explicitly separated: those numbers inform the founder and never move the verdict.

### 3.8 `resolutions`

```sql
CREATE TABLE resolutions (
  id          TEXT PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  claim_id    TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN (
                'downgrade','fund_gap','accept_limitation')),
  target_level INTEGER CHECK (target_level IS NULL OR target_level BETWEEN 1 AND 6),
  falsifier   TEXT NOT NULL CHECK (length(trim(falsifier)) >= 40),
  note        TEXT,
  resolved_at INTEGER NOT NULL,
  UNIQUE (run_id, claim_id)
);
```

The `CHECK` on falsifier length is duplicated in the UI and the route handler. Three layers, deliberately — a database constraint is the only one a determined user cannot bypass with devtools.

### 3.9 `model_calls`

```sql
CREATE TABLE model_calls (
  id            TEXT PRIMARY KEY,
  run_id        TEXT REFERENCES runs(id) ON DELETE CASCADE,
  agent         TEXT NOT NULL,            -- claim-formaliser | relevance-tagger | ...
  prompt_version TEXT NOT NULL,
  provider_id   TEXT NOT NULL,
  model_id      TEXT NOT NULL,
  input_hash    TEXT NOT NULL,
  prompt_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms    INTEGER,
  ok            INTEGER NOT NULL,
  error_code    TEXT,
  created_at    INTEGER NOT NULL
);

CREATE INDEX idx_calls_run ON model_calls(run_id);
CREATE INDEX idx_calls_cache ON model_calls(input_hash, agent, prompt_version);
```

### 3.10 `events` — audit log

```sql
CREATE TABLE events (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  run_id       TEXT,
  type         TEXT NOT NULL,   -- claim.confirmed, evidence.imported,
                                -- tag.overridden, threshold.overridden,
                                -- checkpoint.resolved, export.blocked,
                                -- export.created, guard.injection_flagged
  payload_json TEXT NOT NULL,
  created_at   INTEGER NOT NULL
);

CREATE INDEX idx_events_workspace ON events(workspace_id, created_at DESC);
```

Append-only. Never updated, never deleted. This is the table the Responsible AI section points at.

---

## 4. Transition integrity

The state machine from `08-architecture.md` §5 is enforced in the orchestrator, but three constraints are enforced in the DB as a second line:

```sql
-- A run cannot be EXPORTED while any non-SUPPORTED finding lacks a resolution.
CREATE TRIGGER trg_export_requires_resolution
BEFORE UPDATE OF status ON runs
WHEN NEW.status = 'EXPORTED'
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM run_findings f
    LEFT JOIN resolutions r
      ON r.run_id = f.run_id AND r.claim_id = f.claim_id
    WHERE f.run_id = NEW.id
      AND f.finding <> 'SUPPORTED'
      AND r.id IS NULL
  ) THEN RAISE(ABORT, 'unresolved findings') END;
END;
```

---

## 5. Privacy decisions

| Decision | Rationale |
|---|---|
| `org_ref` hashed, not stored | Independence counting needs distinctness, not identity. |
| Aliases required, real names discouraged | The product never needs a name. UI copy asks for `P1`–`P20`. |
| `notes_redacted` is what leaves the process | `notes_raw` never crosses the provider boundary (`04-security.md`). |
| No `email`, `phone`, or address column exists | The safest schema is one with nowhere to put the data. |
| Export omits `notes` entirely | The statement is a summary, not a transcript. |
| `npm run db:reset` deletes the file | One command to a clean state; no soft-delete illusion. |

**GDPR posture:** the tool processes data about the founder's interviewees, so the founder is the controller and Hectic is a local processor. Because it runs locally with no account and no telemetry, no data transfer to Hectic occurs at all. This is a genuine compliance advantage of the local-first design and should be stated in the submission.

---

## 6. Migrations and seeding

```
db/
├── schema.ts              Drizzle table definitions
├── migrations/            generated SQL, committed
├── seed/
│   ├── underpowered.json
│   ├── clean.json
│   └── wrong-population.json
└── client.ts              singleton, WAL mode, foreign_keys ON
```

- Migrations generated by `drizzle-kit generate`, committed, applied on boot.
- `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`
- Seed data is synthetic and labelled as such in the UI (`demo` badge on every seeded workspace). Judges must never mistake demo evidence for real evidence.
- The three seed workspaces map exactly to the three go/no-go fixtures, so the demo and the tests exercise the same data.

---

## 7. Query patterns to watch

| Pattern | Risk | Mitigation |
|---|---|---|
| Load workspace with claims + evidence + tags | N+1 across 20 rows | Three explicit queries, joined in memory |
| Recompute on every keystroke | Recomputes whole workspace | Engine is pure; memoise by `input_hash` |
| List runs for a workspace | Unbounded growth | Index on `(workspace_id, started_at DESC)`, limit 20 |
| Export rendering | N+1 through findings → claims | Single query with `run_findings` join |

None of these matter at demo scale. All of them matter if a judge imports 200 rows to test the limits, which at least one will.
