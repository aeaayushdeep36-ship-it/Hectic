/**
 * Domain types shared by the engine, the import layer and the UI.
 *
 * These are data, not behaviour. The engine imports only this file and
 * `engine/thresholds.ts`; it never imports a provider, a database or React.
 */

export type EvidenceLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type EvidenceTypeName =
  | "internal"
  | "stated"
  | "concept"
  | "commitment"
  | "investment"
  | "payment";

export type Role = "economic" | "technical" | "user" | "influencer" | "none";

export type Relationship =
  | "founder_network"
  | "referral"
  | "cold"
  | "unknown";

export type ClaimKind =
  | "pain"
  | "frequency"
  | "willingness_to_pay"
  | "role_ownership"
  | "displacement"
  | "retention"
  | "comparative";

export type ClaimType = "theme" | "prevalence";

export type Saturation = "insufficient" | "basic" | "code" | "meaning" | null;

export type Binding = "population" | "type" | "support" | null;

export type FindingKind =
  | "SUPPORTED"
  | "DOWNGRADE"
  | "IMPRECISE"
  | "WRONG_POPULATION"
  | "UNTOUCHED";

/** The human-confirmed answer to "who is this claim about?". */
export interface PopulationSpec {
  /** Empty or absent means every segment is in population. */
  readonly segments?: readonly string[];
  /** Empty or absent means every role is in population. */
  readonly roles?: readonly Role[];
}

export type EvidencePolarity = "supports" | "contradicts";

export interface EvidenceRow {
  readonly id: string;
  readonly orgId: string;
  readonly alias: string;
  readonly segment: string;
  readonly role: Role;
  readonly channel: string;
  readonly relationship: Relationship;
  /** Entered by the founder from the roster. Never inferred by a model. */
  readonly evidenceType: EvidenceLevel;
  readonly date: string;
  readonly durationMin: number | null;
  readonly notes: string;
  /** Optional polarity for disconfirming evidence; defaults to "supports". */
  readonly polarity?: EvidencePolarity;
  /** Optional claim IDs this row bears on; absent means evaluated against all claims. */
  readonly claimIds?: readonly string[];
}

export interface Claim {
  readonly id: string;
  readonly ordinal: number;
  readonly rawText: string;
  readonly population: string;
  readonly populationSpec: PopulationSpec;
  readonly predicate: string;
  readonly kind: ClaimKind;
  readonly claimType: ClaimType;
  readonly claimedLevel: EvidenceLevel;
  /** Founder-declared k of n approached, used only for the Wilson readout. */
  readonly observed: { readonly k: number; readonly n: number } | null;
  /** Maximum acceptable half-width for a prevalence claim, e.g. 0.10. */
  readonly precisionTolerance: number | null;
  /** Unconfirmed claims cannot be analysed. */
  readonly confirmed: boolean;
}

export interface CoverageCell {
  readonly segment: string;
  readonly role: Role;
  readonly rows: number;
  readonly orgs: number;
}

export interface CoverageDiagnostics {
  readonly channelCounts: Readonly<Record<string, number>>;
  readonly largestChannelShare: number;
  readonly networkRows: number;
  readonly networkShare: number;
  readonly inPopulationNetworkRows: number;
  /** Org-level bias diagnostics (counting unit = organisation, not row). */
  readonly inPopulationNetworkOrgs?: number;
  readonly networkOrgShare?: number;
  readonly largestChannelOrgShare?: number;
  readonly contradictingOrgs?: number;
}

/**
 * The only arithmetic inputs to a verdict. Built from Coverage by
 * `toVerdictInput`, and kept separate so property tests can generate it.
 */
export interface VerdictInput {
  readonly claimType: ClaimType;
  readonly observed: { readonly k: number; readonly n: number } | null;
  /** All distinct organisations by their highest evidence type. */
  readonly types: Readonly<Partial<Record<EvidenceLevel, number>>>;
  /** The in-population subset. Only this may set the level. */
  readonly inPopulationTypes: Readonly<Partial<Record<EvidenceLevel, number>>>;
  readonly inPopulationOrgs: number;
  /** In-population organisations with contradicting evidence at or above L2. */
  readonly contradictingOrgs?: number;
}

export interface Coverage {
  readonly totalRows: number;
  readonly inPopulationRows: number;
  readonly distinctOrgs: number;
  readonly inPopulationOrgs: number;
  /** All organisations, used only to name the population binding. */
  readonly allOrgsByLevel: Readonly<Partial<Record<EvidenceLevel, number>>>;
  readonly orgsByLevel: Readonly<Partial<Record<EvidenceLevel, number>>>;
  readonly matrix: readonly CoverageCell[];
  readonly diagnostics: CoverageDiagnostics;
}

/** A Wilson score interval, rounded to three decimals: [lo, hi, width]. */
export type Interval = readonly [number, number, number];

export interface Verdict {
  readonly level: EvidenceLevel;
  readonly support: number;
  readonly breadth: number;
  readonly saturation: Saturation;
  readonly interval: Interval | null;
  readonly binding: Binding;
}

export interface Finding {
  readonly claimId: string;
  readonly kind: FindingKind;
  readonly claimed: EvidenceLevel;
  readonly verdict: Verdict;
  /** Rows with bears_on = false, diagnostics only, never a verdict input. */
  readonly evidenceElsewhere: number;
}
