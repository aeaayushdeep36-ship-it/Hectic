"use client";

import { motion } from "framer-motion";
import {
  FileText,
  LayoutGrid,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { ClaimView, MatrixView, RunView, WorkspaceView } from "@/lib/dto";
import { DEFAULT_ANALYSIS_PROVIDER, MODEL_BY_PROVIDER } from "@/lib/provider-options";
import type { EvidenceLevel } from "@/lib/types";
import type { SidebarWorkspace } from "@/lib/workspace-nav";
import { AuthBar } from "./AuthBar";
import { useAuth } from "./AuthProvider";
import { AuthPromptModal } from "./AuthPromptModal";
import { HecticLogo } from "./HecticLogo";
import { ThemeToggle } from "./theme-toggle";
import { WorkspaceDrawer } from "./WorkspaceDrawer";

const ROLE_COLUMNS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "economic", label: "Economic" },
  { key: "technical", label: "Technical" },
  { key: "user", label: "User" },
  { key: "influencer", label: "Influencer" },
  { key: "none", label: "Unmapped" },
];

const LADDER_LABELS: ReadonlyArray<{ level: EvidenceLevel; label: string }> = [
  { level: 1, label: "L1 Internal" },
  { level: 2, label: "L2 Stated" },
  { level: 3, label: "L3 Concept" },
  { level: 4, label: "L4 Commitment" },
  { level: 5, label: "L5 Investment" },
  { level: 6, label: "L6 Payment" },
];

function heatmapClass(orgs: number): string {
  if (orgs === 0) return "bg-[var(--bg-canvas)] text-[var(--ink-muted)]";
  if (orgs <= 2) return "bg-[var(--heatmap-1)] text-[var(--ink-primary)]";
  if (orgs === 3) return "bg-[var(--heatmap-2)] text-[var(--ink-primary)]";
  return "bg-[var(--heatmap-3)] text-[var(--ink-primary)]";
}

export interface WorkspaceDashboardProps {
  readonly workspace: WorkspaceView;
  readonly workspaces: readonly SidebarWorkspace[];
  readonly matrix: MatrixView;
  readonly claims: readonly ClaimView[];
  readonly latestRun: RunView | null;
  readonly ladderCounts: Readonly<Record<EvidenceLevel, number>>;
  readonly integrity: {
    readonly independentOrgs: number;
    readonly totalInterviews: number;
    readonly networkPct: number;
    readonly topChannelPct: number;
  };
}

export function WorkspaceDashboardClient({
  workspace,
  workspaces,
  matrix,
  claims,
  latestRun,
  ladderCounts,
  integrity,
}: WorkspaceDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [promptAction, setPromptAction] = useState("begin an audit");
  const [running, setRunning] = useState(false);

  function openDrawerGuarded(label: string) {
    if (!authLoading && !user) {
      setPromptAction(label);
      setAuthPromptOpen(true);
      return;
    }
    setDrawerOpen(true);
  }

  // Open drawer automatically if ?drawer=import and user is signed in
  const wantsDrawer = searchParams.get("drawer") === "import";
  if (wantsDrawer && !authLoading && !user && !authPromptOpen) {
    setAuthPromptOpen(true);
  } else if (wantsDrawer && !authLoading && user && !drawerOpen) {
    setDrawerOpen(true);
  }

  const findingsByClaim = new Map(
    latestRun?.findings.map((f) => [f.claimId, f]) ?? [],
  );

  const gapCount =
    latestRun?.findings.filter((f) => f.finding !== "SUPPORTED" && f.resolution === null).length ??
    0;

  const maxLadder = Math.max(1, ...Object.values(ladderCounts));
  const indepPct =
    integrity.totalInterviews > 0
      ? Math.round((integrity.independentOrgs / integrity.totalInterviews) * 100)
      : 0;

  async function triggerRunAudit() {
    if (!user) {
      setPromptAction("run an audit");
      setAuthPromptOpen(true);
      return;
    }
    setRunning(true);
    try {
      const res = await fetch(`/api/workspaces/${workspace.slug}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: DEFAULT_ANALYSIS_PROVIDER,
          modelId: MODEL_BY_PROVIDER[DEFAULT_ANALYSIS_PROVIDER],
        }),
      });
      const body = (await res.json()) as { run?: { id: string } };
      if (res.ok && body.run) {
        router.push(`/runs/${body.run.id}`);
      } else {
        setRunning(false);
      }
    } catch {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      {/* ── Fixed 200px Left Sidebar ───────────────────────── */}
      <aside className="hidden md:flex w-[200px] shrink-0 flex-col border-r border-[var(--border-hair)] bg-[var(--bg-surface)]">
        <div className="px-5 pt-5 pb-4">
          <Link href="/" className="flex items-center gap-2.5 font-display text-[22px] leading-none text-[var(--ink-primary)] no-underline">
            <HecticLogo size={24} />
            <span>Hectic</span>
          </Link>

          <div className="mt-4">
            <select
              aria-label="Switch workspace"
              value={workspace.slug}
              onChange={(e) => router.push(`/workspaces/${e.target.value}`)}
              className="w-full px-2.5 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)] focus:border-[var(--accent-graphic)] focus:outline-none cursor-pointer"
            >
              {workspaces.map((ws) => (
                <option key={ws.slug} value={ws.slug}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5" aria-label="Workspace navigation">
          <a
            href="#overview"
            className="flex items-center gap-2.5 px-3 py-2 bg-[var(--bg-elevated)] text-[var(--ink-primary)] text-[13px] rounded-[2px] no-underline"
          >
            <LayoutGrid size={16} strokeWidth={1.5} className="text-[var(--ink-secondary)]" />
            Overview
          </a>
          <a
            href="#coverage"
            className="flex items-center gap-2.5 px-3 py-2 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] text-[13px] rounded-[2px] no-underline transition-colors"
          >
            <ShieldCheck size={16} strokeWidth={1.5} />
            Coverage
          </a>
          <a
            href="#claims"
            className="flex items-center gap-2.5 px-3 py-2 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] text-[13px] rounded-[2px] no-underline transition-colors"
          >
            <FileText size={16} strokeWidth={1.5} />
            Claims
          </a>
          <a
            href="#runs"
            className="flex items-center gap-2.5 px-3 py-2 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] text-[13px] rounded-[2px] no-underline transition-colors"
          >
            <Users size={16} strokeWidth={1.5} />
            Runs
          </a>
          {latestRun ? (
            <Link
              href={`/runs/${latestRun.id}`}
              className="flex items-center gap-2.5 px-3 py-2 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] text-[13px] rounded-[2px] no-underline transition-colors"
            >
              <ScrollText size={16} strokeWidth={1.5} />
              Statement
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void triggerRunAudit()}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-elevated)] text-[13px] rounded-[2px] text-left cursor-pointer transition-colors"
            >
              <ScrollText size={16} strokeWidth={1.5} />
              Statement
            </button>
          )}
        </nav>

        <div className="px-5 py-4 border-t border-[var(--border-hair)]">
          <p className="font-mono-tabular text-[11px] text-[var(--ink-muted)]">
            v1.0.0 · Deterministic
          </p>
        </div>
      </aside>

      {/* ── Main Content Area ────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col bg-[var(--bg-canvas)]">
        {/* Top Command Header */}
        <header
          id="overview"
          className="px-8 py-5 border-b border-[var(--border-hair)] bg-[var(--bg-canvas)] flex flex-wrap items-center justify-between gap-4"
        >
          <div>
            <h1 className="font-display text-[32px] leading-[1.1] text-[var(--ink-primary)]">
              {workspace.name}
            </h1>
            <p className="mt-1 font-mono-tabular text-[12px] text-[var(--ink-muted)]">
              {workspace.evidenceCount} interviews · {workspace.orgCount} orgs ·{" "}
              {matrix.segments.length} segments
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {gapCount > 0 ? (
              <span
                className="px-3 py-1.5 border font-mono-tabular text-[11px] rounded-[2px]"
                style={{
                  backgroundColor: "var(--status-crimson-bg)",
                  borderColor: "var(--status-crimson-border)",
                  color: "var(--status-crimson)",
                }}
              >
                BLOCKED · {gapCount} gap{gapCount === 1 ? "" : "s"}
              </span>
            ) : latestRun ? (
              <span
                className="px-3 py-1.5 border font-mono-tabular text-[11px] rounded-[2px]"
                style={{
                  backgroundColor: "var(--status-emerald-bg)",
                  borderColor: "var(--status-emerald)",
                  color: "var(--status-emerald)",
                }}
              >
                RESOLVED
              </span>
            ) : null}

            <button
              type="button"
              onClick={() => openDrawerGuarded("import a CSV roster")}
              className="px-3.5 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-elevated)] text-[var(--ink-primary)] text-[12px] rounded-[2px] hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
            >
              Import CSV
            </button>

            <button
              type="button"
              onClick={() => openDrawerGuarded("add a claim")}
              className="px-3.5 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-elevated)] text-[var(--ink-primary)] text-[12px] rounded-[2px] hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
            >
              Add Claim
            </button>

            <ThemeToggle />

            <button
              type="button"
              disabled={running}
              onClick={() => void triggerRunAudit()}
              className="px-4 py-1.5 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[12px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer disabled:opacity-50 transition-opacity"
            >
              {running ? "Running…" : "Run Audit"}
            </button>

            <AuthBar />
          </div>
        </header>

        {/* Upper Workspace Split (65% / 35% -> 8 / 4 cols) */}
        <section
          id="coverage"
          className="grid grid-cols-1 xl:grid-cols-12 border-b border-[var(--border-hair)]"
        >
          {/* Left 8 Columns — Coverage Matrix */}
          <div className="xl:col-span-8 xl:border-r border-[var(--border-hair)] p-6">
            <div className="flex flex-wrap items-baseline gap-3 mb-5">
              <h2 className="text-[15px] font-medium text-[var(--ink-primary)]">
                Coverage Matrix
              </h2>
              <span className="font-mono-tabular text-[11px] text-[var(--ink-muted)]">
                Segment × Role · Independent Orgs
              </span>
            </div>

            {matrix.segments.length === 0 ? (
              <div className="py-12 border border-[var(--border-hair)] text-center font-mono-tabular text-[12px] text-[var(--ink-muted)]">
                No interview evidence yet. Use Import CSV to add rows.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left" aria-label="Coverage matrix">
                  <thead>
                    <tr>
                      <th className="py-2.5 pr-4 text-[12px] font-normal text-[var(--ink-secondary)]" />
                      {ROLE_COLUMNS.map((col) => (
                        <th
                          key={col.key}
                          className="py-2.5 px-3 text-center text-[12px] font-normal text-[var(--ink-secondary)] border-b border-[var(--border-hair)]"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.segments.map((segment) => (
                      <tr key={segment}>
                        <th
                          scope="row"
                          className="py-3 pr-4 text-[13px] font-normal text-[var(--ink-secondary)] whitespace-nowrap"
                        >
                          {segment}
                        </th>
                        {ROLE_COLUMNS.map((col) => {
                          const cell = matrix.cells[`${segment}::${col.key}`] ?? {
                            rows: 0,
                            orgs: 0,
                            aliases: [],
                          };
                          return (
                            <td
                              key={col.key}
                              title={cell.aliases.join(", ")}
                              className={`border border-[var(--border-hair)] px-3 py-4 text-center font-mono-tabular text-[12px] transition-colors ${heatmapClass(cell.orgs)}`}
                            >
                              {cell.rows === 0 ? (
                                "—"
                              ) : (
                                <>
                                  {cell.rows} / {cell.orgs} org{cell.orgs === 1 ? "" : "s"}
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right 4 Columns — Evidence Ladder & Sample Integrity */}
          <div className="xl:col-span-4 p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-[15px] font-medium text-[var(--ink-primary)] mb-5">
                Evidence Ladder
              </h2>

              <div className="space-y-3">
                {LADDER_LABELS.map(({ level, label }) => {
                  const count = ladderCounts[level] ?? 0;
                  const pct = count === 0 ? 0 : Math.max(8, Math.round((count / maxLadder) * 100));
                  return (
                    <div key={level} className="grid grid-cols-12 items-center gap-3">
                      <span className="col-span-5 text-[12px] text-[var(--ink-secondary)]">
                        {label}
                      </span>
                      <div className="col-span-7 h-[3px] bg-[#1E222A] overflow-hidden">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: pct / 100 }}
                          transition={{ type: "spring", stiffness: 320, damping: 32 }}
                          style={{ originX: 0 }}
                          className="h-full bg-[var(--accent-graphic)]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="my-5 h-[1px] bg-[#1E222A]" />

            {/* Typographic Sample Integrity — zero circular dials */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="text-[var(--ink-secondary)]">Independent Orgs:</span>
                  <span className="font-mono-tabular text-[var(--ink-primary)]">
                    {integrity.independentOrgs}/{integrity.totalInterviews} ({indepPct}%)
                  </span>
                </div>
                <div className="h-[2px] bg-[#1E222A]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: indepPct / 100 }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                    style={{ originX: 0 }}
                    className="h-full bg-[var(--accent-graphic)]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="text-[var(--ink-secondary)]">Founder Network:</span>
                  <span className="font-mono-tabular text-[var(--ink-primary)]">
                    {integrity.networkPct}%
                  </span>
                </div>
                <div className="h-[2px] bg-[#1E222A]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: integrity.networkPct / 100 }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                    style={{ originX: 0 }}
                    className="h-full bg-[var(--accent-graphic)]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="text-[var(--ink-secondary)]">Top Channel:</span>
                  <span className="font-mono-tabular text-[var(--ink-primary)]">
                    {integrity.topChannelPct}%
                  </span>
                </div>
                <div className="h-[2px] bg-[#1E222A]">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: integrity.topChannelPct / 100 }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                    style={{ originX: 0 }}
                    className="h-full bg-[var(--accent-graphic)]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Lower Full-Width Section — Claims & Verdicts */}
        <section id="claims" className="p-6 border-b border-[var(--border-hair)] flex-1">
          <h2 className="text-[15px] font-medium text-[var(--ink-primary)] mb-4">
            Claims &amp; Verdicts
          </h2>

          {claims.length === 0 ? (
            <div className="py-8 border-t border-[var(--border-hair)] font-mono-tabular text-[12px] text-[var(--ink-muted)]">
              No claims confirmed yet. Click Add Claim to formalise a belief.
            </div>
          ) : (
            <div className="border-t border-[var(--border-hair)] divide-y divide-[var(--border-hair)]">
              {claims.map((claim) => {
                const finding = findingsByClaim.get(claim.id);
                const statusLabel = !finding
                  ? "Unaudited"
                  : finding.finding === "SUPPORTED"
                    ? "Supported"
                    : finding.finding === "IMPRECISE"
                      ? "Imprecise"
                      : "Blocked";
                const statusColor = !finding
                  ? "text-[var(--ink-muted)]"
                  : finding.finding === "SUPPORTED"
                    ? "text-[var(--status-emerald)]"
                    : finding.finding === "IMPRECISE"
                      ? "text-[var(--status-amber)]"
                      : "text-[var(--status-crimson)]";

                const satSegments =
                  finding?.saturation === "meaning"
                    ? 3
                    : finding?.saturation === "code"
                      ? 2
                      : finding?.saturation === "basic" || finding?.finding === "SUPPORTED"
                        ? 3
                        : 1;

                const lo = finding?.interval ? finding.interval[0] : 0;
                const hi = finding?.interval ? finding.interval[1] : 1;

                return (
                  <div
                    key={claim.id}
                    className="py-4 grid grid-cols-1 lg:grid-cols-12 items-center gap-4 hover:bg-[var(--bg-elevated)]/60 px-2 -mx-2 transition-colors"
                  >
                    <div className="lg:col-span-7 flex flex-wrap items-baseline gap-2.5 min-w-0">
                      <span className="font-mono-tabular text-[11px] uppercase text-[var(--ink-muted)] shrink-0">
                        {claim.claimType} · L{claim.claimedLevel} ·
                      </span>
                      <span className="text-[13px] text-[var(--ink-primary)] truncate">
                        {claim.rawText}
                      </span>
                    </div>

                    <div className="lg:col-span-2">
                      <span className={`text-[12px] font-medium ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="lg:col-span-3">
                      {claim.claimType === "theme" ? (
                        <div className="grid grid-cols-3 gap-1 h-2">
                          {[1, 2, 3].map((seg) => (
                            <div
                              key={seg}
                              className={
                                seg <= satSegments && finding
                                  ? "bg-[#10B981]/80"
                                  : "bg-[#1E222A]"
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <div>
                          <div className="flex justify-end font-mono-tabular text-[11px] text-[var(--ink-secondary)] mb-1">
                            {finding?.interval
                              ? `[${lo.toFixed(2)}, ${hi.toFixed(2)}]`
                              : "No k/n"}
                          </div>
                          <div className="relative h-3 flex items-center">
                            <div className="w-full h-[1px] bg-[#262B35]" />
                            {finding?.interval && (
                              <>
                                <motion.div
                                  initial={{ scaleX: 0 }}
                                  animate={{ scaleX: 1 }}
                                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                                  style={{
                                    left: `${lo * 100}%`,
                                    width: `${Math.max(2, (hi - lo) * 100)}%`,
                                    originX: 0,
                                  }}
                                  className="absolute h-[1px] bg-[var(--accent-graphic)]"
                                />
                                <div
                                  style={{ left: `${lo * 100}%` }}
                                  className="absolute top-0.5 bottom-0.5 w-[1px] bg-[var(--accent-graphic)]"
                                />
                                <div
                                  style={{ left: `${Math.min(99, hi * 100)}%` }}
                                  className="absolute top-0.5 bottom-0.5 w-[1px] bg-[var(--accent-graphic)]"
                                />
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom Footer Strip — Latest Run */}
        <footer
          id="runs"
          className="px-6 py-3 bg-[var(--bg-canvas)] flex items-center justify-between"
        >
          {latestRun ? (
            <Link
              href={`/runs/${latestRun.id}`}
              className="font-mono-tabular text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] no-underline transition-colors"
            >
              Latest Run · <span className="text-[var(--ink-secondary)]">{latestRun.id}</span> ·{" "}
              {latestRun.findingHash} ·{" "}
              <span className={latestRun.status === "BLOCKED" ? "text-[var(--status-crimson)]" : "text-[var(--status-emerald)]"}>
                {latestRun.status}
              </span>
            </Link>
          ) : (
            <span className="font-mono-tabular text-[12px] text-[var(--ink-muted)]">
              No audit runs recorded yet.
            </span>
          )}
        </footer>
      </div>

      {/* Slide-Over Drawer (Image 3) */}
      <WorkspaceDrawer
        open={drawerOpen}
        slug={workspace.slug}
        onClose={() => setDrawerOpen(false)}
      />

      <AuthPromptModal
        open={authPromptOpen}
        onClose={() => setAuthPromptOpen(false)}
        actionLabel={promptAction}
      />
    </div>
  );
}
