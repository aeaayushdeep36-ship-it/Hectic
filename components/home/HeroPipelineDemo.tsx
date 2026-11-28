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
      { v: "4/3", bg: "var(--heatmap-2)", text: "var(--ink-primary)" },
      { v: "1/1", bg: "var(--heatmap-1)", text: "var(--ink-secondary)" },
      { v: "2/2", bg: "var(--heatmap-1)", text: "var(--ink-secondary)" },
      { v: "—", bg: "hatch", text: "var(--status-crimson)" },
    ],
  },
  {
    seg: "Dental",
    cells: [
      { v: "4/3", bg: "var(--heatmap-2)", text: "var(--ink-primary)" },
      { v: "3/2", bg: "var(--heatmap-2)", text: "var(--ink-primary)" },
      { v: "6/4", bg: "var(--heatmap-3)", text: "var(--ink-primary)" },
      { v: "—", bg: "hatch", text: "var(--status-crimson)" },
    ],
  },
  {
    seg: "Legal",
    cells: [
      { v: "2/2", bg: "var(--heatmap-1)", text: "var(--ink-secondary)" },
      { v: "1/1", bg: "var(--heatmap-1)", text: "var(--ink-secondary)" },
      { v: "—", bg: "hatch", text: "var(--status-crimson)" },
      { v: "—", bg: "hatch", text: "var(--status-crimson)" },
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
 * Exact 7:4 (560x320) desktop footprint matching the Smoked Obsidian + Champagne Gold
 * and Archival Alabaster + Burnished Brass themes.
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
      className={`relative w-full max-w-[580px] aspect-[7/4] min-h-[332px] select-none overflow-hidden border border-[var(--border-hair)] bg-[var(--bg-surface)] text-[var(--ink-primary)] flex flex-col justify-between ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Hectic deterministic evidence engine live demonstration"
    >
      {/* Swiss Caliper Corner Registration Micro-Ticks */}
      <span className="pointer-events-none absolute top-0 left-0 h-2.5 w-2.5 border-t border-l border-[var(--accent-graphic)]" />
      <span className="pointer-events-none absolute top-0 right-0 h-2.5 w-2.5 border-t border-r border-[var(--accent-graphic)]" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l border-[var(--accent-graphic)]" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-[var(--accent-graphic)]" />

      {/* Top Instrument Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-[var(--border-hair)] px-5 py-3">
        <div className="flex items-center gap-4">
          {ACTS.map((act) => {
            const isActive = activeAct === act.id;
            return (
              <button
                key={act.code}
                type="button"
                onClick={() => setActiveAct(act.id)}
                className="group relative pb-0.5 text-left transition-colors focus:outline-none cursor-pointer"
                aria-current={isActive ? "step" : undefined}
              >
                <span
                  className={`font-mono text-[10.5px] tracking-[0.12em] tabular-nums transition-colors ${
                    isActive
                      ? "text-[var(--ink-primary)]"
                      : "text-[var(--ink-muted)] group-hover:text-[var(--ink-secondary)]"
                  }`}
                >
                  <span className={isActive ? "text-[var(--accent-text)] mr-1" : "mr-1"}>
                    {act.code}
                  </span>
                  {act.label}
                </span>

                {isActive && (
                  <motion.span
                    key={`prog-${act.id}-${isPaused ? "p" : "r"}`}
                    className="absolute -bottom-[13px] left-0 right-0 h-[1.5px] origin-left bg-[var(--accent-graphic)]"
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
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-emerald)]" />
          <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--ink-secondary)] tabular-nums">
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
      <div className="relative z-10 flex items-center justify-between border-t border-[var(--border-hair)] bg-[var(--bg-canvas)]/70 px-5 py-2.5 font-mono text-[10px] tracking-[0.08em] text-[var(--ink-muted)] tabular-nums">
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
          className="ml-3 shrink-0 text-[var(--ink-secondary)] hover:text-[var(--accent-text)] transition-colors cursor-pointer"
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
          className="text-[22px] leading-none text-[var(--ink-primary)]"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          {deduped ? "Independent organisations isolated." : "Ingesting interview roster"}
        </h3>
        <span
          className="border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.1em] transition-colors duration-300"
          style={
            deduped
              ? {
                  borderColor: "var(--status-emerald)",
                  backgroundColor: "var(--status-emerald-bg)",
                  color: "var(--status-emerald)",
                }
              : {
                  borderColor: "var(--border-hair)",
                  backgroundColor: "var(--bg-elevated)",
                  color: "var(--ink-secondary)",
                }
          }
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
              className="pointer-events-none absolute -left-1 -right-1 h-[1.5px] bg-[var(--accent-graphic)] z-20"
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
                  ? "border-[var(--border-hair)] bg-[var(--bg-canvas)]/40 text-[var(--ink-muted)]"
                  : "border-[var(--border-hair)] bg-[var(--bg-elevated)] text-[var(--ink-primary)]"
              }`}
            >
              <span className="truncate">{r.org}</span>
              <span className="ml-2 shrink-0 text-[9.5px] text-[var(--ink-muted)]">
                {deduped ? "██████" : r.name}
              </span>
            </div>
          ))}
        </div>

        {/* Center: Precision SVG Bezier Funnel Connectors */}
        <div className="col-span-2 flex items-center justify-center">
          <svg viewBox="0 0 80 150" className="w-full h-[142px] overflow-visible">
            <motion.path
              d="M 0 15 C 40 15, 40 30, 80 30"
              fill="none"
              stroke={deduped ? "var(--accent-graphic)" : "var(--ink-muted)"}
              strokeWidth="1.2"
              initial={{ pathLength: reducedMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
            <motion.path
              d="M 0 45 C 40 45, 40 30, 80 30"
              fill="none"
              stroke={deduped ? "var(--accent-graphic)" : "var(--ink-muted)"}
              strokeWidth="1"
              strokeDasharray="3 3"
              initial={{ pathLength: reducedMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            />
            <motion.path
              d="M 0 75 C 40 75, 40 30, 80 30"
              fill="none"
              stroke={deduped ? "var(--accent-graphic)" : "var(--ink-muted)"}
              strokeWidth="1"
              strokeDasharray="3 3"
              initial={{ pathLength: reducedMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            />
            <motion.path
              d="M 0 105 C 40 105, 40 82, 80 82"
              fill="none"
              stroke={deduped ? "var(--status-emerald)" : "var(--ink-muted)"}
              strokeWidth="1.2"
              initial={{ pathLength: reducedMotion ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            />
            <motion.path
              d="M 0 135 C 40 135, 40 130, 80 130"
              fill="none"
              stroke={deduped ? "var(--status-emerald)" : "var(--ink-muted)"}
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
              className="border px-2.5 py-2 font-mono text-[10px] tabular-nums bg-[var(--bg-elevated)]"
              style={{
                borderColor:
                  deduped && o.gold ? "var(--accent-graphic)" : "var(--border-hair)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[var(--ink-primary)]">{o.id}</span>
                <span
                  style={{
                    color: o.gold ? "var(--accent-text)" : "var(--status-emerald)",
                  }}
                >
                  {o.level}
                </span>
              </div>
              <div className="mt-0.5 text-[9px] text-[var(--ink-muted)]">{o.tag}</div>
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
      {/* Left 8 Cols: Flat Matte Coverage Heatmap */}
      <div className="col-span-8 space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[10px] tracking-[0.1em] text-[var(--ink-secondary)]">
            COVERAGE MATRIX
          </span>
          <span className="font-mono text-[9.5px] text-[var(--status-crimson)]">
            4 BLIND SPOTS
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1 font-mono text-[9px] text-[var(--ink-muted)] pb-0.5">
          <span />
          <span className="text-center">ECON</span>
          <span className="text-center">TECH</span>
          <span className="text-center">USER</span>
          <span className="text-center">INFL</span>
        </div>

        <div className="space-y-1">
          {MATRIX_DATA.map((row, rIdx) => (
            <div key={row.seg} className="grid grid-cols-5 items-center gap-1">
              <span className="font-sans text-[11px] text-[var(--ink-secondary)] truncate">
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
                              "repeating-linear-gradient(-45deg, rgba(153,27,27,0.09) 0px, rgba(153,27,27,0.09) 2px, transparent 2px, transparent 7px)",
                            borderColor: "var(--status-crimson-border)",
                          }
                        : {
                            backgroundColor: cell.bg,
                            borderColor: "var(--border-hair)",
                          }
                    }
                    className="border py-2 text-center font-mono text-[10px] tabular-nums"
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
      <div className="col-span-4 border-l border-[var(--border-hair)] pl-4 space-y-2.5">
        <span className="block font-mono text-[10px] tracking-[0.1em] text-[var(--ink-secondary)]">
          EVIDENCE LADDER
        </span>
        <div className="space-y-2">
          {LADDER.map((item, idx) => (
            <div key={item.code} className="space-y-1">
              <div className="flex justify-between font-mono text-[9.5px] tabular-nums">
                <span
                  style={{
                    color: item.gold ? "var(--accent-text)" : "var(--ink-secondary)",
                  }}
                >
                  {item.code}
                </span>
                <span className="text-[var(--ink-muted)]">
                  {item.gold ? "3 orgs" : `${Math.round(item.pct / 8)} orgs`}
                </span>
              </div>
              <div className="h-[2.5px] w-full bg-[var(--border-hair)] overflow-hidden">
                <motion.div
                  className="h-full origin-left"
                  style={{
                    backgroundColor: item.gold
                      ? "var(--accent-graphic)"
                      : "var(--ink-muted)",
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
          className="text-[24px] leading-none text-[var(--status-emerald)]"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          L6 Payment &middot; 3 orgs &middot; Supported
        </h3>
        <span
          className="border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.08em]"
          style={{
            borderColor: "var(--status-amber)",
            backgroundColor: "var(--status-amber-bg)",
            color: "var(--status-amber)",
          }}
        >
          PREVALENCE IMPRECISE
        </span>
      </div>

      {/* Watchmaker 20-Tick Caliper Ruler + Animated Wilson Span */}
      <div className="relative pt-2 pb-1">
        <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] tabular-nums">
          <span className="text-[var(--ink-muted)]">WILSON 95% CONFIDENCE INTERVAL</span>
          <span className="text-[var(--accent-text)]">[0.44, 1.00] &middot; &plusmn;0.28</span>
        </div>

        <svg viewBox="0 0 500 54" className="w-full h-[54px] overflow-visible">
          <motion.path
            d="M 220 34 Q 340 4, 498 8 L 498 34 Z"
            fill="var(--accent-graphic)"
            fillOpacity="0.1"
            initial={{ opacity: reducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7 }}
          />

          <line
            x1="2"
            y1="34"
            x2="498"
            y2="34"
            stroke="var(--border-elevated)"
            strokeWidth="1"
          />

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
                stroke={isMajor ? "var(--ink-muted)" : "var(--border-elevated)"}
                strokeWidth="1"
              />
            );
          })}

          <motion.line
            x1="220"
            y1="34"
            x2="498"
            y2="34"
            stroke="var(--accent-graphic)"
            strokeWidth="2.5"
            initial={{ pathLength: reducedMotion ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, ease: EASE_SWISS }}
          />

          <line
            x1="220"
            y1="22"
            x2="220"
            y2="40"
            stroke="var(--accent-graphic)"
            strokeWidth="1.5"
          />

          <motion.polygon
            points="0,-5 5,0 0,5 -5,0"
            fill="var(--accent-graphic)"
            initial={{ x: reducedMotion ? 390 : 220, y: 34 }}
            animate={{ x: 390, y: 34 }}
            transition={{ duration: 0.85, ease: EASE_SWISS }}
          />

          <text x="2" y="51" fill="var(--ink-muted)" fontSize="10" fontFamily="monospace">
            0.00
          </text>
          <text
            x="220"
            y="51"
            fill="var(--accent-text)"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="middle"
          >
            0.44
          </text>
          <text
            x="390"
            y="51"
            fill="var(--ink-secondary)"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="middle"
          >
            0.78 target
          </text>
          <text
            x="498"
            y="51"
            fill="var(--ink-primary)"
            fontSize="10"
            fontFamily="monospace"
            textAnchor="end"
          >
            1.00
          </text>
        </svg>
      </div>

      {/* Verdict Summary Strip */}
      <div className="grid grid-cols-2 gap-3 border-t border-[var(--border-hair)] pt-3 font-mono text-[10px] tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-[var(--ink-secondary)]">THEME CLAIM</span>
          <span className="text-[var(--status-emerald)]">SUPPORTED</span>
        </div>
        <div className="flex items-center justify-between border-l border-[var(--border-hair)] pl-3">
          <span className="text-[var(--ink-secondary)]">PREVALENCE</span>
          <span className="text-[var(--status-crimson)]">BLOCKED</span>
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
      {/* Left 7 Cols: Miniature Print-Ready Statement (Matches /runs/[id]) */}
      <div className="col-span-7 bg-[var(--bg-sheet)] text-[var(--ink-sheet)] border border-[var(--border-hair)] p-4 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-baseline justify-between border-b border-[var(--border-hair)] pb-2">
            <h4
              className="text-[19px] leading-none tracking-[-0.02em]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Evidence Statement
            </h4>
            <span className="font-mono text-[8.5px] text-[var(--ink-muted)]">16 ORGS</span>
          </div>

          <div className="mt-2.5 divide-y divide-[var(--border-hair)] font-mono text-[9.5px] tabular-nums">
            <div className="flex items-center justify-between py-1.5">
              <span>01 &middot; Recurring pain &middot; L6</span>
              <span className="font-semibold text-[var(--status-emerald)]">Supported</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span>02 &middot; Willingness to pay</span>
              <span className="font-semibold text-[var(--status-crimson)]">Blocked</span>
            </div>
          </div>
        </div>

        <div className="mt-3">
          <motion.div
            className="h-[1px] w-full origin-left bg-[var(--accent-graphic)]"
            initial={{ scaleX: reducedMotion ? 1 : 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, ease: EASE_SWISS }}
          />
          <div className="mt-1.5 flex justify-between font-mono text-[8px] text-[var(--ink-muted)] tabular-nums">
            <span>SHA-256 e8d703d98e11</span>
            <span>ENGINE 1.0.0</span>
          </div>
        </div>
      </div>

      {/* Right 5 Cols: Cryptographic Gate Inspector */}
      <div className="col-span-5 flex flex-col justify-between border-l border-[var(--border-hair)] pl-4 py-0.5">
        <div className="space-y-2.5">
          <span
            className="inline-block border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.08em]"
            style={{
              borderColor: "var(--status-crimson-border)",
              backgroundColor: "var(--status-crimson-bg)",
              color: "var(--status-crimson)",
            }}
          >
            CHECKPOINT BLOCKED
          </span>

          <div className="space-y-1.5 font-mono text-[9.5px] text-[var(--ink-secondary)]">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-3 w-3 items-center justify-center text-[8px]"
                style={{
                  backgroundColor: "var(--cta-bg)",
                  color: "var(--cta-text)",
                }}
              >
                ✓
              </span>
              <span className="text-[var(--ink-primary)]">Falsifier observable</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 border border-[var(--border-elevated)]" />
              <span>Narrow Wilson CI</span>
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--border-hair)] pt-2 font-mono text-[9px] tabular-nums">
          <div className="text-[var(--ink-muted)]">VERIFIED DIGEST</div>
          <div className="mt-0.5 text-[var(--accent-text)] truncate">e8d703d98e116a84c4f1</div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Default export wraps HeroPipelineDemo on a matching canvas stage
 * so standalone Canvas previews render with the active theme contrast.
 */
export default function HeroPipelineDemoPreview() {
  return (
    <div className="min-h-screen w-full bg-[var(--bg-canvas)] flex items-center justify-center p-6">
      <HeroPipelineDemo />
    </div>
  );
}
