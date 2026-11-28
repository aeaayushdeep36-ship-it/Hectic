"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="px-4 py-1.5 border border-[var(--accent-graphic)] text-[var(--accent-text)] font-mono-tabular text-[11px] tracking-[0.06em] rounded-[2px] hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
      onClick={() => window.print()}
    >
      EXPORT PDF
    </button>
  );
}
