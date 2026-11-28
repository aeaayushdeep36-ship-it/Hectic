export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-canvas)] text-[var(--ink-primary)]"
      role="status"
      aria-live="polite"
    >
      <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
        LOADING WORKSPACE
      </p>
      <p className="mt-2 font-display text-[28px] text-[var(--ink-primary)]">
        Reading deterministic ledger…
      </p>
    </div>
  );
}
