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
  readonly index?: number;
}

const statusConfig = {
  confirmed: {
    icon: CheckCircle2,
    color: "var(--confirm)",
    dot: "●",
    label: "Supported",
  },
  blocked: {
    icon: ShieldAlert,
    color: "var(--signal)",
    dot: "●",
    label: "Gap found",
  },
  ambiguous: {
    icon: CircleQuestionMark,
    color: "var(--ink-faint)",
    dot: "○",
    label: "Unaudited",
  },
} as const;

/** Aldridge-style accordion claim row */
export function ClaimCard({
  title,
  population,
  status,
  type,
  level,
  finding,
  runId,
  index,
}: ClaimCardProps) {
  const { icon: StatusIcon, color, dot, label } = statusConfig[status];
  const gap = finding && finding.finding !== "SUPPORTED";
  const num = index !== undefined ? String(index).padStart(2, "0") : null;

  return (
    <article
      data-status={status}
      className="accordion-row"
    >
      {/* Main row */}
      <div className="flex items-start gap-6 py-6 px-2">
        {/* Number */}
        {num && (
          <span
            className="mono text-[var(--ink-faint)] shrink-0 mt-0.5"
            style={{ fontSize: "12px", width: "24px", lineHeight: "24px" }}
            aria-hidden="true"
          >
            {num}
          </span>
        )}

        {/* Claim text + meta */}
        <div className="flex-1 min-w-0">
          {/* Type / Level tags */}
          <div
            className="flex flex-wrap items-center gap-3 mb-2"
          >
            <span
              className="label"
              style={{ color: "var(--gold)", letterSpacing: "0.08em" }}
            >
              {type}
            </span>
            <span
              className="mono"
              style={{ fontSize: "11px", color: "var(--ink-faint)" }}
            >
              {level}
            </span>
          </div>

          <h3
            className="serif text-[var(--ink)]"
            style={{ fontSize: "clamp(1rem, 1.8vw, 1.3rem)", lineHeight: 1.3 }}
          >
            {title}
          </h3>
          <p
            className="mt-1 text-sm text-[var(--ink-muted)]"
          >
            Population: {population}
          </p>
        </div>

        {/* Status tag — Aldridge style: dot + text */}
        <div
          className="shrink-0 hidden sm:flex items-center gap-2 text-sm"
          style={{ color, minWidth: "110px" }}
        >
          <span
            aria-hidden="true"
            style={{ fontSize: "10px" }}
          >
            {dot}
          </span>
          <span style={{ fontSize: "13px", fontStyle: status === "ambiguous" ? "italic" : "normal" }}>
            {label}
          </span>
        </div>

        {/* Status icon — mobile only */}
        <div className="sm:hidden shrink-0 mt-0.5" aria-hidden="true">
          <StatusIcon size={18} style={{ color }} />
        </div>
      </div>

      {/* Finding detail — only if present */}
      {finding && (
        <div
          className="pl-10 pb-6 pr-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="pt-4">
            <VerdictBadge finding={finding} />

            {finding.explanation && (
              <p
                className="mt-3 text-[var(--ink)]"
                style={{ fontSize: "13px", lineHeight: "22px" }}
              >
                {finding.explanation}
              </p>
            )}

            {finding.binding && (
              <p
                className={cn(
                  "mono mt-2",
                  gap ? "text-[var(--signal)]" : "text-[var(--ink-muted)]",
                )}
                style={{ fontSize: "12px" }}
              >
                Binding constraint: {finding.binding}
              </p>
            )}

            {runId && (
              <Link
                href={`/runs/${runId}`}
                aria-label={`View evidence trail for ${title}`}
                className="mono mt-3 inline-flex items-center gap-1 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors no-underline"
                style={{ fontSize: "12px", textDecoration: "underline", textUnderlineOffset: "4px" }}
              >
                View evidence trail →
              </Link>
            )}
          </div>
        </div>
      )}

      {!finding && (
        <div
          className="pl-10 pb-5 pr-2"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p
            className="mono pt-4 text-[var(--ink-faint)]"
            style={{ fontSize: "12px", fontStyle: "italic" }}
          >
            Not yet audited — run an audit to populate this finding.
          </p>
        </div>
      )}
    </article>
  );
}
