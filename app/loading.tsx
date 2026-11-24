export default function Loading() {
  return (
    <div className="card p-6" role="status" aria-live="polite">
      <p className="label">Loading workspace</p>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">Reading evidence and audit state…</p>
    </div>
  );
}
