import { z } from "zod";

export const evidenceLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const roleSchema = z.enum([
  "economic",
  "technical",
  "user",
  "influencer",
  "none",
]);

export const evidenceRowSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  alias: z.string().min(1),
  segment: z.string().min(1),
  role: roleSchema,
  channel: z.string().min(1),
  relationship: z.enum(["founder_network", "referral", "cold", "unknown"]),
  evidenceType: evidenceLevelSchema,
  date: z.string().min(1),
  durationMin: z.number().int().nonnegative().nullable(),
  notes: z.string(),
});

/** The only model-writable schema. Note the absence of level/support/verdict. */
export const claimProposalSchema = z.object({
  rawText: z.string().min(1),
  population: z.string().min(1),
  predicate: z.string().min(1),
  kind: z.enum([
    "pain",
    "frequency",
    "willingness_to_pay",
    "role_ownership",
    "displacement",
    "retention",
    "comparative",
  ]),
  claimType: z.enum(["theme", "prevalence"]),
  rationale: z.string().max(400),
  ambiguityFlags: z.array(z.string()).default([]),
});

/** A2's only writable fields. No count, level, score or verdict. */
export const relevanceTagSchema = z.object({
  evidenceId: z.string().min(1),
  claimId: z.string().min(1),
  bearsOn: z.boolean(),
  polarity: z.enum(["supports", "contradicts", "ambiguous"]),
});

export const claimSchema = z.object({
  id: z.string().min(1),
  ordinal: z.number().int().nonnegative(),
  rawText: z.string().min(1),
  population: z.string().min(1),
  populationSpec: z.object({
    segments: z.array(z.string()).optional(),
    roles: z.array(roleSchema).optional(),
  }),
  predicate: z.string().min(1),
  kind: z.enum([
    "pain",
    "frequency",
    "willingness_to_pay",
    "role_ownership",
    "displacement",
    "retention",
    "comparative",
  ]),
  claimType: z.enum(["theme", "prevalence"]),
  claimedLevel: evidenceLevelSchema,
  observed: z
    .object({ k: z.number().int().nonnegative(), n: z.number().int().positive() })
    .nullable(),
  precisionTolerance: z.number().positive().nullable(),
  confirmed: z.boolean(),
});

export const rosterFileSchema = z.array(evidenceRowSchema);
export const claimsFileSchema = z.array(claimSchema);
