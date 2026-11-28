import type { FindingView } from "../lib/dto";
import { VerdictBadge } from "./VerdictBadge";

const FINDING_STATUS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SUPPORTED: {
    label: "Supported",
    color: "var(--confirm)",
    bg: "var(--confirm-bg)",
    border: "var(--confirm-border)",
  },
  DOWNGRADE: {
    label: "Level too high",
    color: "var(--signal)",
    bg: "var(--signal-bg)",
    border: "var(--signal-border)",
  },
  WRONG_POPULATION: {
    label: "Wrong population",
    color: "var(--signal)",
    bg: "var(--signal-bg)",
    border: "var(--signal-border)",
  },
};

export function FindingRow({
  finding,
  onResolve,
}: {
  finding: FindingView;
  onResolve?: () => void;
}) {
  const isSupported = finding.finding === "SUPPORTED";
  const hasResolution = !!finding.resolution;
  const status = FINDING_STATUS[finding.finding] ?? {
    label: finding.finding,
    color: "var(--ink-muted)",
    bg: "var(--neutral-bg)",
    border: "var(--border)",
  };

  return (
    <article
      style={{
        border: `1px solid ${hasResolution || isSupported ? "var(--border)" : status.border}`,
        borderRadius: "2px",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {/* Header band */}
      <div
        className="flex flex-wrap items-start justify-between gap-4 px-5 py-4"
        style={{
          background: isSupported ? "var(--confirm-bg)" : hasResolution ? "var(--cream-dark)" : status.bg,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="label"
              style={{
                color: isSupported ? "var(--confirm)" : hasResolution ? "var(--ink-muted)" : status.color,
                letterSpacing: "0.08em",
              }}
            >
              {hasResolution ? "Resolved" : status.label}
            </span>
            <span className="mono text-xs text-[var(--ink-faint)]">{finding.claimId}</span>
          </div>
          <h3 className="serif text-[var(--ink)]" style={{ fontSize: "1.1rem", lineHeight: 1.35 }}>
            {finding.claimText}
          </h3>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{finding.claimType} claim</p>
        </div>
        <VerdictBadge finding={finding} />
      </div>

      {/* Explanation */}
      {finding.explanation && (
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <p
            className="text-sm"
            style={{ color: isSupported ? "var(--confirm)" : "var(--ink)", lineHeight: "22px" }}
          >
            {finding.explanation}
          </p>
        </div>
      )}

      {/* Resolution record */}
      {finding.resolution && (
        <div
          className="px-5 py-4"
          style={{
            background: "var(--cream-dark)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex-1">
              <p className="label mb-1">
                Resolution ·{" "}
                <span style={{ color: "var(--forest-mid)", textTransform: "none", fontStyle: "italic" }}>
                  {finding.resolution.action}
                </span>
              </p>
              <p className="text-sm text-[var(--ink)]" style={{ lineHeight: "22px" }}>
                {finding.resolution.falsifier}
              </p>
            </div>
            <p className="mono text-xs text-[var(--ink-faint)] shrink-0 mt-1">
              {new Date(finding.resolution.resolvedAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      )}

      {/* Resolve CTA */}
      {!isSupported && !hasResolution && onResolve && (
        <div className="px-5 py-4">
          <button
            type="button"
            className="btn btn-outlined text-sm"
            onClick={onResolve}
            style={{ borderColor: "var(--signal)", color: "var(--signal)" }}
          >
            Resolve this finding →
          </button>
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            Assign an action and falsifier to unblock export.
          </p>
        </div>
      )}

      {/* Reasoning trace (collapsible) */}
      <details
        className="group"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <summary
          className="cursor-pointer px-5 py-3 text-sm text-[var(--ink-muted)] flex items-center gap-2 hover:bg-[var(--cream-dark)] transition-colors select-none"
          style={{ listStyle: "none" }}
        >
          <span
            className="mono details-toggle"
            style={{ fontSize: "12px", border: "1px solid var(--border-strong)", borderRadius: "2px", padding: "1px 6px" }}
          >
            +
          </span>
          Reasoning trace — population, tags, binding
        </summary>
        <div
          className="px-5 pb-5 space-y-3 text-sm"
          style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="label mb-1">Population</p>
              <p className="text-[var(--ink)]">{finding.trace.population}</p>
            </div>
            <div>
              <p className="label mb-1">Predicate</p>
              <p className="text-[var(--ink)]">{finding.trace.predicate}</p>
            </div>
            <div>
              <p className="label mb-1">Binding constraint</p>
              <p className="mono text-[var(--ink)]">{finding.trace.binding ?? "none"}</p>
            </div>
          </div>

          {finding.trace.tags.length === 0 ? (
            <p className="text-[var(--ink-muted)]">No relevance tags stored for this claim.</p>
          ) : (
            <div>
              <p className="label mb-2">Evidence tags ({finding.trace.tags.length})</p>
              <ul className="space-y-1">
                {finding.trace.tags.map((tag) => (
                  <li key={tag.evidenceId} className="mono text-xs text-[var(--ink-muted)]">
                    {tag.alias} · bearsOn={String(tag.bearsOn)} · {tag.polarity ?? "—"} ·{" "}
                    {tag.producer}
                    {tag.overriddenByUser ? (
                      <span style={{ color: "var(--gold)" }}> · human override</span>
                    ) : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-[var(--ink-faint)]">
            Every tag is human-overridable. The binding is selected by the pure engine — never by a model.
          </p>
        </div>
      </details>

      {/* Thresholds (collapsible) */}
      {finding.thresholds.length > 0 && (
        <details style={{ borderTop: "1px solid var(--border)" }}>
          <summary
            className="cursor-pointer px-5 py-3 text-sm text-[var(--ink-muted)] flex items-center gap-2 hover:bg-[var(--cream-dark)] transition-colors select-none"
            style={{ listStyle: "none" }}
          >
            <span
              className="mono"
              style={{ fontSize: "12px", border: "1px solid var(--border-strong)", borderRadius: "2px", padding: "1px 6px" }}
            >
              +
            </span>
            Thresholds in force ({finding.thresholds.length})
          </summary>
          <div
            className="px-5 pb-5 space-y-4"
            style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}
          >
            {finding.thresholds.map((threshold) => (
              <div key={threshold.id} className="text-sm">
                <p className="mono text-xs font-semibold text-[var(--ink)]">
                  {threshold.code} · {threshold.kind} · {threshold.value}
                  {threshold.overridden ? (
                    <span style={{ color: "var(--gold)" }}> (overridden)</span>
                  ) : ""}
                </p>
                <p className="mt-1 text-[var(--ink-muted)]">{threshold.rationale}</p>
                <p className="mt-0.5 text-xs text-[var(--ink-faint)]">
                  Source: {threshold.source} · Scope: {threshold.scope}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}
