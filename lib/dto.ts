import type {
  Binding,
  ClaimType,
  EvidenceLevel,
  FindingKind,
  Interval,
  Saturation,
} from "./types";

export interface WorkspaceView {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly contextNote: string | null;
  readonly isDemo: boolean;
  readonly claimCount: number;
  readonly evidenceCount: number;
  readonly orgCount: number;
  readonly runCount: number;
}

export interface ResolutionView {
  readonly action: string;
  readonly targetLevel: number | null;
  readonly falsifier: string;
  readonly note: string | null;
  readonly resolvedAt: number;
}

export interface TraceTagView {
  readonly evidenceId: string;
  readonly alias: string;
  readonly bearsOn: boolean;
  readonly polarity: string | null;
  readonly overriddenByUser: boolean;
  readonly producer: string;
}

export interface TraceView {
  readonly population: string;
  readonly predicate: string;
  readonly tags: readonly TraceTagView[];
  readonly binding: Binding;
  readonly diagnostics: unknown;
}

export interface FindingView {
  readonly claimId: string;
  readonly claimText: string;
  readonly claimType: ClaimType;
  readonly claimed: EvidenceLevel;
  readonly level: EvidenceLevel;
  readonly support: number;
  readonly breadth: number;
  readonly saturation: Saturation;
  readonly interval: Interval | null;
  readonly finding: FindingKind;
  readonly binding: Binding;
  readonly explanation: string;
  readonly coverage: unknown;
  readonly diagnostics: unknown;
  readonly resolution: ResolutionView | null;
  readonly thresholds: readonly ThresholdView[];
  readonly trace: TraceView;
}

export interface RunView {
  readonly id: string;
  readonly workspaceSlug: string;
  readonly status: string;
  readonly providerId: string;
  readonly modelId: string;
  readonly inputHash: string;
  readonly findingHash: string | null;
  readonly startedAt: number;
  readonly finishedAt: number | null;
  readonly costEur: number;
  readonly callCount: number;
  readonly findings: readonly FindingView[];
}

export interface AuditEventView {
  readonly id: string;
  readonly type: string;
  readonly payload: unknown;
  readonly createdAt: number;
}

export interface ClaimView {
  readonly id: string;
  readonly ordinal: number;
  readonly rawText: string;
  readonly population: string;
  readonly predicate: string;
  readonly kind: string;
  readonly claimType: ClaimType;
  readonly claimedLevel: number;
  readonly observed: { readonly k: number; readonly n: number } | null;
  readonly precisionTolerance: number | null;
  readonly confirmed: boolean;
  readonly confirmedAt: number | null;
  readonly ambiguousFlags: readonly string[];
}

export interface MatrixCellView {
  readonly rows: number;
  readonly orgs: number;
}

export interface MatrixView {
  readonly segments: readonly string[];
  readonly roles: readonly string[];
  readonly cells: Readonly<Record<string, MatrixCellView>>;
  readonly totalRows: number;
  readonly totalOrgs: number;
}

export interface ThresholdView {
  readonly id: string;
  readonly code: string;
  readonly kind: string;
  readonly value: number;
  readonly rationale: string;
  readonly source: string;
  readonly scope: string;
  readonly overridden: boolean;
}
