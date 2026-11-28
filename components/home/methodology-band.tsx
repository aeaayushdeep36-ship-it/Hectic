"use client";

interface ProofLevelRow {
  readonly code: string;
  readonly description: string;
  readonly tag: string;
  readonly tagAccent?: boolean;
}

const PROOF_LEVELS: readonly ProofLevelRow[] = [
  {
    code: "L1 INTERNAL",
    description: "Founder hypothesis or internal conviction",
    tag: "FLOOR",
  },
  {
    code: "L2 STATED",
    description: "Discovery interviews & structured surveys",
    tag: "SATURATION 6–24",
  },
  {
    code: "L3 CONCEPT",
    description: "Prototype or landing page exposure",
    tag: "EXPOSURE",
  },
  {
    code: "L4 COMMITMENT",
    description: "Signed LOI, pilot, or waitlist",
    tag: "SUPPORT ≥ 3",
  },
  {
    code: "L5 INVESTMENT",
    description: "Contingent investor commitment",
    tag: "NON-CUSTOMER",
    tagAccent: true,
  },
  {
    code: "L6 PAYMENT",
    description: "Pre-MVP paying customer revenue",
    tag: "COMMERCIAL PROOF",
    tagAccent: true,
  },
];

const CONVERGENCE_ROWS: ReadonlyArray<{
  n: string;
  lowLabel: string;
  lowPct: number;
}> = [
  { n: "n = 3", lowLabel: "0.44", lowPct: 44 },
  { n: "n = 10", lowLabel: "0.72", lowPct: 72 },
  { n: "n = 20", lowLabel: "0.84", lowPct: 84 },
];

export function MethodologyBand() {
  return (
    <section id="methodology" className="py-32">
      <div className="mx-auto max-w-[1360px] px-8 lg:px-16">
        <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#64748B] mb-4">
          04 / METHODOLOGY
        </p>
        <h2 className="font-display text-[clamp(2.25rem,3.8vw,3.25rem)] leading-[1.06] text-[#F5F6F8]">
          Six levels of proof.
        </h2>

        {/* Open 6-Row Horizontal Ledger */}
        <div className="mt-14 border-t border-white/[0.07]">
          {PROOF_LEVELS.map((item) => (
            <div
              key={item.code}
              className="py-4 border-b border-white/[0.07] grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-6"
            >
              <span className="md:col-span-3 font-mono-tabular text-[13px] tracking-[0.04em] text-[#E5E7EB]">
                {item.code}
              </span>
              <span className="md:col-span-6 text-[15px] text-[#D1D5DB]">
                {item.description}
              </span>
              <span
                className={`md:col-span-3 md:text-right font-mono-tabular text-[12px] tracking-[0.06em] ${
                  item.tagAccent ? "text-[#3B826E]" : "text-[#64748B]"
                }`}
              >
                {item.tag}
              </span>
            </div>
          ))}
        </div>

        {/* Wilson 95% Precision Convergence */}
        <div className="mt-14 max-w-[680px]">
          <p className="font-mono-tabular text-[11px] uppercase tracking-[0.12em] text-[#64748B] mb-6">
            WILSON 95% PRECISION CONVERGENCE
          </p>

          <div className="space-y-5 pr-8 border-r border-white/[0.08]">
            {CONVERGENCE_ROWS.map((row) => (
              <div key={row.n} className="flex items-center gap-4">
                <span className="w-14 shrink-0 font-mono-tabular text-[12px] text-[#9CA3AF]">
                  {row.n}
                </span>

                <div className="relative flex-1 h-7 flex items-center">
                  {/* Fine ruler ticks */}
                  <div
                    className="w-full h-2 opacity-20"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to right, #9CA3AF 0, #9CA3AF 1px, transparent 1px, transparent 8px)",
                    }}
                  />
                  {/* Active Gold CI Bar */}
                  <div
                    className="absolute h-[1.5px] bg-gradient-to-r from-[#D4AF6A]/85 to-[#E5C98E]"
                    style={{ left: `${row.lowPct}%`, right: 0 }}
                  />
                  {/* Left cap + label */}
                  <div
                    className="absolute top-1.5 bottom-1.5 w-[1px] bg-[#D4AF6A]"
                    style={{ left: `${row.lowPct}%` }}
                  />
                  <span
                    className="absolute top-6 -translate-x-1/2 font-mono-tabular text-[11px] text-[#9CA3AF]"
                    style={{ left: `${row.lowPct}%` }}
                  >
                    {row.lowLabel}
                  </span>
                  {/* Right cap */}
                  <div className="absolute right-0 top-1.5 bottom-1.5 w-[1px] bg-[#D4AF6A]" />
                </div>

                <span className="w-10 shrink-0 text-right font-mono-tabular text-[12px] text-[#9CA3AF]">
                  1.00
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
