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
      className="min-h-screen flex flex-col items-center justify-center bg-[#07080A] text-[#F5F6F8] px-6 text-center"
      role="alert"
    >
      <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#EF4444]">
        SYSTEM ERROR
      </p>
      <h2 className="mt-3 font-display text-[32px] text-[#F5F6F8]">
        Could not load audit state
      </h2>
      <p className="mt-2 max-w-[42ch] text-[13px] text-[#9CA3AF]">
        No evidence or ledger rows were modified.
        {error.digest ? ` Reference: ${error.digest}.` : ""}
      </p>
      <div className="mt-7 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 bg-[#D4AF6A] text-[#07080A] text-[12px] font-medium rounded-[2px] cursor-pointer"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-4 py-2 border border-[#262B35] text-[#F5F6F8] text-[12px] rounded-[2px] no-underline hover:bg-[#15181F]"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
