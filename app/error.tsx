"use client";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card p-6" role="alert">
      <p className="label">Could not load this view</p>
      <p className="mt-2 text-sm text-[var(--ink-muted)]">
        The audit state could not be read. No evidence was changed.
        {error.digest ? ` Reference: ${error.digest}.` : ""}
      </p>
      <button type="button" className="btn mt-4" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
