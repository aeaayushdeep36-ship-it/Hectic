"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      className="px-4 py-1.5 border border-[#D4AF6A] text-[#D4AF6A] font-mono-tabular text-[11px] tracking-[0.06em] rounded-[2px] hover:bg-[#15181F] cursor-pointer transition-colors"
      onClick={() => window.print()}
    >
      EXPORT PDF
    </button>
  );
}
