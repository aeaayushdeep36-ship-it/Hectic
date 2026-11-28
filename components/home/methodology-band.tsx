"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const PROOF_LEVELS: ReadonlyArray<{
  code: string;
  level: string;
  label: string;
  note?: string;
  isGold?: boolean;
}> = [
  { code: "01", level: "L1", label: "Internal" },
  { code: "02", level: "L2", label: "Stated" },
  { code: "03", level: "L3", label: "Concept" },
  { code: "04", level: "L4", label: "Commitment" },
  {
    code: "05",
    level: "L5",
    label: "Investment",
    note: "never validates customer claims",
  },
  { code: "06", level: "L6", label: "Payment", isGold: true },
];

export function MethodologyBand() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 80%", "end 45%"],
  });
  const barScale = useTransform(scrollYProgress, [0, 1], [0.15, 1]);

  return (
    <section
      id="methodology"
      ref={sectionRef}
      className="py-32"
    >
      <div className="mx-auto max-w-[1360px] px-8 lg:px-16">
        <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#64748B] mb-4">
          04 / METHODOLOGY
        </p>
        <h2 className="font-display text-[clamp(2.25rem,3.8vw,3.25rem)] leading-[1.06] text-[#F5F6F8]">
          Six levels of proof.
        </h2>
        <p className="mt-3 text-[13px] text-[#64748B]">
          Pattyn, Dillen &amp; Goetz 2026 · Guest et al. 2006 · Wilson 1927
        </p>

        {/* Open 6-Row Horizontal Ledger */}
        <div className="mt-14 border-t border-white/[0.07]">
          {PROOF_LEVELS.map((item) => (
            <div
              key={item.code}
              className="relative py-4 border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-4"
            >
              <div className="flex items-center gap-12 sm:gap-20">
                <span
                  className={`font-mono-tabular text-[13px] ${
                    item.isGold ? "text-[#D4AF6A]" : "text-[#64748B]"
                  }`}
                >
                  {item.code} / {item.level}
                </span>
                <span
                  className={`text-[15px] ${
                    item.isGold ? "text-[#D4AF6A] font-medium" : "text-[#F5F6F8]"
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {item.note && (
                <span className="font-mono-tabular text-[11px] text-[#64748B]">
                  {item.note}
                </span>
              )}

              {item.isGold && (
                <motion.div
                  style={{ scaleX: barScale, originX: 0 }}
                  className="absolute bottom-[-1px] left-0 w-1/2 h-[2px] bg-[#D4AF6A]"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
