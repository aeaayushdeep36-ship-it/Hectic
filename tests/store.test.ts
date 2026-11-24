import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../db/seed-data";
import { sqlite } from "../db/client";
import { evidence, runs } from "../db/schema";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import {
  UnresolvedFindingsError,
  addResolution,
  createRun,
  exportGate,
  listRuns,
  listWorkspaces,
  markExported,
  recompute,
  importEvidence,
} from "../server/store";

const LONG_FALSIFIER =
  "The three prepayments were all from founders who already knew the team, so the L6 claim does not generalise.";

beforeAll(() => {
  seedDatabase();
});

afterAll(() => {
  sqlite.close();
});

describe("the database-backed checkpoint", () => {
  it("seeds four synthetic demo workspaces", () => {
    const workspaces = listWorkspaces();
    expect(workspaces).toHaveLength(4);
    expect(workspaces.every((workspace) => workspace.isDemo)).toBe(true);
  });

  it("blocks a run whose finding is not SUPPORTED", () => {
    const run = createRun("underpowered");
    expect(run.status).toBe("BLOCKED");
    expect(run.findings).toHaveLength(1);
    expect(run.findings[0]).toMatchObject({
      finding: "DOWNGRADE",
      level: 2,
      binding: "type",
    });
    expect(exportGate(run.id)).toEqual({
      ok: false,
      unresolved: [run.findings[0]!.claimId],
    });
    expect(() => markExported(run.id)).toThrow(UnresolvedFindingsError);
  });

  it("enforces the export gate in the database, not just the service", () => {
    const run = createRun("wrong-population");
    expect(() =>
      db.update(runs).set({ status: "EXPORTED" }).where(eq(runs.id, run.id)).run(),
    ).toThrow(/unresolved findings/);
  });

  it("requires a substantive falsifier before resolving", () => {
    const run = createRun("ambiguous");
    expect(() =>
      addResolution(
        run.id,
        run.findings[0]!.claimId,
        "downgrade",
        4,
        "too weak",
        null,
      ),
    ).toThrow(/at least 40 characters/);
  });

  it("allows export only after every finding is resolved", () => {
    const run = createRun("underpowered");
    const resolved = addResolution(
      run.id,
      run.findings[0]!.claimId,
      "fund_gap",
      4,
      LONG_FALSIFIER,
      "Need a concept conversation with a cold budget holder.",
    );
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.findings[0]!.resolution).toMatchObject({
      action: "fund_gap",
      targetLevel: 4,
    });
    expect(markExported(run.id).status).toBe("EXPORTED");
  });

  it("recomputes to a byte-identical finding hash under another provider", () => {
    const run = createRun("clean");
    const { identical, run: fresh } = recompute(
      run.id,
      "openai-compatible",
      "llama-3.1-8b",
    );
    expect(identical).toBe(true);
    expect(fresh.findingHash).toBe(run.findingHash);
    expect(fresh.findings.map((finding) => finding.level)).toEqual(
      run.findings.map((finding) => finding.level),
    );
  });

  it("keeps runs visible in the audit log", () => {
    const workspaces = listWorkspaces();
    const underpowered = workspaces.find((item) => item.slug === "underpowered")!;
    expect(listRuns("underpowered").length).toBeGreaterThanOrEqual(underpowered.runCount);
  });
});

const HEADER =
  "id,orgId,alias,segment,role,channel,relationship,evidenceType,date,durationMin,notes";
const GOOD_ROW =
  "imp-1,imp-org-1,AB,SMB retail,economic,linkedin,cold,2,2026-02-02,25,Email a@b.com about pricing";
const FORMULA_ROW =
  "imp-2,imp-org-2,CD,SMB retail,technical,conference,cold,3,2026-02-03,30,=cmd|calc notes";

describe("roster import", () => {
  it("rejects invalid rows with a line number instead of failing the file", () => {
    const csv = [HEADER, "bad-1,bad-org,EF,SMB retail,economic,linkedin,cold,9,2026-02-04,10,notes"].join("\n");
    const result = importEvidence("underpowered", csv);
    expect(result.imported).toBe(0);
    expect(result.errors[0]?.line).toBe(2);
  });

  it("redacts PII, strips formula prefixes and is idempotent", () => {
    const csv = [HEADER, GOOD_ROW, FORMULA_ROW].join("\n");
    const first = importEvidence("underpowered", csv);
    expect(first.imported).toBe(2);
    expect(first.redacted).toBe(2);

    const before = listWorkspaces().find((workspace) => workspace.slug === "underpowered")!.evidenceCount;
    const second = importEvidence("underpowered", csv);
    expect(second.imported).toBe(0);
    expect(second.duplicates).toBe(2);
    const after = listWorkspaces().find((workspace) => workspace.slug === "underpowered")!.evidenceCount;
    expect(after).toBe(before);

    const stored = db
      .select()
      .from(evidence)
      .where(eq(evidence.importBatch, first.batchId))
      .all();
    expect(stored).toHaveLength(2);
    expect(stored.every((row) => row.notesRaw === null)).toBe(true);
    expect(stored.some((row) => row.notesRedacted?.includes("[EMAIL]"))).toBe(true);
    expect(stored.every((row) => !/^=/.test(row.notesRedacted ?? ""))).toBe(true);
    expect(stored.every((row) => !row.notesRedacted?.includes("a@b.com"))).toBe(true);
  });
});
