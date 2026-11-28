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
        <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)] mb-4">
          04 / METHODOLOGY
        </p>
        <h2 className="font-display text-[clamp(2.25rem,3.8vw,3.25rem)] leading-[1.06] text-[var(--ink-primary)]">
          Six levels of proof.
        </h2>

        {/* Open 6-Row Horizontal Ledger */}
        <div className="mt-14 border-t border-[var(--border-hair)]">
          {PROOF_LEVELS.map((item) => (
            <div
              key={item.code}
              className="py-4 border-b border-[var(--border-hair)] grid grid-cols-1 md:grid-cols-12 items-center gap-2 md:gap-6"
            >
              <span className="md:col-span-3 font-mono-tabular text-[13px] tracking-[0.04em] text-[var(--ink-primary)]">
                {item.code}
              </span>
              <span className="md:col-span-6 text-[15px] text-[var(--ink-secondary)]">
                {item.description}
              </span>
              <span
                className="md:col-span-3 md:text-right font-mono-tabular text-[12px] tracking-[0.06em]"
                style={{
                  color: item.tagAccent ? "var(--status-emerald)" : "var(--ink-muted)",
                }}
              >
                {item.tag}
              </span>
            </div>
          ))}
        </div>

        {/* Wilson 95% Precision Convergence */}
        <div className="mt-14 max-w-[680px]">
          <p className="font-mono-tabular text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-6">
            WILSON 95% PRECISION CONVERGENCE
          </p>

          <div className="space-y-5 pr-8 border-r border-[var(--border-hair)]">
            {CONVERGENCE_ROWS.map((row) => (
              <div key={row.n} className="flex items-center gap-4">
                <span className="w-14 shrink-0 font-mono-tabular text-[12px] text-[var(--ink-secondary)]">
                  {row.n}
                </span>

                <div className="relative flex-1 h-7 flex items-center">
                  {/* Fine ruler ticks */}
                  <div
                    className="w-full h-2 opacity-25"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(to right, var(--ink-muted) 0, var(--ink-muted) 1px, transparent 1px, transparent 8px)",
                    }}
                  />
                  {/* Active Gold/Brass CI Bar */}
                  <div
                    className="absolute h-[1.5px]"
                    style={{
                      left: `${row.lowPct}%`,
                      right: 0,
                      backgroundColor: "var(--accent-graphic)",
                    }}
                  />
                  {/* Left cap + label */}
                  <div
                    className="absolute top-1.5 bottom-1.5 w-[1px]"
                    style={{
                      left: `${row.lowPct}%`,
                      backgroundColor: "var(--accent-graphic)",
                    }}
                  />
                  <span
                    className="absolute top-6 -translate-x-1/2 font-mono-tabular text-[11px] text-[var(--ink-secondary)]"
                    style={{ left: `${row.lowPct}%` }}
                  >
                    {row.lowLabel}
                  </span>
                  {/* Right cap */}
                  <div
                    className="absolute right-0 top-1.5 bottom-1.5 w-[1px]"
                    style={{ backgroundColor: "var(--accent-graphic)" }}
                  />
                </div>

                <span className="w-10 shrink-0 text-right font-mono-tabular text-[12px] text-[var(--ink-secondary)]">
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
