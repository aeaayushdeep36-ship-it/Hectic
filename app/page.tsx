"use client";

import { motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
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

  const { scrollY, scrollYProgress } = useScroll();
  const progressScale = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });

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
        <div className="mx-auto h-full max-w-[1360px] px-8 lg:px-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <HecticLogo size={28} />
            <span className="font-display text-[22px] leading-none text-[#F5F6F8]">
              Hectic
            </span>
          </Link>

          <nav className="flex items-center gap-7" aria-label="Primary navigation">
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
                <div className="absolute right-0 top-full mt-3 w-64 bg-[#0E1014] border border-white/[0.08] rounded-[2px] z-50">
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

            <Link
              href={user ? "/audit#runs" : `/workspaces/${primarySlug}#runs`}
              className="hidden sm:inline text-[13px] text-[#9CA3AF] hover:text-[#F5F6F8] no-underline transition-colors"
            >
              Audit Log
            </Link>

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
          </nav>
        </div>

        {/* 1px Champagne Gold Scroll-Progress Hairline */}
        <motion.div
          style={{ scaleX: progressScale, originX: 0 }}
          className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-[#D4AF6A]"
        />
      </header>

      <ChapterRail />

      <main className="flex-1">
        {/* ── Band 1: Unboxed Hero (01 / 06) ──────────────────────────── */}
        <section
          id="hero"
          className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-center mx-auto max-w-[1360px] px-8 lg:px-16 py-16"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-16">
            {/* Left (Cols 1-7) */}
            <div className="lg:col-span-7">
              <p className="font-mono-tabular text-[12px] uppercase tracking-[0.14em] text-[#64748B] mb-6">
                DETERMINISTIC EVIDENCE AUDIT
              </p>

              <h1 className="font-display text-[clamp(3.5rem,6vw,5.25rem)] leading-[1.02] text-[#F5F6F8]">
                Know what you
                <br />
                actually know.
              </h1>

              <p className="mt-7 max-w-[46ch] text-[18px] leading-[1.55] text-[#9CA3AF]">
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

            {/* Right (Cols 8-12): Floating Freely in Open Space, NO Outer Box */}
            <div className="lg:col-span-5 space-y-7">
              <p className="font-display text-[28px] leading-snug text-[#10B981]">
                L6 Payment · 3 orgs · Supported
              </p>

              {/* Delicate 1px Wilson 95% CI range line */}
              <div>
                <p className="font-mono-tabular text-[12px] text-[#F5F6F8] text-right mb-2.5 pr-6">
                  [0.44, 1.00]
                </p>
                <div className="relative h-5 flex items-center">
                  <div className="w-full h-[1px] bg-white/20" />
                  <div className="absolute left-0 top-1 bottom-1 w-[1px] bg-white/30" />
                  <div className="absolute right-0 top-1 bottom-1 w-[1px] bg-white/30" />
                  <div className="absolute left-[44%] right-0 h-[1px] bg-[#D4AF6A]/80" />
                  <div className="absolute left-[78%] h-2.5 w-2.5 bg-[#D4AF6A] rounded-none" />
                </div>
              </div>

              {/* Subtle tabular precision/coverage matrix */}
              <div className="font-mono-tabular text-[11px] text-[#9CA3AF] opacity-60 space-y-1.5 pt-2">
                <div className="grid grid-cols-6 gap-2 text-right">
                  <span className="text-left" />
                  <span>03</span>
                  <span>120</span>
                  <span>0.435</span>
                  <span>0.983</span>
                  <span>1.000</span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-right">
                  <span className="text-left">Org</span>
                  <span>03</span>
                  <span>156</span>
                  <span>0.862</span>
                  <span>0.357</span>
                  <span>0.986</span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-right">
                  <span className="text-left">Sup</span>
                  <span>09</span>
                  <span>163</span>
                  <span>0.300</span>
                  <span>0.363</span>
                  <span>0.988</span>
                </div>
                <div className="grid grid-cols-6 gap-2 text-right">
                  <span className="text-left">Net</span>
                  <span>27</span>
                  <span>350</span>
                  <span>0.869</span>
                  <span>0.336</span>
                  <span>0.970</span>
                </div>
              </div>
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
            </div>

            <div className="lg:col-span-8 space-y-12">
              {PROBLEM_ROWS.map((item) => (
                <div key={item.title} className="pb-10 relative">
                  <h3 className="text-[17px] font-medium text-[#F5F6F8]">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[15px] leading-[1.65] text-[#9CA3AF] max-w-[58ch]">
                    {item.body}
                  </p>
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
        <section id="guarantees" className="py-24 border-t border-white/[0.06]">
          <div className="mx-auto max-w-[1360px] px-8 lg:px-16">
            <p className="font-mono-tabular text-[11px] uppercase tracking-[0.14em] text-[#64748B] mb-10">
              05 / GUARANTEES
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
              {GUARANTEE_ITEMS.map((item) => (
                <div key={item.title}>
                  <h3 className="text-[16px] font-medium text-[#F5F6F8]">
                    {item.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-[1.65] text-[#9CA3AF]">
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
