export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#07080A] text-[#F5F6F8]"
      role="status"
      aria-live="polite"
    >
      <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#7D8CA3]">
        LOADING WORKSPACE
      </p>
      <p className="mt-2 font-display text-[28px] text-[#F5F6F8]">
        Reading deterministic ledger…
      </p>
    </div>
  );
}
