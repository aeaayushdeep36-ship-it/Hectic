import type { FindingView } from "../lib/dto";
import { VerdictBadge } from "./VerdictBadge";

export function FindingRow({
  finding,
  onResolve,
}: {
  finding: FindingView;
  onResolve?: () => void;
}) {
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mono text-[13px] text-[var(--ink-faint)]">{finding.claimId}</p>
          <p className="mt-1 font-medium">{finding.claimText}</p>
          <p className="mt-1 text-[13px] text-[var(--ink-muted)]">{finding.claimType} claim</p>
        </div>
        <VerdictBadge finding={finding} />
      </div>

      <p className="mt-3 text-[14px] text-[var(--signal)]">{finding.explanation}</p>

      {finding.resolution ? (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
          <p className="label">Resolution · {finding.resolution.action}</p>
          <p className="mt-1 text-[14px]">{finding.resolution.falsifier}</p>
          <p className="mono mt-1 text-[12px] text-[var(--ink-faint)]">
            recorded {new Date(finding.resolution.resolvedAt).toISOString()}
          </p>
        </div>
      ) : finding.finding !== "SUPPORTED" && onResolve ? (
        <button type="button" className="btn btn-danger mt-3" onClick={onResolve}>
          Resolve this claim
        </button>
      ) : null}

      <details className="mt-3 border-t border-[var(--border)] pt-3">
        <summary className="cursor-pointer text-[13px] text-[var(--ink-muted)]">
          Reasoning trace — population, tags, binding ⓘ
        </summary>
        <div className="mt-3 space-y-2 text-[13px]">
          <p>
            <span className="label">Population</span> {finding.trace.population}
          </p>
          <p>
            <span className="label">Predicate</span> {finding.trace.predicate}
          </p>
          <p>
            <span className="label">Binding constraint</span>{" "}
            <span className="mono">{finding.trace.binding ?? "none"}</span>
          </p>
          {finding.trace.tags.length === 0 ? (
            <p className="text-[var(--ink-muted)]">No relevance tags were stored for this claim.</p>
          ) : (
            <ul className="space-y-1">
              {finding.trace.tags.map((tag) => (
                <li key={tag.evidenceId} className="mono text-[12px]">
                  {tag.alias} · bearsOn={String(tag.bearsOn)} · {tag.polarity ?? "no polarity"} ·{" "}
                  {tag.producer}
                  {tag.overriddenByUser ? " · human override" : ""}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[var(--ink-faint)]">
            Every tag is human-overridable. The binding was selected by the pure engine, never by a model.
          </p>
        </div>
      </details>

      <details className="mt-3 border-t border-[var(--border)] pt-3">
        <summary className="cursor-pointer text-[13px] text-[var(--ink-muted)]">
          Thresholds in force ({finding.thresholds.length}) ⓘ
        </summary>
        <div className="mt-3 space-y-3">
          {finding.thresholds.map((threshold) => (
            <div key={threshold.id} className="text-[13px]">
              <p className="mono">
                {threshold.code} · {threshold.kind} · {threshold.value}
                {threshold.overridden ? " (overridden)" : ""}
              </p>
              <p className="text-[var(--ink-muted)]">{threshold.rationale}</p>
              <p className="text-[var(--ink-faint)]">Source: {threshold.source}</p>
              <p className="text-[var(--ink-faint)]">Scope: {threshold.scope}</p>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
