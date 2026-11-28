import {
  ENGINE_VERSION,
  THRESHOLD_VERSION,
  audit,
  buildCoverage,
  explain,
} from "../../../engine/index";
import { parseRoster } from "../../../lib/csv";
import { checkFalsifier } from "../../../lib/falsifier";
import { guard } from "../../../lib/guard";
import { contentHash, verdictHash } from "../../../lib/hash";
import { templateProposal } from "../../../lib/heuristics";
import { claimSchema, createClaimInputSchema, evidenceRowSchema } from "../../../lib/schemas";
import type { Claim, EvidenceRow } from "../../../lib/types";

interface Env {
  FIREBASE_PROJECT_ID: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return null;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "GET" && path === "/api/health") {
      return json({
        ok: true,
        service: "hectic-api",
        runtime: "cloudflare-workers",
        database: "firebase-firestore",
        firebaseProjectId: env.FIREBASE_PROJECT_ID,
        engineVersion: ENGINE_VERSION,
        thresholdVersion: THRESHOLD_VERSION,
      });
    }

    if (request.method === "POST" && path === "/api/claims/formalise") {
      const body = await readJson(request);
      if (!body || typeof body.rawText !== "string" || body.rawText.trim().length < 3) {
        return json({ error: "RAW_TEXT_REQUIRED" }, 400);
      }
      const checked = guard(body.rawText);
      const proposal = templateProposal(checked.redacted);
      return json({
        ...proposal,
        flags: checked.flags,
        injection: checked.injected,
        providerId: "mock",
      });
    }

    if (request.method === "POST" && path === "/api/evidence/parse") {
      const body = await readJson(request);
      if (!body || typeof body.csv !== "string" || body.csv.trim().length === 0) {
        return json({ error: "CSV_REQUIRED" }, 400);
      }
      const parsed = parseRoster(body.csv);
      const redactedRows = parsed.rows.map((row) => {
        const g = guard(row.notes);
        return {
          ...row,
          alias: guard(row.alias).redacted,
          notes: g.redacted,
          redacted: g.flags.length > 0,
          injected: g.injected,
        };
      });
      return json({
        rows: redactedRows,
        errors: parsed.errors,
        batchId: contentHash(redactedRows.map((r) => [r.id, r.orgId])),
      });
    }

    if (request.method === "POST" && path === "/api/resolutions/validate") {
      const body = await readJson(request);
      const falsifier = typeof body?.falsifier === "string" ? body.falsifier : "";
      if (falsifier.trim().length < 40) {
        return json({ ok: false, error: "FALSIFIER_TOO_SHORT" }, 422);
      }
      const check = checkFalsifier(falsifier);
      if (!check.ok) {
        return json({ ok: false, error: check.reason }, 422);
      }
      return json({ ok: true });
    }

    if (request.method === "POST" && path === "/api/audit") {
      const body = await readJson(request);
      if (!body) return json({ error: "INVALID_JSON" }, 400);

      const rawEvidence = Array.isArray(body.evidence) ? body.evidence : [];
      const rawClaims = Array.isArray(body.claims) ? body.claims : [];

      const evidence: EvidenceRow[] = [];
      for (const item of rawEvidence) {
        const parsed = evidenceRowSchema.safeParse(item);
        if (parsed.success) evidence.push(parsed.data);
      }

      const claims: Claim[] = [];
      for (const [idx, item] of rawClaims.entries()) {
        const full = claimSchema.safeParse(item);
        if (full.success) {
          claims.push(full.data);
          continue;
        }
        const input = createClaimInputSchema.safeParse(item);
        if (input.success && input.data.population.trim().length > 0) {
          claims.push({
            id: `claim-${idx + 1}`,
            ordinal: idx,
            rawText: input.data.rawText,
            population: input.data.population,
            populationSpec: {},
            predicate: input.data.predicate || input.data.rawText,
            kind: input.data.kind,
            claimType: input.data.claimType,
            claimedLevel: input.data.claimedLevel as Claim["claimedLevel"],
            observed: input.data.observed,
            precisionTolerance: input.data.precisionTolerance,
            confirmed: true,
          });
        }
      }

      const findings = audit(evidence, claims);
      const detailed = findings.map((finding) => {
        const claim = claims.find((c) => c.id === finding.claimId)!;
        const coverage = buildCoverage(evidence, claim);
        return {
          ...finding,
          explanation: explain(claim, finding),
          coverage,
        };
      });

      return json({
        engineVersion: ENGINE_VERSION,
        thresholdVersion: THRESHOLD_VERSION,
        findingHash: verdictHash(findings),
        findings: detailed,
      });
    }

    return json({ error: "NOT_FOUND" }, 404);
  },
};
