import { CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FindingView } from "@/lib/dto";
import { VerdictBadge } from "./VerdictBadge";

export interface ClaimCardProps {
  readonly title: string;
  readonly population: string;
  readonly status: "confirmed" | "blocked" | "ambiguous";
  readonly type: string;
  readonly level: string;
  readonly finding?: FindingView | null;
  readonly runId?: string;
}

const statusConfig = {
  confirmed: {
    icon: CheckCircle2,
    color: "text-[var(--confirm)]",
    bg: "bg-[var(--confirm-bg)] border-[var(--confirm-border)]",
  },
  blocked: {
    icon: ShieldAlert,
    color: "text-[var(--signal)]",
    bg: "bg-[var(--signal-bg)] border-[var(--signal-border)]",
  },
  ambiguous: {
    icon: ShieldAlert,
    color: "text-[var(--neutral)]",
    bg: "bg-[var(--neutral-bg)] border-[var(--border)]",
  },
} as const;

/** A readable, actionable card — one per claim, with the verified verdict beside the claim. */
export function ClaimCard({
  title,
  population,
  status,
  type,
  level,
  finding,
  runId,
}: ClaimCardProps) {
  const { icon: StatusIcon, color, bg } = statusConfig[status];

  return (
    <article className="card p-5 transition-colors hover:border-[var(--border-strong)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-mono text-[var(--ink-muted)] mb-2">
            <span>{type}</span>
            <span aria-hidden="true">•</span>
            <span>{level}</span>
            <span aria-hidden="true">•</span>
            <span className={color}>{status}</span>
          </div>
          <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
          <p className="text-sm text-[var(--ink-muted)]">Population: {population}</p>
        </div>
        <div className={cn("p-2 rounded-full border shrink-0", bg)}>
          <StatusIcon size={20} className={color} aria-hidden="true" />
        </div>
      </div>

      {finding ? (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <VerdictBadge finding={finding} />
          {finding.binding ? (
            <p className="mono mt-2 text-[12px] text-[var(--ink-muted)]">
              Binding constraint: {finding.binding}
            </p>
          ) : null}
          {runId ? (
            <Link
              href={`/runs/${runId}`}
              className="mono mt-3 inline-block text-[12px] text-[var(--ink-muted)] underline underline-offset-4 hover:text-[var(--ink)]"
            >
              View evidence trail →
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="mono mt-4 border-t border-[var(--border)] pt-4 text-[12px] text-[var(--ink-muted)]">
          Not yet audited.
        </p>
      )}
    </article>
  );
}
