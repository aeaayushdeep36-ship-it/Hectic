"use client";

import Link from "next/link";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-canvas)] text-[var(--ink-primary)] px-6 text-center"
      role="alert"
    >
      <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[var(--status-crimson)]">
        SYSTEM ERROR
      </p>
      <h2 className="mt-3 font-display text-[32px] text-[var(--ink-primary)]">
        Could not load audit state
      </h2>
      <p className="mt-2 max-w-[42ch] text-[13px] text-[var(--ink-secondary)]">
        No evidence or ledger rows were modified.
        {error.digest ? ` Reference: ${error.digest}.` : ""}
      </p>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[12px] font-medium rounded-[2px] cursor-pointer"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-4 py-2 border border-[var(--border-elevated)] text-[var(--ink-primary)] text-[12px] rounded-[2px] no-underline hover:bg-[var(--bg-elevated)]"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
