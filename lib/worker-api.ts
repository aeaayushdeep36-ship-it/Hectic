import type { Claim, Coverage, EvidenceLevel, EvidenceRow, Finding } from "./types";

export const WORKER_API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://hectic-api.lookingforit.workers.dev";

export const EVIDENCE_TYPE_TO_LEVEL: Record<string, EvidenceLevel> = {
  L1_internal: 1,
  L2_stated: 2,
  L3_concept: 3,
  L4_commitment: 4,
  L5_investment: 5,
  L6_payment: 6,
};

export const LEVEL_TO_EVIDENCE_TYPE: Record<EvidenceLevel, string> = {
  1: "L1_internal",
  2: "L2_stated",
  3: "L3_concept",
  4: "L4_commitment",
  5: "L5_investment",
  6: "L6_payment",
};

export interface ParsedWorkerEvidenceResponse {
  rows: Array<
    EvidenceRow & {
      redacted?: boolean;
      injected?: boolean;
    }
  >;
  errors: Array<{ row: number; reason: string }>;
  batchId: string;
}

export interface FormalisedClaimResponse {
  rawText: string;
  population: string;
  predicate: string;
  kind: Claim["kind"];
  claimType: Claim["claimType"];
  claimedLevel: EvidenceLevel;
  ambiguityFlags: string[];
  flags?: string[];
  injection?: boolean;
  providerId?: string;
}

export interface AuditFindingDetailed extends Finding {
  explanation: string;
  coverage: Coverage;
}

export interface WorkerAuditResponse {
  engineVersion: string;
  thresholdVersion: string;
  findingHash: string;
  findings: AuditFindingDetailed[];
}

export async function parseEvidenceViaWorker(
  csv: string,
): Promise<ParsedWorkerEvidenceResponse> {
  const res = await fetch(`${WORKER_API_BASE}/api/evidence/parse`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ csv }),
  });
  const data = (await res.json()) as ParsedWorkerEvidenceResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to parse interview CSV.");
  }
  return data;
}

export async function formaliseClaimViaWorker(
  rawText: string,
): Promise<FormalisedClaimResponse> {
  const res = await fetch(`${WORKER_API_BASE}/api/claims/formalise`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rawText }),
  });
  const data = (await res.json()) as FormalisedClaimResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to formalise claim.");
  }
  return data;
}

export async function validateFalsifierViaWorker(
  falsifier: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${WORKER_API_BASE}/api/resolutions/validate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ falsifier }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  return data;
}

export async function runAuditViaWorker(
  evidence: EvidenceRow[],
  claims: Claim[],
): Promise<WorkerAuditResponse> {
  const res = await fetch(`${WORKER_API_BASE}/api/audit`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ evidence, claims }),
  });
  const data = (await res.json()) as WorkerAuditResponse & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to run deterministic audit.");
  }
  return data;
}
