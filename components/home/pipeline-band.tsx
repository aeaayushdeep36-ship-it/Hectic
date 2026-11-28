"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface PipelineStage {
  readonly num: string;
  readonly title: string;
  readonly subtitle: string;
}

const STAGES: readonly PipelineStage[] = [
  {
    num: "01",
    title: "Roster",
    subtitle: "Local PII redaction & org deduplication",
  },
  {
    num: "02",
    title: "Formalise",
    subtitle: "Language-only Zod extraction",
  },
  {
    num: "03",
    title: "Engine",
    subtitle: "Pure deterministic coverage & Wilson math",
  },
  {
    num: "04",
    title: "Statement",
    subtitle: "Blocking checkpoint & SHA-256 export",
  },
];

const MATRIX_ROWS: ReadonlyArray<{
  role: string;
  cells: readonly { value: string; tone: string }[];
}> = [
  {
    role: "Economic",
    cells: [
      { value: "4 / 3 orgs", tone: "bg-[#183D31] text-[#F5F6F8]" },
      { value: "6 / 4 orgs", tone: "bg-[#132B23] text-[#F5F6F8]" },
      { value: "4 / 3 orgs", tone: "bg-[#183D31] text-[#F5F6F8]" },
    ],
  },
  {
    role: "Technical",
    cells: [
      { value: "6 / 3 orgs", tone: "bg-[#0F1D19] text-[#F5F6F8]" },
      { value: "6 / 4 orgs", tone: "bg-[#183D31] text-[#F5F6F8]" },
      { value: "6 / 4 orgs", tone: "bg-[#132B23] text-[#F5F6F8]" },
    ],
  },
  {
    role: "User",
    cells: [
      { value: "4 / 3 orgs", tone: "bg-[#0F1D19] text-[#F5F6F8]" },
      { value: "4 / 4 orgs", tone: "bg-[#0F1D19] text-[#F5F6F8]" },
      { value: "4 / 3 orgs", tone: "bg-[#183D31] text-[#F5F6F8]" },
    ],
  },
];

export function PipelineBand() {
  const [activeIndex, setActiveIndex] = useState(2);
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.stageIndex);
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx);
            }
          }
        }
      },
      {
        rootMargin: "-40% 0px -40% 0px",
        threshold: 0.1,
      },
    );

    for (const el of stepRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="pipeline"
      className="bg-[#0C0E13] border-y border-white/[0.06] py-32"
    >
      <div className="mx-auto max-w-[1360px] px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        {/* Left Scrolling Chapters */}
        <div className="lg:col-span-5">
          <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#64748B] mb-4">
            03 / THE PIPELINE
          </p>
          <h2 className="font-display text-[clamp(2.25rem,3.8vw,3.25rem)] leading-[1.06] text-[#F5F6F8]">
            Four deterministic stages.
            <br />
            Zero model guesswork.
          </h2>

          <div className="mt-14 space-y-6 lg:space-y-24 lg:pb-24">
            {STAGES.map((stage, idx) => {
              const isActive = idx === activeIndex;
              return (
                <button
                  key={stage.num}
                  ref={(el) => {
                    stepRefs.current[idx] = el;
                  }}
                  data-stage-index={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full text-left pl-5 py-2 border-l-2 transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "border-[#D4AF6A] opacity-100"
                      : "border-transparent opacity-40 hover:opacity-75"
                  }`}
                >
                  <div className="flex items-baseline gap-3 text-[15px]">
                    <span className="font-mono-tabular text-[13px] text-[#9CA3AF]">
                      {stage.num}
                    </span>
                    <span className="font-medium text-[#F5F6F8]">{stage.title}</span>
                    <span className="text-[#9CA3AF]">— {stage.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Pinned Sticky Stage */}
        <div className="lg:col-span-7 lg:sticky lg:top-28 lg:self-start">
          <div className="bg-[#0E1014] border border-white/[0.08] rounded-[2px] p-6 sm:p-8 min-h-[380px] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              {activeIndex === 0 && (
                <motion.div
                  key="stage-0"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                    <span className="text-[13px] text-[#F5F6F8]">
                      Roster Ingestion &amp; Redaction
                    </span>
                    <span className="font-mono-tabular text-[11px] text-[#10B981]">
                      PII REDACTED LOCALLY
                    </span>
                  </div>
                  <div className="divide-y divide-white/[0.06] font-mono-tabular text-[12px]">
                    {[
                      { org: "org_014", seg: "Clinics", role: "Economic", level: "L6" },
                      { org: "org_021", seg: "Dental", role: "User", level: "L4" },
                      { org: "org_008", seg: "Legal", role: "Technical", level: "L2" },
                      { org: "org_019", seg: "Clinics", role: "Economic", level: "L6" },
                    ].map((row, idx) => (
                      <div key={idx} className="py-3 flex items-center justify-between text-[#9CA3AF]">
                        <span className="text-[#F5F6F8]">{row.org}</span>
                        <span>{row.seg}</span>
                        <span>{row.role}</span>
                        <span className="text-[#D4AF6A]">{row.level}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeIndex === 1 && (
                <motion.div
                  key="stage-1"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                    <span className="text-[13px] text-[#F5F6F8]">
                      Formaliser Zod Schema
                    </span>
                    <span className="font-mono-tabular text-[11px] text-[#D4AF6A]">
                      LANGUAGE-ONLY PARSE
                    </span>
                  </div>
                  <pre className="font-mono-tabular text-[12px] leading-[1.7] text-[#9CA3AF] overflow-x-auto m-0">
{`{
  "claimType": "prevalence",
  "kind": "willingness_to_pay",
  "population": "Clinics · Economic buyers",
  "claimedLevel": 6,
  "observed": { "k": 3, "n": 3 },
  "precisionTolerance": 0.30
}`}
                  </pre>
                </motion.div>
              )}

              {activeIndex === 2 && (
                <motion.div
                  key="stage-2"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-[#F5F6F8]">Coverage Matrix</span>
                  </div>

                  <div className="border border-white/[0.08]">
                    <table className="w-full border-collapse text-[12px]">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-[#9CA3AF]">
                          <th className="py-2.5 px-3 text-left font-normal w-28" />
                          <th className="py-2.5 px-3 text-center font-normal border-l border-white/[0.08]">
                            Clinics
                          </th>
                          <th className="py-2.5 px-3 text-center font-normal border-l border-white/[0.08]">
                            Dental
                          </th>
                          <th className="py-2.5 px-3 text-center font-normal border-l border-white/[0.08]">
                            Legal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {MATRIX_ROWS.map((row) => (
                          <tr key={row.role} className="border-b border-white/[0.08] last:border-b-0">
                            <td className="py-4 px-3 text-[#9CA3AF]">{row.role}</td>
                            {row.cells.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`py-4 px-3 text-center font-mono-tabular text-[11px] border-l border-white/[0.08] ${cell.tone}`}
                              >
                                {cell.value}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Wilson 95% CI line */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[12px] text-[#9CA3AF]">Wilson 95% CI line</p>
                      <p className="font-mono-tabular text-[11px] text-[#64748B]">
                        [0.44, 1.00]
                      </p>
                    </div>
                    <div className="flex-1 min-w-[200px] max-w-[340px]">
                      <div className="relative h-5 flex items-center">
                        <div className="w-full h-[1px] bg-white/15" />
                        <div className="absolute left-0 top-1 bottom-1 w-[1px] bg-white/30" />
                        <div className="absolute right-0 top-1 bottom-1 w-[1px] bg-white/30" />
                        <div className="absolute left-[44%] top-1 bottom-1 w-[1px] bg-[#D4AF6A]" />
                        <div className="absolute left-[44%] right-0 h-[1px] bg-[#D4AF6A]" />
                      </div>
                      <p className="mt-1 text-center font-mono-tabular text-[11px] text-[#9CA3AF]">
                        [0.44, 1.00]
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeIndex === 3 && (
                <motion.div
                  key="stage-3"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22 }}
                  className="bg-[#F8F7F4] text-[#0F172A] p-6 space-y-5 rounded-[2px]"
                >
                  <div className="border-b border-[#0F172A]/15 pb-3">
                    <h3 className="font-display text-[28px] leading-none text-[#0F172A]">
                      Evidence Statement
                    </h3>
                    <p className="mt-1.5 font-mono-tabular text-[11px] text-[#475569]">
                      16 independent organisations · Engine v1.0.0
                    </p>
                  </div>
                  <div className="space-y-2 font-mono-tabular text-[12px]">
                    <div className="flex justify-between py-1.5 border-b border-[#0F172A]/10">
                      <span>01 · Recurring follow-up</span>
                      <span className="text-[#059669]">Supported</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#0F172A]/10">
                      <span>02 · Willingness to pay</span>
                      <span className="text-[#DC2626]">Blocked · CI width</span>
                    </div>
                  </div>
                  <p className="font-mono-tabular text-[11px] text-[#475569] pt-2">
                    SHA-256 e8d703d98e116a84 · FALSIFIER CHECK REQUIRED
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
