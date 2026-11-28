"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type ActIndex = 0 | 1 | 2 | 3;

const ACTS = [
  { id: 0 as ActIndex, code: "01", label: "ROSTER" },
  { id: 1 as ActIndex, code: "02", label: "MATRIX" },
  { id: 2 as ActIndex, code: "03", label: "ENGINE" },
  { id: 3 as ActIndex, code: "04", label: "STATEMENT" },
] as const;

const ACT_DURATION_MS = 3600;
const EASE_SWISS = [0.16, 1, 0.3, 1] as const;

const MATRIX_DATA = [
  {
    seg: "Clinics",
    cells: [
      { v: "4/3", bg: "#132B23", text: "#E2F2EC" },
      { v: "1/1", bg: "#0F1D19", text: "#9CA3AF" },
      { v: "2/2", bg: "#0F1D19", text: "#9CA3AF" },
      { v: "—", bg: "hatch", text: "#EF4444" },
    ],
  },
  {
    seg: "Dental",
    cells: [
      { v: "4/3", bg: "#132B23", text: "#E2F2EC" },
      { v: "3/2", bg: "#132B23", text: "#E2F2EC" },
      { v: "6/4", bg: "#183D31", text: "#F5F6F8" },
      { v: "—", bg: "hatch", text: "#EF4444" },
    ],
  },
  {
    seg: "Legal",
    cells: [
      { v: "2/2", bg: "#0F1D19", text: "#9CA3AF" },
      { v: "1/1", bg: "#0F1D19", text: "#9CA3AF" },
      { v: "—", bg: "hatch", text: "#EF4444" },
      { v: "—", bg: "hatch", text: "#EF4444" },
    ],
  },
] as const;

const LADDER = [
  { code: "L1", pct: 92, gold: false },
  { code: "L2", pct: 76, gold: false },
  { code: "L3", pct: 58, gold: false },
  { code: "L4", pct: 44, gold: false },
  { code: "L5", pct: 22, gold: false },
  { code: "L6", pct: 32, gold: true },
] as const;

export interface HeroPipelineDemoProps {
  /** Optional className for layout sizing in app/page.tsx */
  className?: string;
}

/**
 * Drop-in, 14.4s looping Swiss precision instrument for the Hectic homepage hero.
 * Exact 7:4 (560x320) desktop footprint matching the Smoked Obsidian + Champagne Gold UI.
 */
export function HeroPipelineDemo({ className = "" }: HeroPipelineDemoProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeAct, setActiveAct] = useState<ActIndex>(prefersReducedMotion ? 2 : 0);
  const [isPaused, setIsPaused] = useState(false);
  const [deduped, setDeduped] = useState(false);

  useEffect(() => {
    if (prefersReducedMotion || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveAct((prev) => ((prev + 1) % 4) as ActIndex);
    }, ACT_DURATION_MS);
    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, isPaused]);

  useEffect(() => {
    if (activeAct !== 0) {
      setDeduped(false);
      return;
    }
    if (prefersReducedMotion) {
      setDeduped(true);
      return;
    }
    setDeduped(false);
    const t = window.setTimeout(() => setDeduped(true), 1100);
    return () => window.clearTimeout(t);
  }, [activeAct, prefersReducedMotion]);

  return (
    <div
      className={`relative w-full max-w-[580px] aspect-[7/4] min-h-[332px] select-none overflow-hidden border border-white/[0.09] bg-[#0A0C10] text-[#F5F6F8] flex flex-col justify-between ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 85% 55% at 50% 0%, rgba(212,175,106,0.06), transparent 70%), radial-gradient(ellipse 60% 45% at 85% 100%, rgba(16,185,129,0.04), transparent 65%)",
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Hectic deterministic evidence engine live demonstration"
    >
      {/* Swiss Caliper Corner Registration Micro-Ticks */}
      <span className="pointer-events-none absolute top-0 left-0 h-2.5 w-2.5 border-t border-l border-[#D4AF6A]/60" />
      <span className="pointer-events-none absolute top-0 right-0 h-2.5 w-2.5 border-t border-r border-[#D4AF6A]/60" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l border-[#D4AF6A]/60" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-[#D4AF6A]/60" />

      {/* Subtle 2.5% Matte Grain Layer */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Top Instrument Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/[0.08] px-5 py-3">
        <div className="flex items-center gap-4">
          {ACTS.map((act) => {
            const isActive = activeAct === act.id;
            return (
              <button
                key={act.code}
                type="button"
                onClick={() => setActiveAct(act.id)}
                className="group relative pb-0.5 text-left transition-colors focus:outline-none"
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className={`font-mono text-[10.5px] tracking-[0.12em] tabular-nums transition-colors ${
                    isActive
                      ? "text-[#F5F6F8]"
                      : "text-[#64748B] group-hover:text-[#9CA3AF]"
                  }`}
                >
                  <span className={isActive ? "text-[#D4AF6A] mr-1" : "mr-1"}>
                    {act.code}
                  </span>
                  {act.label}
                </span>

                {isActive && (
                  <motion.span
                    key={`prog-${act.id}-${isPaused ? "p" : "r"}`}
                    className="absolute -bottom-[13px] left-0 right-0 h-[1.5px] origin-left bg-[#D4AF6A]"
                    initial={{ scaleX: prefersReducedMotion ? 1 : 0 }}
                    animate={{ scaleX: isPaused ? undefined : 1 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0 }
                        : { duration: ACT_DURATION_MS / 1000, ease: "linear" }
                    }
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          <span className="font-mono text-[10px] tracking-[0.1em] text-[#9CA3AF] tabular-nums">
            ENGINE v1.0.0
          </span>
        </div>
      </div>

      {/* Main Stage */}
      <div className="relative z-10 flex-1 overflow-hidden px-5 py-4 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {activeAct === 0 && (
            <ActRosterFunnel
              key="act-0"
              deduped={deduped}
              reducedMotion={Boolean(prefersReducedMotion)}
            />
          )}
          {activeAct === 1 && (
            <ActCoverageMatrix
              key="act-1"
              reducedMotion={Boolean(prefersReducedMotion)}
            />
          )}
          {activeAct === 2 && (
            <ActWilsonCaliper
              key="act-2"
              reducedMotion={Boolean(prefersReducedMotion)}
            />
          )}
          {activeAct === 3 && (
            <ActEvidenceStatement
              key="act-3"
              reducedMotion={Boolean(prefersReducedMotion)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Telemetry Strip */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/[0.08] bg-[#07080A]/70 px-5 py-2.5 font-mono text-[10px] tracking-[0.08em] text-[#64748B] tabular-nums">
        <span className="truncate">
          {activeAct === 0 &&
            (deduped
              ? "ANTI-PSEUDOREPLICATION · 25 ROWS → 16 ORGS"
              : "LOCAL PII REDACTION · SCANNING CSV ROSTER")}
          {activeAct === 1 && "COVERAGE HEATMAP · 3 SEGMENTS × 4 ROLES"}
          {activeAct === 2 && "WILSON 95% CI · EXACT SMALL-SAMPLE PRECISION"}
          {activeAct === 3 && "sha256:e8d703d98e116a84 · INVESTOR CHECKPOINT"}
        </span>
        <button
          type="button"
          onClick={() => setIsPaused((p) => !p)}
          className="ml-3 shrink-0 text-[#9CA3AF] hover:text-[#D4AF6A] transition-colors"
        >
          {isPaused ? "▶ RESUME" : `0${activeAct + 1} / 04`}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ACT 01 — VISUAL PII REDACTION + SVG NODE-TO-ORG DEDUPLICATION FUNNEL       */
/* -------------------------------------------------------------------------- */
function ActRosterFunnel({
  deduped,
  reducedMotion,
}: {
  deduped: boolean;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
      transition={{ duration: 0.3, ease: EASE_SWISS }}
      className="space-y-3"
    >
      <div className="flex items-baseline justify-between">
        <h3
          className="text-[22px] leading-none text-[#F5F6F8]"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          {deduped ? "Independent organisations isolated." : "Ingesting interview roster"}
        </h3>
        <span
          className={`border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.1em] transition-colors duration-300 ${
            deduped
              ? "border-[#10B981]/35 bg-[#0F1D19] text-[#10B981]"
              : "border-white/[0.1] bg-white/[0.03] text-[#9CA3AF]"
          }`}
        >
          {deduped ? "PII REDACTED" : "25 RAW ROWS"}
        </span>
      </div>

      {/* Left-to-Right Visual Merge Diagram (5 Interviews -> 3 Independent Orgs) */}
      <div className="relative grid grid-cols-12 items-center gap-2 pt-1">
        {/* Left: 5 Raw Interview Rows */}
        <div className="col-span-6 space-y-1.5 relative">
          {!reducedMotion && (
            <motion.div
              className="pointer-events-none absolute -left-1 -right-1 h-[1.5px] bg-[#D4AF6A] z-20"
              initial={{ top: "0%", opacity: 0 }}
              animate={{ top: ["0%", "100%"], opacity: [0, 1, 0] }}
              transition={{ duration: 1.0, delay: 0.35, ease: "easeInOut" }}
            />
          )}
          {[
            { org: "Acme Health", name: "Sarah K.", dup: false },
            { org: "Acme Health", name: "David R.", dup: true },
            { org: "Acme Health", name: "Priya M.", dup: true },
            { org: "Northstar Dental", name: "Dr. Chen", dup: false },
            { org: "Vanguard Legal", name: "M. Vance", dup: false },
          ].map((r, i) => (
            <div
              key={i}
              className={`flex items-center justify-between border px-2.5 py-1 font-mono text-[10px] tabular-nums transition-all duration-400 ${
                deduped && r.dup
                  ? "border-white/[0.04] bg-white/[0.01] text-[#475569]"
                  : "border-white/[0.08] bg-[#0F1218] text-[#F5F6F8]"
              }`}
            >
              <span className="truncate">{r.org}</span>
              <span
                className={`ml-2 shrink-0 text-[9.5px] ${
                  deduped ? "text-[#64748B]" : "text-[#9CA3AF]"
                }`}
              >
                {deduped ? "██████" : r.name}
              </span>
            </div>
          ))}
        </div>

        {/* Center: Precision SVG Bezier Funnel Connectors */}
        <div className="col-span-2 flex items-center justify-center">
          <svg viewBox="0 0 80 150" className="w-full h-[142px] overflow-visible">
            {/* 3 Acme rows converging into Org 1 */}
            <motion.path
              d="M 0 15 C 40 15, 40 30, 80 30"
              fill="none"
              stroke={deduped ? "#D4AF6A" : "#334155"}
              strokeWidth="1.2"
              initial={{ pathLength: reducedMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
            <motion.path
              d="M 0 45 C 40 45, 40 30, 80 30"
              fill="none"
              stroke={deduped ? "#D4AF6A" : "#334155"}
              strokeWidth="1"
              strokeDasharray="3 3"
              initial={{ pathLength: reducedMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            <motion.path
              d="M 0 75 C 40 75, 40 30, 80 30"
              fill="none"
              stroke={deduped ? "#D4AF6A" : "#334155"}
              strokeWidth="1"
              strokeDasharray="3 3"
              initial={{ pathLength: reducedMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            />
            {/* Northstar -> Org 2 */}
            <motion.path
              d="M 0 105 C 40 105, 40 82, 80 82"
              fill="none"
              stroke={deduped ? "#10B981" : "#334155"}
              strokeWidth="1.2"
              initial={{ pathLength: reducedMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            />
            {/* Vanguard -> Org 3 */}
            <motion.path
              d="M 0 135 C 40 135, 40 130, 80 130"
              fill="none"
              stroke={deduped ? "#10B981" : "#334155"}
              strokeWidth="1.2"
              initial={{ pathLength: reducedMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
            />
          </svg>
        </div>

        {/* Right: Deduplicated Independent Org Units */}
        <div className="col-span-4 space-y-2.5">
          {[
            { id: "org_01", tag: "3→1 ORG", level: "L6", gold: true },
            { id: "org_02", tag: "1 ORG", level: "L6", gold: true },
            { id: "org_03", tag: "1 ORG", level: "L4", gold: false },
          ].map((o, idx) => (
            <motion.div
              key={o.id}
              initial={{ opacity: reducedMotion ? 1 : 0.35 }}
              animate={{ opacity: deduped ? 1 : 0.45 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className={`border px-2.5 py-2 font-mono text-[10px] tabular-nums ${
                deduped && o.gold
                  ? "border-[#D4AF6A]/45 bg-[#14130F]"
                  : "border-white/[0.1] bg-[#0E1117]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[#F5F6F8]">{o.id}</span>
                <span className={o.gold ? "text-[#D4AF6A]" : "text-[#10B981]"}>
                  {o.level}
                </span>
              </div>
              <div className="mt-0.5 text-[9px] text-[#64748B]">{o.tag}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* ACT 02 — ARCHITECTURAL COVERAGE HEATMAP + L1-L6 EVIDENCE LADDER            */
/* -------------------------------------------------------------------------- */
function ActCoverageMatrix({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
      transition={{ duration: 0.3, ease: EASE_SWISS }}
      className="grid grid-cols-12 gap-5 items-center"
    >
      {/* Left 7 Cols: Flat Matte Coverage Heatmap */}
      <div className="col-span-8 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] tracking-[0.1em] text-[#9CA3AF]">
            COVERAGE MATRIX
          </span>
          <span className="font-mono text-[9.5px] text-[#EF4444]">
            4 BLIND SPOTS
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1 font-mono text-[9px] text-[#64748B] pb-0.5">
          <span />
          <span className="text-center">ECON</span>
          <span className="text-center">TECH</span>
          <span className="text-center">USER</span>
          <span className="text-center">INFL</span>
        </div>

        <div className="space-y-1">
          {MATRIX_DATA.map((row, rIdx) => (
            <div key={row.seg} className="grid grid-cols-5 items-center gap-1">
              <span className="font-sans text-[11px] text-[#9CA3AF] truncate">
                {row.seg}
              </span>
              {row.cells.map((cell, cIdx) => {
                const isHatch = cell.bg === "hatch";
                return (
                  <motion.div
                    key={`${row.seg}-${cIdx}`}
                    initial={{ opacity: reducedMotion ? 1 : 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      duration: 0.3,
                      delay: reducedMotion ? 0 : (rIdx * 4 + cIdx) * 0.04,
                    }}
                    style={
                      isHatch
                        ? {
                            backgroundImage:
                              "repeating-linear-gradient(-45deg, rgba(239,68,68,0.09) 0px, rgba(239,68,68,0.09) 2px, transparent 2px, transparent 7px)",
                          }
                        : { backgroundColor: cell.bg }
                    }
                    className={`border py-2 text-center font-mono text-[10px] tabular-nums ${
                      isHatch ? "border-[#EF4444]/25" : "border-white/[0.07]"
                    }`}
                  >
                    <span style={{ color: cell.text }}>{cell.v}</span>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Right 4 Cols: L1-L6 Stepped Ladder */}
      <div className="col-span-4 border-l border-white/[0.08] pl-4 space-y-2.5">
        <span className="block font-mono text-[10px] tracking-[0.1em] text-[#9CA3AF]">
          EVIDENCE LADDER
        </span>
        <div className="space-y-2">
          {LADDER.map((item, idx) => (
            <div key={item.code} className="space-y-1">
              <div className="flex justify-between font-mono text-[9.5px] tabular-nums">
                <span className={item.gold ? "text-[#D4AF6A]" : "text-[#9CA3AF]"}>
                  {item.code}
                </span>
                <span className="text-[#64748B]">
                  {item.gold ? "3 orgs" : `${Math.round(item.pct / 8)} orgs`}
                </span>
              </div>
              <div className="h-[2.5px] w-full bg-white/[0.07] overflow-hidden">
                <motion.div
                  className="h-full origin-left"
                  style={{
                    backgroundColor: item.gold ? "#D4AF6A" : "#475569",
                  }}
                  initial={{ scaleX: reducedMotion ? item.pct / 100 : 0 }}
                  animate={{ scaleX: item.pct / 100 }}
                  transition={{
                    duration: 0.55,
                    delay: reducedMotion ? 0 : idx * 0.06,
                    ease: EASE_SWISS,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* ACT 03 — HOROLOGY-GRADE WILSON 95% CI CALIPER INSTRUMENT                   */
/* -------------------------------------------------------------------------- */
function ActWilsonCaliper({ reducedMotion }: { reducedMotion: boolean }) {
  const ticks = Array.from({ length: 21 }, (_, i) => i);

  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
      transition={{ duration: 0.3, ease: EASE_SWISS }}
      className="space-y-4"
    >
      <div className="flex items-baseline justify-between">
        <h3
          className="text-[24px] leading-none text-[#10B981]"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          L6 Payment &middot; 3 orgs &middot; Supported
        </h3>
        <span className="border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-2 py-0.5 font-mono text-[9.5px] tracking-[0.08em] text-[#F59E0B]">
          PREVALENCE IMPRECISE
        </span>
      </div>

      {/* Watchmaker 20-Tick Caliper Ruler + Animated Wilson Span */}
      <div className="relative pt-2 pb-1">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] tabular-nums">
          <span className="text-[#64748B]">WILSON 95% CONFIDENCE INTERVAL</span>
          <span className="text-[#D4AF6A]">[0.44, 1.00] &middot; &plusmn;0.28</span>
        </div>

        <svg viewBox="0 0 500 54" className="w-full h-[54px] overflow-visible">
          {/* Subtle Beta Density Silhouette over [0.44, 1.00] */}
          <motion.path
            d="M 220 34 Q 340 4, 498 8 L 498 34 Z"
            fill="rgba(212, 175, 106, 0.08)"
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7 }}
          />

          {/* Base 1px Hairline Axis */}
          <line x1="2" y1="34" x2="498" y2="34" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />

          {/* 21 Micro-Millimeter Ruler Ticks */}
          {ticks.map((t) => {
            const x = 2 + (t / 20) * 496;
            const isMajor = t % 5 === 0;
            return (
              <line
                key={t}
                x1={x}
                y1={isMajor ? 27 : 31}
                x2={x}
                y2={34}
                stroke={isMajor ? "rgba(255,255,255,0.32)" : "rgba(255,255,255,0.14)"}
                strokeWidth="1"
              />
            );
          })}

          {/* Animated Brushed Gold [0.44, 1.00] Span */}
          <motion.line
            x1="220"
            y1="34"
            x2="498"
            y2="34"
            stroke="#D4AF6A"
            strokeWidth="2.5"
            initial={{ pathLength: reducedMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: EASE_SWISS }}
          />

          {/* Lower Bound Caliper Bracket at 0.44 (x=220) */}
          <line x1="220" y1="22" x2="220" y2="40" stroke="#D4AF6A" strokeWidth="1.5" />

          {/* Animated Tolerance Diamond Marker */}
          <motion.polygon
            points="0,-5 5,0 0,5 -5,0"
            fill="#D4AF6A"
            initial={{ x: reducedMotion ? 390 : 220, y: 34 }}
            animate={{ x: 390, y: 34 }}
            transition={{ duration: 0.85, ease: EASE_SWISS }}
          />

          {/* Scale Labels */}
          <text x="2" y="51" fill="#64748B" fontSize="10" fontFamily="monospace">
            0.00
          </text>
          <text x="220" y="51" fill="#D4AF6A" fontSize="10" fontFamily="monospace" textAnchor="middle">
            0.44
          </text>
          <text x="390" y="51" fill="#9CA3AF" fontSize="10" fontFamily="monospace" textAnchor="middle">
            0.78 target
          </text>
          <text x="498" y="51" fill="#F5F6F8" fontSize="10" fontFamily="monospace" textAnchor="end">
            1.00
          </text>
        </svg>
      </div>

      {/* Verdict Summary Strip */}
      <div className="grid grid-cols-2 gap-3 border-t border-white/[0.08] pt-3 font-mono text-[10px] tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-[#9CA3AF]">THEME CLAIM</span>
          <span className="text-[#10B981]">SUPPORTED</span>
        </div>
        <div className="flex items-center justify-between border-l border-white/[0.08] pl-3">
          <span className="text-[#9CA3AF]">PREVALENCE</span>
          <span className="text-[#EF4444]">BLOCKED</span>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* ACT 04 — MINI WARM PORCELAIN EVIDENCE STATEMENT + SHA-256 PROOF            */
/* -------------------------------------------------------------------------- */
function ActEvidenceStatement({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -8 }}
      transition={{ duration: 0.3, ease: EASE_SWISS }}
      className="grid grid-cols-12 gap-4 items-stretch"
    >
      {/* Left 7 Cols: Miniature Warm Porcelain Print-Ready Statement (Matches /runs/[id]) */}
      <div className="col-span-7 bg-[#F8F7F4] text-[#0F172A] p-4 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-baseline justify-between border-b border-[#0F172A]/15 pb-2">
            <h4
              className="text-[19px] leading-none tracking-[-0.02em]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Evidence Statement
            </h4>
            <span className="font-mono text-[8.5px] text-[#475569]">16 ORGS</span>
          </div>

          <div className="mt-2.5 divide-y divide-[#0F172A]/10 font-mono text-[9.5px] tabular-nums">
            <div className="flex items-center justify-between py-1.5">
              <span>01 &middot; Recurring pain &middot; L6</span>
              <span className="font-semibold text-[#0B534D]">Supported</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span>02 &middot; Willingness to pay</span>
              <span className="font-semibold text-[#991B1B]">Blocked</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <motion.div
            className="h-[1px] w-full origin-left bg-[#D4AF6A]"
            initial={{ scaleX: reducedMotion ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, ease: EASE_SWISS }}
          />
          <div className="mt-1.5 flex justify-between font-mono text-[8px] text-[#475569] tabular-nums">
            <span>SHA-256 e8d703d98e11</span>
            <span>ENGINE 1.0.0</span>
          </div>
        </div>
      </div>

      {/* Right 5 Cols: Cryptographic Gate Inspector */}
      <div className="col-span-5 flex flex-col justify-between border-l border-white/[0.08] pl-4 py-0.5">
        <div className="space-y-2.5">
          <span className="inline-block border border-[#4C1D24] bg-[#2A1215] px-2 py-0.5 font-mono text-[9.5px] tracking-[0.08em] text-[#EF4444]">
            CHECKPOINT BLOCKED
          </span>

          <div className="space-y-1.5 font-mono text-[9.5px] text-[#9CA3AF]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-3 w-3 items-center justify-center bg-[#D4AF6A] text-[8px] text-[#08090B]">
                ✓
              </span>
              <span className="text-[#F5F6F8]">Falsifier observable</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 border border-white/25" />
              <span>Narrow Wilson CI</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.08] pt-2 font-mono text-[9px] tabular-nums">
          <div className="text-[#64748B]">VERIFIED DIGEST</div>
          <div className="mt-0.5 text-[#D4AF6A] truncate">e8d703d98e116a84c4f1</div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Default export wraps HeroPipelineDemo on a matching Smoked Obsidian stage
 * so standalone Canvas previews render with the exact luxury dark contrast.
 */
export default function HeroPipelineDemoPreview() {
  return (
    <div className="min-h-screen w-full bg-[#07080A] flex items-center justify-center p-6">
      <HeroPipelineDemo />
    </div>
  );
}
