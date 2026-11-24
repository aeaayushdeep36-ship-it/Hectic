import { CheckCircle2, CircleQuestionMark, ShieldAlert } from "lucide-react";
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
    icon: CircleQuestionMark,
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
  const gap = finding && finding.finding !== "SUPPORTED";

  return (
    <article
      data-status={status}
      className="card p-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-mono text-[var(--ink-muted)] mb-2">
            <span>{type}</span>
            <span aria-hidden="true">•</span>
            <span>{level}</span>
            <span aria-hidden="true">•</span>
            <span className={cn(color, "capitalize")}>{status}</span>
          </div>
          <h3 className="text-base font-semibold text-[var(--ink)]">{title}</h3>
          <p className="text-sm text-[var(--ink-muted)]">Population: {population}</p>
        </div>
        <div className={cn("p-2 rounded-full border shrink-0 transition-colors", bg)}>
          <StatusIcon size={20} className={color} aria-hidden="true" />
        </div>
      </div>

      {finding ? (
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <VerdictBadge finding={finding} />
          {finding.explanation ? (
            <p className="mt-3 text-[13px] leading-5 text-[var(--ink)]">{finding.explanation}</p>
          ) : null}
          {finding.binding ? (
            <p
              className={cn(
                "mono mt-2 text-[12px]",
                gap ? "text-[var(--signal)]" : "text-[var(--ink-muted)]",
              )}
            >
              Binding constraint: {finding.binding}
            </p>
          ) : null}
          {runId ? (
            <Link
              href={`/runs/${runId}`}
              aria-label={`View evidence trail for ${title}`}
              className="mono mt-3 inline-flex rounded-md text-[12px] text-[var(--ink-muted)] underline underline-offset-4 transition-colors hover:text-[var(--ink)] focus-visible:text-[var(--ink)]"
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
