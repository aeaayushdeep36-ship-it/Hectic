import { LEVEL_LABELS } from "../engine/thresholds";
import type { FindingView } from "../lib/dto";

export function VerdictBadge({ finding }: { finding: FindingView }) {
  const supported = finding.finding === "SUPPORTED";
  const tone = supported
    ? "badge-confirm"
    : finding.finding === "WRONG_POPULATION" || finding.finding === "DOWNGRADE"
      ? "badge-signal"
      : "badge-neutral";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mono text-[13px] text-[var(--ink-faint)]">
          L{finding.claimed} {LEVEL_LABELS[finding.claimed]}
        </span>
        <span className="mono text-[13px] text-[var(--ink-faint)]" aria-hidden="true">
          →
        </span>
        <span className={`badge ${tone}`}>
          <span className="mono">
            L{finding.level} {LEVEL_LABELS[finding.level]} · {finding.support} org
            {finding.support === 1 ? "" : "s"}
          </span>
        </span>
        <span className="label">{finding.finding}</span>
      </div>
      {finding.interval ? (
        <p className="mono mt-2 text-[12px] text-[var(--ink-muted)]">
          95% [{finding.interval[0].toFixed(2)}, {finding.interval[1].toFixed(2)}] · best case,
          not random sampling
        </p>
      ) : null}
      {finding.saturation ? (
        <p className="mono mt-2 text-[12px] text-[var(--ink-muted)]">
          saturation {finding.saturation} · {finding.breadth} orgs
        </p>
      ) : null}
    </div>
  );
}
