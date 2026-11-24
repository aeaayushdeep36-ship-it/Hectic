import { CheckCircle2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ClaimCardProps {
  readonly title: string;
  readonly population: string;
  readonly status: "confirmed" | "blocked" | "ambiguous";
  readonly type: string;
  readonly level: string;
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

/** A readable, actionable card — one per claim. */
export function ClaimCard({ title, population, status, type, level }: ClaimCardProps) {
  const { icon: StatusIcon, color, bg } = statusConfig[status];

  return (
    <article className="card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--ink-muted)] mb-2">
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
    </article>
  );
}
