import { LEVEL_LABELS } from "../lib/levels";
import type { FindingView } from "../lib/dto";

export function VerdictBadge({ finding }: { finding: FindingView }) {
  const supported = finding.finding === "SUPPORTED";
  const tone = supported
    ? "badge-confirm"
    : finding.finding === "WRONG_POPULATION" || finding.finding === "DOWNGRADE"
      ? "badge-signal"
      : "badge-neutral";

  return (
    <div className="shrink-0">
      {/* Level transition */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono text-sm text-[var(--ink-faint)]">
          L{finding.claimed}
          {LEVEL_LABELS[finding.claimed] ? ` · ${LEVEL_LABELS[finding.claimed]}` : ""}
        </span>
        <span className="text-[var(--ink-faint)]" aria-hidden="true">→</span>
        <span className={`badge ${tone}`}>
          <span className="mono">
            L{finding.level}
            {LEVEL_LABELS[finding.level] ? ` · ${LEVEL_LABELS[finding.level]}` : ""} · {finding.support} org
            {finding.support === 1 ? "" : "s"}
          </span>
        </span>
      </div>

      {/* Confidence interval */}
      {finding.interval && (
        <p className="mono mt-1 text-xs text-[var(--ink-muted)]">
          95% CI [{finding.interval[0].toFixed(2)}, {finding.interval[1].toFixed(2)}] · best case, not random sampling
        </p>
      )}

      {/* Saturation */}
      {finding.saturation && (
        <p className="mono mt-1 text-xs text-[var(--ink-muted)]">
          saturation {finding.saturation} · {finding.breadth} org{finding.breadth === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
