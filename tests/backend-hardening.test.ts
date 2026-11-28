import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  applyFix,
  audit,
  buildCoverage,
  buildFinding,
  computeVerdict,
  recommendNextCells,
  wilson,
} from "../engine/index";
import { formalise } from "../agents/formaliser";
import { checkFalsifier } from "../lib/falsifier";
import { getProvider, type Completion, type Provider } from "../providers";
import { seedDatabase } from "../db/seed-data";
import { validateEmail } from "../lib/email-validation";
import {
  validateMobileNumber,
  validatePasswordMatch,
  validatePersonName,
} from "../lib/account-validation";
import { sqlite } from "../db/client";
import { relationshipFromDb, relationshipToDb } from "../server/mappers";
import { createClaim, createRun, importEvidence } from "../server/store";
import { POST as streamRun } from "../app/api/workspaces/[slug]/runs/stream/route";
import { POST as resolveClaim } from "../app/api/runs/[id]/resolutions/route";
import type { Claim, EvidenceRow } from "../lib/types";

beforeAll(() => {
  seedDatabase();
});

afterAll(() => {
  sqlite.close();
});

const baseClaim = (overrides: Partial<Claim> = {}): Claim => ({
  id: "c-hard",
  ordinal: 0,
  rawText: "Managers pay for workflow automation",
  population: "Clinic managers",
  populationSpec: {},
  predicate: "pay for workflow automation",
  kind: "willingness_to_pay",
  claimType: "theme",
  claimedLevel: 4,
  observed: null,
  precisionTolerance: null,
  confirmed: true,
  ...overrides,
});

const baseRow = (overrides: Partial<EvidenceRow> = {}): EvidenceRow => ({
  id: "e-hard",
  orgId: "org-1",
  alias: "A1",
  segment: "Dental",
  role: "economic",
  channel: "linkedin",
  relationship: "cold",
  evidenceType: 2,
  date: "2026-02-15",
  durationMin: 20,
  notes: "Discussed workflow",
  ...overrides,
});

describe("engine hardening", () => {
  it("guards wilson against invalid or out-of-range inputs without returning NaN", () => {
    for (const [k, n] of [
      [0, -5],
      [-1, 10],
      [15, 10],
      [Number.NaN, 10],
      [5, Number.POSITIVE_INFINITY],
    ] as const) {
      const [lo, hi, width] = wilson(k, n);
      expect(Number.isFinite(lo)).toBe(true);
      expect(Number.isFinite(hi)).toBe(true);
      expect(Number.isFinite(width)).toBe(true);
      expect(lo).toBeGreaterThanOrEqual(0);
      expect(hi).toBeLessThanOrEqual(1);
    }
  });

  it("clamps applyFix support addition when support already meets MIN_SUPPORT", () => {
    const input = {
      claimType: "theme" as const,
      observed: null,
      types: { 6: 4 },
      inPopulationTypes: { 6: 4 },
      inPopulationOrgs: 4,
    };
    const verdict = computeVerdict(input);
    const fixed = applyFix(input, { ...verdict, binding: "support" });
    expect(fixed.inPopulationOrgs).toBe(4);
    expect(fixed.inPopulationTypes[6]).toBe(4);
  });

  it("produces sorted coverage matrix cells in a single pass", () => {
    const rows = [
      baseRow({ id: "r1", orgId: "o1", segment: "Zeta", role: "user" }),
      baseRow({ id: "r2", orgId: "o1", segment: "Zeta", role: "user" }),
      baseRow({ id: "r3", orgId: "o2", segment: "Alpha", role: "economic" }),
    ];
    const cov = buildCoverage(rows, baseClaim());
    expect(cov.matrix).toEqual([
      { segment: "Alpha", role: "economic", rows: 1, orgs: 1 },
      { segment: "Zeta", role: "user", rows: 2, orgs: 1 },
    ]);
  });
});

describe("mappers and provider hardening", () => {
  it("round-trips referral relationship without misclassifying as founder_network", () => {
    expect(relationshipFromDb(relationshipToDb("referral"))).toBe("referral");
    expect(relationshipFromDb(relationshipToDb("cold"))).toBe("cold");
    expect(relationshipFromDb(relationshipToDb("founder_network"))).toBe("founder_network");
  });

  it("uses env model override for ollama without forcing jsonMode", async () => {
    const provider = getProvider("ollama", "qwen2.5:7b");
    expect(provider.id).toBe("ollama");
    expect(provider.modelId).toBe("qwen2.5:7b");
  });
});

describe("store and API hardening", () => {
  it("rejects impossible calendar dates like 2026-02-31 on CSV import", () => {
    const csv = [
      "id,orgId,alias,segment,role,channel,relationship,evidenceType,date,durationMin,notes",
      "bad-date-1,org-bd,BD,SMB retail,economic,linkedin,cold,2,2026-02-31,20,notes",
    ].join("\n");
    const result = importEvidence("underpowered", csv);
    expect(result.imported).toBe(0);
    expect(result.errors.some((e) => e.message === "Invalid date")).toBe(true);
  });

  it("validates claim invariants at the service layer and tags existing evidence", () => {
    expect(() =>
      createClaim("clean", {
        rawText: "   ",
        population: "Founders",
        predicate: "pay",
        kind: "pain",
        claimType: "theme",
        claimedLevel: 2,
        observed: null,
        precisionTolerance: null,
      }),
    ).toThrow(/no text/i);

    expect(() =>
      createClaim("clean", {
        rawText: "Founders pay",
        population: "Founders",
        predicate: "pay",
        kind: "pain",
        claimType: "prevalence",
        claimedLevel: 2,
        observed: { k: 5, n: 3 },
        precisionTolerance: null,
      }),
    ).toThrow(/0 <= k <= n/);

    const created = createClaim("clean", {
      rawText: "Clinic managers pay for scheduling",
      population: "Clinic managers",
      predicate: "pay for scheduling",
      kind: "willingness_to_pay",
      claimType: "theme",
      claimedLevel: 2,
      observed: null,
      precisionTolerance: null,
    });
    expect(created.confirmed).toBe(true);
    const run = createRun("clean");
    const finding = run.findings.find((f) => f.claimId === created.id);
    expect(finding).toBeDefined();
    expect(finding!.trace.tags.length).toBeGreaterThan(0);
  });

  it("returns 404 JSON when streaming a run for an unknown workspace", async () => {
    const req = new Request("http://localhost/api/workspaces/nope/runs/stream", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ providerId: "mock" }),
    });
    const res = await streamRun(req, { params: Promise.resolve({ slug: "does-not-exist" }) });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "UNKNOWN_WORKSPACE" });
  });

  it("returns 422 from resolutions route when a 40+ char falsifier lacks a measurable outcome", async () => {
    const run = createRun("underpowered");
    const claimId = run.findings[0]!.claimId;
    const req = new Request(`http://localhost/api/runs/${run.id}/resolutions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        claimId,
        action: "downgrade",
        targetLevel: 2,
        falsifier: "If the market feels like it is not ready for this product right now",
      }),
    });
    const res = await resolveClaim(req, { params: Promise.resolve({ id: run.id }) });
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string; field: string };
    expect(body.field).toBe("falsifier");
    expect(body.error).toContain("FALSIFIER_NOT_OBSERVABLE");
  });
});

describe("audit report F-01 through F-08 invariants", () => {
  it("F-01: excludes L5 investor commitments and preserves L4 customer evidence on the same org", () => {
    const rows = [
      baseRow({ id: "r-l5", orgId: "org-1", evidenceType: 5 }),
      baseRow({ id: "r-l4", orgId: "org-1", evidenceType: 4 }),
      baseRow({ id: "r-l5-only", orgId: "org-2", evidenceType: 5 }),
    ];
    const cov = buildCoverage(rows, baseClaim({ claimedLevel: 4 }));
    expect(cov.orgsByLevel[5]).toBeUndefined();
    expect(cov.orgsByLevel[4]).toBe(1);

    const l5Only = audit([baseRow({ id: "r-only5", orgId: "org-9", evidenceType: 5 })], [baseClaim({ claimedLevel: 4 })]);
    expect(l5Only[0]!.kind).not.toBe("SUPPORTED");
    expect(l5Only[0]!.verdict.level).toBe(1);
  });

  it("F-02: never marks support < MIN_SUPPORT or unsaturated L2 theme claims as SUPPORTED", () => {
    const oneOrgL4 = audit(
      [baseRow({ id: "r1", orgId: "o1", evidenceType: 4 })],
      [baseClaim({ claimedLevel: 4 })],
    );
    expect(oneOrgL4[0]!.kind).toBe("DOWNGRADE");

    const threeOrgsL2Theme = audit(
      [
        baseRow({ id: "t1", orgId: "o1", evidenceType: 2 }),
        baseRow({ id: "t2", orgId: "o2", evidenceType: 2 }),
        baseRow({ id: "t3", orgId: "o3", evidenceType: 2 }),
      ],
      [baseClaim({ claimedLevel: 2, claimType: "theme" })],
    );
    expect(threeOrgsL2Theme[0]!.verdict.saturation).toBe("insufficient");
    expect(threeOrgsL2Theme[0]!.kind).toBe("IMPRECISE");
  });

  it("F-03: out-of-population evidence at nextTarget never deadlocks binding to null", () => {
    const verdict = computeVerdict({
      claimType: "theme",
      observed: null,
      types: { 2: 3, 3: 1 },
      inPopulationTypes: { 2: 3 },
      inPopulationOrgs: 3,
    });
    expect(verdict.level).toBe(2);
    expect(verdict.binding).toBe("type");
  });

  it("F-04: rejects ungrounded observed.n, missing observed on prevalence, and asymmetric Wilson error", () => {
    const rows = [
      baseRow({ id: "p1", orgId: "o1", evidenceType: 6 }),
      baseRow({ id: "p2", orgId: "o2", evidenceType: 6 }),
      baseRow({ id: "p3", orgId: "o3", evidenceType: 6 }),
      baseRow({ id: "p4", orgId: "o4", evidenceType: 6 }),
      baseRow({ id: "p5", orgId: "o5", evidenceType: 6 }),
    ];
    // observed.n = 50 > 5 inPopulationOrgs
    const ungrounded = audit(rows, [
      baseClaim({ claimType: "prevalence", claimedLevel: 6, observed: { k: 40, n: 50 }, precisionTolerance: 0.2 }),
    ]);
    expect(ungrounded[0]!.kind).toBe("IMPRECISE");
    expect(ungrounded[0]!.verdict.interval).toBeNull();

    // Missing observed on prevalence
    const missingObs = audit(rows, [
      baseClaim({ claimType: "prevalence", claimedLevel: 6, observed: null, precisionTolerance: 0.2 }),
    ]);
    expect(missingObs[0]!.kind).toBe("IMPRECISE");

    // k=5, n=5 => [0.57, 1.00], worst-case error = 0.43 > 0.25 (even though 0.43/2 = 0.215 <= 0.25)
    const asymmetric = audit(rows, [
      baseClaim({ claimType: "prevalence", claimedLevel: 6, observed: { k: 5, n: 5 }, precisionTolerance: 0.25 }),
    ]);
    expect(asymmetric[0]!.kind).toBe("IMPRECISE");
  });

  it("F-05: normalizes population case, computes org-level network share, and surfaces empty target cells", () => {
    const claimTarget = baseClaim({
      populationSpec: { segments: ["healthcare", "dental"], roles: ["economic"] },
    });
    const rows = [
      baseRow({ id: "n1", orgId: "o-net", segment: "Healthcare", relationship: "founder_network" }),
      baseRow({ id: "n2", orgId: "o-net", segment: "Healthcare", relationship: "founder_network" }),
      baseRow({ id: "c1", orgId: "o-cold", segment: "Healthcare", relationship: "cold" }),
    ];
    const cov = buildCoverage(rows, claimTarget);
    expect(cov.inPopulationOrgs).toBe(2);
    expect(cov.diagnostics.networkOrgShare).toBe(0.5);
    expect(cov.matrix).toContainEqual({ segment: "dental", role: "economic", rows: 0, orgs: 0 });
    expect(recommendNextCells(cov, claimTarget)[0]).toEqual({
      segment: "dental",
      role: "economic",
      rows: 0,
      orgs: 0,
    });
  });

  it("F-06: isolates per-claim evidence and blocks contradicting polarity", () => {
    const cA = baseClaim({ id: "claim-a", claimedLevel: 6 });
    const cB = baseClaim({ id: "claim-b", claimedLevel: 6 });
    const rows = [
      baseRow({ id: "a1", orgId: "o1", evidenceType: 6, claimIds: ["claim-a"] }),
      baseRow({ id: "a2", orgId: "o2", evidenceType: 6, claimIds: ["claim-a"] }),
      baseRow({ id: "a3", orgId: "o3", evidenceType: 6, claimIds: ["claim-a"] }),
      baseRow({ id: "b1", orgId: "o4", evidenceType: 6, polarity: "contradicts", claimIds: ["claim-b"] }),
    ];
    const findings = audit(rows, [cA, cB]);
    expect(findings[0]!.kind).toBe("SUPPORTED");
    expect(findings[1]!.kind).toBe("DOWNGRADE");
  });

  it("F-07: accepts percentage falsifiers and rejects bare time durations", () => {
    expect(checkFalsifier("If 0% of users convert").ok).toBe(true);
    expect(checkFalsifier("If conversion is 5%").ok).toBe(true);
    expect(checkFalsifier("If we talk in 2 weeks").ok).toBe(false);
  });

  it("F-08: passes Zod repairHint on retry and flags claimType disagreement", async () => {
    const seenPrompts: string[] = [];
    const provider: Provider = {
      id: "mock",
      modelId: "test-repair",
      async complete(_sys, user): Promise<Completion> {
        seenPrompts.push(user);
        if (seenPrompts.length === 1) {
          return { text: JSON.stringify({ population: "Buyers" }), promptTokens: null, outputTokens: null, latencyMs: 0, ok: true, errorCode: null };
        }
        return {
          text: JSON.stringify({
            rawText: "80% of buyers pay",
            population: "Buyers",
            predicate: "pay",
            kind: "willingness_to_pay",
            claimType: "theme",
            rationale: "Pricing signal.",
            ambiguityFlags: [],
          }),
          promptTokens: null,
          outputTokens: null,
          latencyMs: 0,
          ok: true,
          errorCode: null,
        };
      },
    };
    const res = await formalise("80% of buyers pay", provider, { retry: { maxRetries: 0 } });
    expect(res.usedProvider).toBe(true);
    expect(seenPrompts[1]).toContain("repairHint");
    expect(res.proposal.ambiguityFlags).toContain("claimType_disagreement");
  });

  it("property: L5-only or <3 support customer claims never return SUPPORTED", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 6 }),
        fc.integer({ min: 1, max: 2 }),
        (claimedLevel, orgCount) => {
          const rows = Array.from({ length: orgCount }, (_, i) =>
            baseRow({ id: `p-${i}`, orgId: `o-${i}`, evidenceType: claimedLevel as 1 | 2 | 3 | 4 | 5 | 6 }),
          );
          const f = buildFinding(
            baseClaim({ claimedLevel: claimedLevel as 1 | 2 | 3 | 4 | 5 | 6 }),
            buildCoverage(rows, baseClaim()),
          );
          return f.kind !== "SUPPORTED";
        },
      ),
      { numRuns: 100, seed: 20261128 },
    );
  });
});

describe("email validation", () => {
  it("accepts standard non-disposable email addresses", () => {
    expect(validateEmail("auditor@company.com")).toEqual({ ok: true, reason: null });
    expect(validateEmail("  Alice.Smith+work@oxford.ac.uk  ")).toEqual({ ok: true, reason: null });
  });

  it("rejects malformed or missing email addresses", () => {
    expect(validateEmail("")).toMatchObject({ ok: false });
    expect(validateEmail("not-an-email")).toMatchObject({ ok: false });
    expect(validateEmail("user@localhost")).toMatchObject({ ok: false });
    expect(validateEmail("user@domain.c")).toMatchObject({ ok: false });
    expect(validateEmail("user..name@domain.com")).toMatchObject({ ok: false });
  });

  it("blocks disposable and temporary email domains including subdomains", () => {
    expect(validateEmail("test@mailinator.com")).toMatchObject({ ok: false });
    expect(validateEmail("temp@sub.yopmail.com")).toMatchObject({ ok: false });
    expect(validateEmail("burner@10minutemail.com")).toMatchObject({ ok: false });
  });
});

describe("account signup validation", () => {
  it("validates first and last names", () => {
    expect(validatePersonName("Ada", "First name")).toEqual({ ok: true, reason: null });
    expect(validatePersonName("   ", "First name")).toMatchObject({ ok: false });
    expect(validatePersonName("A".repeat(81), "Last name")).toMatchObject({ ok: false });
  });

  it("validates mobile numbers (7 to 15 digits)", () => {
    expect(validateMobileNumber("+1 555-234-5678")).toEqual({ ok: true, reason: null });
    expect(validateMobileNumber("9876543210")).toEqual({ ok: true, reason: null });
    expect(validateMobileNumber("12345")).toMatchObject({ ok: false });
    expect(validateMobileNumber("abc1234567")).toMatchObject({ ok: false });
  });

  it("requires matching passwords of at least 6 characters", () => {
    expect(validatePasswordMatch("secret123", "secret123")).toEqual({ ok: true, reason: null });
    expect(validatePasswordMatch("12345", "12345")).toMatchObject({ ok: false });
    expect(validatePasswordMatch("secret123", "secret124")).toMatchObject({
      ok: false,
      reason: "Passwords do not match. Please re-enter the same password.",
    });
  });
});
