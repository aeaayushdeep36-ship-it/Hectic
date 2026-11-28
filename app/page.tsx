"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { AuthBar } from "@/components/AuthBar";
import { useAuth } from "@/components/AuthProvider";
import { AuthPromptModal } from "@/components/AuthPromptModal";
import { HecticLogo } from "@/components/HecticLogo";
import { ChapterRail } from "@/components/home/chapter-rail";
import { HeroPipelineDemo } from "@/components/home/HeroPipelineDemo";
import { LenisProvider, useLenis } from "@/components/home/lenis-provider";
import { MethodologyBand } from "@/components/home/methodology-band";
import { PipelineBand } from "@/components/home/pipeline-band";
import { WorkspaceNavContext } from "@/components/WorkspaceNavContext";
import { parseRosterUpload, type RosterUploadPreview } from "@/lib/roster-upload";

const PROBLEM_ROWS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Pseudoreplication",
    body: "Eleven interviews across two companies is two independent units of evidence, not eleven. Hectic deduplicates by organisation before any threshold is evaluated.",
  },
  {
    title: "Collapsed Scores",
    body: "A single composite score hides whether a claim failed on proof strength, sample size, or target population. Hectic isolates Level, Support, and Precision.",
  },
  {
    title: "Silent Uncertainty",
    body: "Small-sample percentages without confidence bounds overstate commercial readiness. Every prevalence claim carries an exact 95% Wilson score interval.",
  },
];

const GUARANTEE_ITEMS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "Local-First Privacy",
    body: "Client-side PII redaction strips emails, phone numbers, and personal names before storage, with full --no-llm deterministic execution.",
  },
  {
    title: "Cryptographic Reproducibility",
    body: "Every audit statement binds ENGINE_VERSION, THRESHOLD_VERSION, and a SHA-256 verdict digest so any run can be independently verified.",
  },
  {
    title: "Property-Tested Math",
    body: "Core Wilson intervals, L5 investor exclusions, and MIN_SUPPORT invariants are continuously verified with fast-check property suites.",
  },
];

function HomeContent() {
  const workspaces = useContext(WorkspaceNavContext);
  const { user } = useAuth();
  const { scrollTo } = useLenis();
  const router = useRouter();

  const primarySlug = workspaces[0]?.slug ?? "clean";
  const [wsOpen, setWsOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string>("user-studio");
  const [csvPreview, setCsvPreview] = useState<RosterUploadPreview | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 40);
  });

  function handleBeginAudit() {
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    router.push("/audit");
  }

  function handleLauncherRun() {
    if (selectedTarget === "user-studio") {
      handleBeginAudit();
      return;
    }
    if (!user) {
      setAuthPromptOpen(true);
      return;
    }
    router.push(`/workspaces/${selectedTarget}?drawer=import`);
  }

  const handleCsvFile = useCallback((file: File) => {
    setCsvError(null);
    void parseRosterUpload(file)
      .then((preview) => {
        setCsvPreview(preview);
        if (preview.rowCount === 0) {
          setCsvError("No valid data rows found in CSV.");
        }
      })
      .catch((err: unknown) => {
        setCsvError(err instanceof Error ? err.message : "Unable to parse CSV file.");
      });
  }, []);

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleCsvFile(file);
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleCsvFile(file);
  }

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setWsOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setWsOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-[#F5F6F8] overflow-x-clip">
      {/* ── Sticky Minimalist Header (h-20) ───────────────────────────── */}
      <header className="sticky top-0 z-40 h-20 bg-[#08090B]/85 backdrop-blur-md border-b border-white/[0.06]">
        <div className="mx-auto h-full max-w-[1440px] px-6 lg:px-10 grid grid-cols-3 items-center">
          {/* Left: H Logo + Workspaces + Methodology */}
          <nav className="flex items-center gap-6 justify-self-start" aria-label="Primary navigation">
            <Link href="/" className="flex items-center no-underline shrink-0" aria-label="Hectic Home">
              <HecticLogo size={28} />
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setWsOpen((prev) => !prev)}
                aria-expanded={wsOpen}
                className="text-[13px] text-[#9CA3AF] hover:text-[#F5F6F8] transition-colors cursor-pointer"
              >
                Workspaces
              </button>
              {wsOpen && (
                <div className="absolute left-0 top-full mt-3 w-64 bg-[#0E1014] border border-white/[0.08] rounded-[2px] z-50">
                  <Link
                    href="/audit"
                    onClick={() => setWsOpen(false)}
                    className="flex items-center justify-between px-4 py-3 text-[13px] font-medium text-[#D4AF6A] bg-[#15181F] hover:bg-[#1B1F28] border-b border-white/[0.08] no-underline transition-colors"
                  >
                    <span>My Audit Studio</span>
                    <span className="font-mono-tabular text-[11px]">OPEN →</span>
                  </Link>
                  <div className="px-4 py-1.5 font-mono-tabular text-[10px] uppercase tracking-[0.12em] text-[#64748B] border-b border-white/[0.06]">
                    Sample Demos
                  </div>
                  {workspaces.map((ws) => (
                    <Link
                      key={ws.slug}
                      href={`/workspaces/${ws.slug}`}
                      onClick={() => setWsOpen(false)}
                      className="flex items-center justify-between px-4 py-2.5 text-[13px] text-[#9CA3AF] hover:text-[#F5F6F8] hover:bg-[#15181F] border-b border-white/[0.06] last:border-b-0 no-underline transition-colors"
                    >
                      <span className="truncate">{ws.name}</span>
                      <span className="font-mono-tabular text-[11px] text-[#64748B] ml-2 shrink-0">
                        {ws.runCount} runs
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => scrollTo("#methodology", { duration: 1.15 })}
              className="hidden sm:inline text-[13px] text-[#9CA3AF] hover:text-[#F5F6F8] transition-colors cursor-pointer"
            >
              Methodology
            </button>
          </nav>

          {/* Center: HECTIC Wordmark */}
          <Link
            href="/"
            className="justify-self-center font-display text-[28px] sm:text-[30px] leading-none tracking-[0.06em] text-[#F5F6F8] no-underline"
          >
            HECTIC
          </Link>

          {/* Right: Start Audit + Profile / Sign In */}
          <div className="flex items-center gap-4 justify-self-end">
            <button
              type="button"
              onClick={handleBeginAudit}
              className={`px-4 py-1.5 text-[13px] font-medium rounded-[2px] cursor-pointer transition-all duration-200 ${
                isScrolled
                  ? "bg-transparent text-[#D4AF6A] border border-[#D4AF6A] hover:bg-[#15181F]"
                  : "bg-[#D4AF6A] text-[#08090B] border border-[#D4AF6A] hover:opacity-90"
              }`}
            >
              Start Audit
            </button>

            <AuthBar />
          </div>
        </div>
      </header>

      <ChapterRail />

      <main className="flex-1">
        {/* ── Band 1: Unboxed Hero (01 / 06) ──────────────────────────── */}
        <section
          id="hero"
          className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-center mx-auto max-w-[1360px] px-8 lg:px-16 py-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-10">
            {/* Left (Cols 1-6) */}
            <div className="lg:col-span-6">
              <p className="font-mono-tabular text-[12px] uppercase tracking-[0.14em] text-[#64748B] mb-6">
                DETERMINISTIC EVIDENCE AUDIT
              </p>

              <h1 className="font-display text-[clamp(3.25rem,5.4vw,4.75rem)] leading-[1.02] text-[#F5F6F8]">
                Know what you
                <br />
                actually know.
              </h1>

              <p className="mt-7 max-w-[44ch] text-[17px] leading-[1.55] text-[#9CA3AF]">
                Audit founder claims against real interview rosters with
                deterministic math and verifiable proof.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-7">
                <button
                  type="button"
                  onClick={handleBeginAudit}
                  className="px-6 py-3 bg-[#D4AF6A] text-[#08090B] text-[13px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer transition-opacity"
                >
                  Begin Audit
                </button>

                <Link
                  href={`/workspaces/${primarySlug}`}
                  className="text-[13px] text-[#9CA3AF] hover:text-[#F5F6F8] no-underline transition-colors"
                >
                  Explore sample workspace →
                </Link>
              </div>
            </div>

            {/* Right (Cols 7-12): Live 4-Act HeroPipelineDemo Instrument */}
            <div className="lg:col-span-6 flex items-center justify-center lg:justify-end">
              <HeroPipelineDemo />
            </div>
          </div>
        </section>

        {/* ── Band 2: Why Founder Evidence Breaks (02 / 06) ────────────── */}
        <section id="problem" className="py-32">
          <div className="mx-auto max-w-[1360px] px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-28">
              <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#64748B] mb-4">
                02 / THE PROBLEM
              </p>
              <h2 className="font-display text-[clamp(2.25rem,3.6vw,3.1rem)] leading-[1.06] text-[#F5F6F8]">
                Volume is not
                <br />
                validation.
              </h2>

              <div className="mt-10 border-l-2 border-[#D4AF6A] pl-5">
                <p className="font-display text-[44px] leading-none text-[#F5F6F8] m-0">
                  11 → 2
                </p>
                <p className="mt-3 text-[13px] leading-[1.55] text-[#9CA3AF] max-w-[26ch]">
                  Interviews across two companies equal two independent units of proof.
                </p>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-12">
              {PROBLEM_ROWS.map((item, idx) => (
                <div
                  key={item.title}
                  className="pb-11 relative grid grid-cols-1 md:grid-cols-12 gap-6 items-center"
                >
                  <div className="md:col-span-7 flex items-start gap-5">
                    <span className="font-mono-tabular text-[12px] text-[#64748B] pt-1 shrink-0">
                      0{idx + 1}
                    </span>
                    <div>
                      <h3 className="text-[17px] font-medium text-[#F5F6F8]">
                        {item.title}
                      </h3>
                      <p className="mt-2.5 text-[14px] leading-[1.65] text-[#9CA3AF]">
                        {item.body}
                      </p>
                    </div>
                  </div>

                  {/* Right Micro-Diagram */}
                  <div className="md:col-span-5 flex md:justify-end">
                    {idx === 0 && (
                      <div className="flex flex-col items-end">
                        <svg
                          viewBox="0 0 180 68"
                          className="w-[180px] h-[68px]"
                          aria-hidden="true"
                        >
                          {/* Bracketed clusters */}
                          <path
                            d="M 10 6 H 4 V 62 H 10 M 96 6 H 102 V 62 H 96"
                            fill="none"
                            stroke="rgba(255,255,255,0.22)"
                            strokeWidth="1"
                          />
                          {/* 6 top cluster dots */}
                          {[20, 38, 56, 74, 29, 47].map((cx, dIdx) => (
                            <circle
                              key={`t-${dIdx}`}
                              cx={cx}
                              cy={dIdx < 4 ? 17 : 26}
                              r="2.4"
                              fill="#7D8CA3"
                            />
                          ))}
                          {/* 5 bottom cluster dots */}
                          {[20, 38, 56, 74, 47].map((cx, dIdx) => (
                            <circle
                              key={`b-${dIdx}`}
                              cx={cx}
                              cy={dIdx < 4 ? 44 : 53}
                              r="2.4"
                              fill="#7D8CA3"
                            />
                          ))}
                          {/* Converging arrows */}
                          <path
                            d="M 108 22 C 128 22, 134 24, 152 24"
                            fill="none"
                            stroke="rgba(255,255,255,0.28)"
                            strokeWidth="1"
                          />
                          <path
                            d="M 108 46 C 128 46, 134 44, 152 44"
                            fill="none"
                            stroke="rgba(255,255,255,0.28)"
                            strokeWidth="1"
                          />
                          <circle cx="162" cy="24" r="3.5" fill="#D4AF6A" />
                          <circle cx="162" cy="44" r="3.5" fill="#D4AF6A" />
                        </svg>
                        <span className="font-mono-tabular text-[11px] text-[#9CA3AF] mt-1">
                          11 rows → 2 orgs
                        </span>
                      </div>
                    )}

                    {idx === 1 && (
                      <div className="flex items-center gap-3">
                        {/* Crossed-out 78/100 */}
                        <div className="relative flex items-center justify-center w-[72px] h-[52px]">
                          <span className="font-display text-[20px] leading-none text-[#475569] tracking-normal">
                            78/100
                          </span>
                          <svg
                            viewBox="0 0 72 52"
                            className="pointer-events-none absolute inset-0 w-full h-full"
                            aria-hidden="true"
                          >
                            <line
                              x1="14"
                              y1="8"
                              x2="58"
                              y2="44"
                              stroke="rgba(148,163,184,0.38)"
                              strokeWidth="1.5"
                            />
                            <line
                              x1="58"
                              y1="8"
                              x2="14"
                              y2="44"
                              stroke="rgba(148,163,184,0.38)"
                              strokeWidth="1.5"
                            />
                          </svg>
                        </div>

                        {/* 3-way branching lines */}
                        <svg
                          viewBox="0 0 42 74"
                          className="w-[42px] h-[74px] shrink-0"
                          aria-hidden="true"
                        >
                          <line
                            x1="0"
                            y1="37"
                            x2="40"
                            y2="11"
                            stroke="rgba(255,255,255,0.28)"
                            strokeWidth="1"
                          />
                          <line
                            x1="0"
                            y1="37"
                            x2="40"
                            y2="37"
                            stroke="rgba(255,255,255,0.28)"
                            strokeWidth="1"
                          />
                          <line
                            x1="0"
                            y1="37"
                            x2="40"
                            y2="63"
                            stroke="rgba(255,255,255,0.28)"
                            strokeWidth="1"
                          />
                        </svg>

                        {/* Level / Support / Precision bars */}
                        <div className="space-y-2.5 w-[108px]">
                          {[
                            { label: "LEVEL", pct: "70%", color: "#7D8CA3" },
                            { label: "SUPPORT", pct: "70%", color: "#D4AF6A" },
                            { label: "PRECISION", pct: "76%", color: "#10B981" },
                          ].map((bar) => (
                            <div key={bar.label}>
                              <span className="block font-mono-tabular text-[9px] tracking-[0.08em] text-[#9CA3AF] mb-1">
                                {bar.label}
                              </span>
                              <div className="h-[2.5px] w-full bg-white/10">
                                <div
                                  className="h-full"
                                  style={{ width: bar.pct, backgroundColor: bar.color }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {idx === 2 && (
                      <div className="flex items-center gap-5">
                        <div className="w-[132px]">
                          <p className="font-mono-tabular text-[12px] text-[#F5F6F8] text-center mb-2">
                            [0.44, 1.00]
                          </p>
                          <div className="relative h-4 flex items-center">
                            <div className="w-full h-[1px] bg-white/25" />
                            <div className="absolute left-0 top-0.5 bottom-0.5 w-[1px] bg-white/35" />
                            <div className="absolute right-0 top-0.5 bottom-0.5 w-[1px] bg-white/35" />
                            <div className="absolute left-[44%] right-0 h-[1.5px] bg-[#D4AF6A]" />
                            <span className="absolute left-[44%] h-1.5 w-1.5 rounded-full bg-[#D4AF6A] -translate-x-1/2" />
                            <span className="absolute right-0 h-1.5 w-1.5 rounded-full bg-[#D4AF6A] translate-x-1/2" />
                          </div>
                        </div>
                        <span className="font-mono-tabular text-[14px] text-[#475569]">
                          100%
                        </span>
                      </div>
                    )}
                  </div>

                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                    style={{ originX: 0 }}
                    className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/[0.07]"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Band 3: Pinned 4-Stage Pipeline Walkthrough (03 / 06) ───── */}
        <PipelineBand />

        {/* ── Band 4: L1–L6 Evidence Hierarchy (04 / 06) ───────────────── */}
        <MethodologyBand />

        {/* ── Band 5: Engineering & Trust Guarantees (05 / 06) ─────────── */}
        <section id="guarantees" className="py-32 border-t border-white/[0.06]">
          <div className="mx-auto max-w-[1360px] px-8 lg:px-16">
            <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#64748B] mb-4">
              05 / GUARANTEES
            </p>
            <h2 className="font-display text-[clamp(2.25rem,3.8vw,3.25rem)] leading-[1.06] text-[#F5F6F8]">
              Built to withstand diligence.
            </h2>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-0 md:divide-x md:divide-white/[0.08]">
              {GUARANTEE_ITEMS.map((item, idx) => (
                <div
                  key={item.title}
                  className="md:px-10 first:md:pl-0 last:md:pr-0 flex flex-col"
                >
                  {/* Visual Strip */}
                  <div className="min-h-[56px] flex items-center mb-6 pb-5 border-b border-white/[0.07]">
                    {idx === 0 && (
                      <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-[12px]">
                        <span className="text-[#9CA3AF]">sarah@acme.io</span>
                        <span className="text-[#64748B]">→</span>
                        <span className="inline-flex items-center gap-0.5">
                          {Array.from({ length: 6 }).map((_, b) => (
                            <span
                              key={b}
                              className="inline-block h-3.5 w-2 bg-[#475569]/70"
                            />
                          ))}
                        </span>
                        <span className="inline-block h-2 w-2 rounded-full bg-[#10B981] ml-1" />
                        <span className="text-[#9CA3AF]">--no-llm</span>
                      </div>
                    )}

                    {idx === 1 && (
                      <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-[12px]">
                        <span className="text-[#9CA3AF]">v1.0.0 + 2026-11-24</span>
                        <span className="text-[#D4AF6A]">→</span>
                        <span className="text-[#E5E7EB]">sha256:e8d703</span>
                      </div>
                    )}

                    {idx === 2 && (
                      <div className="w-full flex flex-wrap items-center justify-between gap-3 font-mono-tabular">
                        <span className="text-[12px] text-[#9CA3AF]">
                          fast-check · 1,000 runs
                        </span>
                        <div className="flex items-center gap-1.5">
                          {["WILSON", "L5 EXCL", "MIN ≥ 3"].map((badge) => (
                            <span
                              key={badge}
                              className="inline-flex flex-col items-center px-2 py-1 bg-[#0F1D19] border border-[#183D31] rounded-[2px] text-[9px] text-[#9CA3AF] leading-tight"
                            >
                              <span className="text-[#10B981] text-[10px]">✓</span>
                              <span>{badge}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <h3 className="font-mono-tabular text-[14px] text-[#F5F6F8]">
                    <span className="text-[#9CA3AF] mr-2">0{idx + 1} ·</span>
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[14px] leading-[1.7] text-[#9CA3AF]">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Band 6: Unboxed Inline Audit Launcher + Footer (06 / 06) ── */}
        <section id="launcher" className="py-28 border-t border-white/[0.06]">
          <div className="mx-auto max-w-[1360px] px-8 lg:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 items-center">
              <div className="lg:col-span-6">
                <h2 className="font-display text-[clamp(2.5rem,4vw,3.5rem)] leading-[1.06] text-[#F5F6F8]">
                  Every finding begins
                  <br />
                  with a roster.
                </h2>
                <div className="mt-5 flex items-center gap-2.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                  <span className="text-[13px] text-[#9CA3AF]">
                    Local PII redaction active
                  </span>
                </div>
              </div>

              <div className="lg:col-span-6 space-y-3.5">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={onDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`bg-[#14171E] border border-dashed rounded-[2px] px-6 py-10 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-[#D4AF6A] bg-[#191D26]"
                      : "border-[#D4AF6A]/65 hover:border-[#D4AF6A]"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={onFileChange}
                    className="hidden"
                  />
                  {csvPreview ? (
                    <p className="font-mono-tabular text-[12px] text-[#10B981]">
                      {csvPreview.fileName} · {csvPreview.rowCount} rows ready
                    </p>
                  ) : (
                    <p className="text-[13px] text-[#F5F6F8]">
                      Drop interview CSV or browse files
                    </p>
                  )}
                </div>

                {csvError && (
                  <p className="font-mono-tabular text-[11px] text-[#EF4444]">
                    {csvError}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    aria-label="Target workspace"
                    value={selectedTarget}
                    onChange={(e) => setSelectedTarget(e.target.value)}
                    className="flex-1 px-4 py-3 bg-[#14171E] border border-white/[0.08] rounded-[2px] text-[13px] text-[#F5F6F8] focus:border-[#D4AF6A] focus:outline-none"
                  >
                    <option value="user-studio">My Audit Studio (New / Own Workspace)</option>
                    {workspaces.map((ws) => (
                      <option key={ws.slug} value={ws.slug}>
                        Sample · {ws.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleLauncherRun}
                    className="px-6 py-3 bg-[#D4AF6A] text-[#08090B] text-[13px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer transition-opacity shrink-0"
                  >
                    Run Deterministic Audit →
                  </button>
                </div>
              </div>
            </div>

            {/* Minimal Open Footer */}
            <footer className="border-t border-white/[0.07] pt-8 mt-24 flex flex-wrap items-center justify-between gap-4 text-[12px] text-[#64748B]">
              <p className="m-0">
                <span className="text-[#F5F6F8] font-medium">Hectic</span> — Evidence Auditor · Engine v1.0.0 · MIT License
              </p>
              <button
                type="button"
                onClick={() => scrollTo(0, { duration: 1.25 })}
                className="text-[#9CA3AF] hover:text-[#F5F6F8] cursor-pointer transition-colors"
              >
                Back to top ↑
              </button>
            </footer>
          </div>
        </section>
      </main>

      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        actionLabel="begin an audit"
      />
    </div>
  );
}

export default function LandingPage() {
  return (
    <LenisProvider>
      <HomeContent />
    </LenisProvider>
  );
}
