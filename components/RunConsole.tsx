"use client";

import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AuthBar } from "./AuthBar";
import { ThemeToggle } from "./theme-toggle";
import type { FindingView, RunView } from "../lib/dto";
import { checkFalsifier } from "../lib/falsifier";
import {
  DEFAULT_ANALYSIS_PROVIDER,
  MODEL_BY_PROVIDER,
  PROVIDER_OPTIONS,
  type ProviderIdOption,
} from "../lib/provider-options";

type StreamEvent =
  | { type: "progress"; step: string; detail: string; completed: number; total: number }
  | {
      type: "done";
      runId: string;
      findingHash: string;
      providerId: string;
      callCount: number;
      cacheHits: number;
      fallbackReasons: readonly string[];
      latencyMs: number;
    }
  | { type: "error"; message: string };

const ACTIONS = [
  { value: "downgrade", label: "Downgrade claim to verified level" },
  { value: "fund_gap", label: "Fund gap with targeted interviews" },
  { value: "accept_limitation", label: "Accept with written limitation" },
] as const;

export function RunConsole({
  initialRun,
  workspaceSlug,
  workspaceName,
  orgCount,
}: {
  initialRun: RunView;
  workspaceSlug: string;
  workspaceName?: string;
  orgCount?: number;
}) {
  const [run, setRun] = useState(initialRun);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(() => {
    const firstOpen = initialRun.findings.find(
      (f) => f.finding !== "SUPPORTED" && f.resolution === null,
    );
    return firstOpen?.claimId ?? null;
  });
  const [action, setAction] = useState<"downgrade" | "fund_gap" | "accept_limitation">("downgrade");
  const [falsifier, setFalsifier] = useState("");
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [recompute, setRecompute] = useState<{ identical: boolean; hash: string } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamStep, setStreamStep] = useState<number>(4);
  const [streamLog, setStreamLog] = useState<string[]>([]);
  const [provider, setProvider] = useState<ProviderIdOption>(DEFAULT_ANALYSIS_PROVIDER);

  const unresolved = run.findings.filter(
    (f) => f.resolution === null && f.finding !== "SUPPORTED",
  );
  const resolvedFindings = run.findings.filter((f) => f.resolution !== null);
  const displayName = workspaceName ?? workspaceSlug;
  const displayOrgs = orgCount ?? Math.max(0, ...run.findings.map((f) => f.breadth));

  const falsifierCheck = checkFalsifier(falsifier);
  const falsifierValid = falsifier.trim().length >= 40 && falsifierCheck.ok;

  async function refresh() {
    const response = await fetch(`/api/runs/${run.id}`, { cache: "no-store" });
    if (!response.ok) return;
    const body = (await response.json()) as { run?: RunView };
    if (body.run) {
      setRun(body.run);
      const nextOpen = body.run.findings.find(
        (f) => f.finding !== "SUPPORTED" && f.resolution === null,
      );
      setSelectedClaimId(nextOpen?.claimId ?? null);
    }
  }

  async function copyHash() {
    const digest = (run.findingHash || run.inputHash).replace(/^sha256:/, "");
    try {
      await navigator.clipboard.writeText(digest);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable
    }
  }

  async function submitResolution() {
    if (!selectedClaimId || !falsifierValid) return;
    setBusy(true);
    setResolveError(null);
    const activeFinding = run.findings.find((f) => f.claimId === selectedClaimId);
    try {
      const response = await fetch(`/api/runs/${run.id}/resolutions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaimId,
          action,
          targetLevel: action === "downgrade" ? (activeFinding?.level ?? null) : null,
          falsifier: falsifier.trim(),
          note: null,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setResolveError(body.error ?? "RESOLUTION_REJECTED");
      } else {
        setFalsifier("");
        await refresh();
      }
    } catch {
      setResolveError("NETWORK_ERROR");
    } finally {
      setBusy(false);
    }
  }

  async function doStream() {
    setStreaming(true);
    setStreamStep(1);
    setStreamLog(["Connecting to agent stream…"]);
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/runs/stream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId: provider }),
      });
      if (!response.ok || !response.body) throw new Error(`STREAM_${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "progress") {
            if (event.step === "formalise") setStreamStep(2);
            else if (event.step === "tag" || event.step === "explain") setStreamStep(3);
            else if (event.step === "compose") setStreamStep(4);
            setStreamLog((cur) => [
              ...cur,
              `${event.step} — ${event.detail} (${event.completed}/${event.total})`,
            ]);
          } else if (event.type === "done") {
            setStreamStep(4);
            setStreamLog((cur) => [
              ...cur,
              `Done · ${event.providerId} · ${event.callCount} calls · ${event.latencyMs}ms`,
              `Finding hash ${event.findingHash}`,
            ]);
            const refreshed = await fetch(`/api/runs/${event.runId}`, { cache: "no-store" });
            if (refreshed.ok) {
              const body = (await refreshed.json()) as { run?: RunView };
              if (body.run) {
                setRun(body.run);
                window.history.replaceState(null, "", `/runs/${event.runId}`);
              }
            }
          } else {
            setStreamLog((cur) => [...cur, `Error — ${event.message}`]);
          }
        }
      }
    } catch (err) {
      setStreamLog((cur) => [
        ...cur,
        `Error — ${err instanceof Error ? err.message : "STREAM_FAILED"}`,
      ]);
    } finally {
      setStreaming(false);
    }
  }

  async function doRecompute() {
    setBusy(true);
    try {
      const response = await fetch(`/api/runs/${run.id}/recompute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId: provider, modelId: MODEL_BY_PROVIDER[provider] }),
      });
      const body = (await response.json()) as { identical?: boolean; run?: RunView };
      if (body.identical !== undefined && body.run) {
        setRecompute({ identical: body.identical, hash: body.run.findingHash ?? "" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function doExport() {
    setBusy(true);
    setExportError(null);
    try {
      const gate = await fetch(`/api/runs/${run.id}/export`, { cache: "no-store" });
      if (gate.status === 422) {
        const body = (await gate.json()) as { unresolved: string[] };
        setExportError(
          `Resolve ${body.unresolved.length} blocking checkpoint${body.unresolved.length === 1 ? "" : "s"} before exporting.`,
        );
        setBusy(false);
        return;
      }
      await fetch(`/api/runs/${run.id}/export`, { method: "POST" });
      window.location.href = `/runs/${run.id}/statement`;
    } catch {
      setExportError("NETWORK_ERROR");
      setBusy(false);
    }
  }

  const pipelineSteps = [
    { num: 1, label: "01 ROSTER" },
    { num: 2, label: "02 FORMALISER" },
    { num: 3, label: "03 ENGINE v1.0.0" },
    { num: 4, label: "04 CHECKPOINT" },
  ];

  const activeFalsifierDisplay =
    resolvedFindings.at(-1)?.resolution?.falsifier ??
    (falsifierValid ? falsifier.trim() : null);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      {/* ── Top Header Bar ──────────────────────────────────── */}
      <header className="no-print border-b border-[var(--border-hair)] bg-[var(--bg-canvas)] px-6 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Breadcrumb */}
          <nav className="font-mono-tabular text-[12px] text-[var(--ink-muted)]" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[var(--ink-primary)] no-underline">
              Workspaces
            </Link>
            <span className="mx-1.5">/</span>
            <Link
              href={`/workspaces/${workspaceSlug}`}
              className="hover:text-[var(--ink-primary)] no-underline"
            >
              {displayName}
            </Link>
            <span className="mx-1.5">/</span>
            <span className="text-[var(--ink-secondary)]">{run.id}</span>
          </nav>

          {/* 4-Step Pipeline Trace */}
          <div className="relative hidden md:flex items-center gap-4 pb-1">
            {pipelineSteps.map((step, idx) => {
              const active = step.num === streamStep;
              return (
                <div key={step.num} className="flex items-center gap-4">
                  {idx > 0 && <span className="w-5 h-[1px] bg-[var(--border-elevated)]" aria-hidden="true" />}
                  <span
                    className={`font-mono-tabular text-[11px] tracking-[0.06em] ${
                      active ? "text-[var(--accent-text)]" : "text-[var(--ink-muted)]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: streamStep / 4 }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              style={{ originX: 0 }}
              className="absolute bottom-0 left-0 right-0 h-[1px] bg-[var(--accent-graphic)]"
            />
          </div>

          {/* ThemeToggle + EXPORT PDF + Auth */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              disabled={busy || unresolved.length > 0}
              onClick={() => void doExport()}
              title={
                unresolved.length > 0
                  ? `${unresolved.length} blocking checkpoint(s) remaining`
                  : "Export verified statement"
              }
              className="px-4 py-1.5 bg-[var(--cta-bg)] text-[var(--cta-text)] border border-[var(--cta-bg)] font-mono-tabular text-[11px] tracking-[0.06em] rounded-[2px] hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity"
            >
              EXPORT PDF
            </button>
            <AuthBar compact />
          </div>
        </div>
      </header>

      {/* ── Main Split (62% Left Sheet / 38% Right Inspector) ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        {/* Left 62% (7 cols) — Print-Ready Statement */}
        <div className="lg:col-span-7 p-6 sm:p-10 bg-[var(--bg-canvas)] flex flex-col items-center justify-start">
          <article className="print-sheet w-full max-w-[680px] bg-[var(--bg-sheet)] text-[var(--ink-sheet)] border border-[var(--border-hair)] px-10 py-12 rounded-none flex flex-col justify-between min-h-[540px]">
            <div>
              <h1 className="font-display text-[36px] leading-[1.08] text-[#0F172A]">
                Evidence Statement
              </h1>
              <p className="mt-2 text-[13px] text-[#475569]">
                {displayName} · {displayOrgs} independent organisation{displayOrgs === 1 ? "" : "s"}
              </p>

              {/* Crisp Swiss Hairline Table */}
              <div className="mt-8 border-t border-[#0F172A] divide-y divide-[#CBD5E1]">
                {run.findings.length === 0 ? (
                  <p className="py-8 text-[13px] text-[#475569]">
                    No confirmed claims were audited in this run.
                  </p>
                ) : (
                  run.findings.map((finding, idx) => (
                    <StatementClaimRow
                      key={finding.claimId}
                      index={idx + 1}
                      finding={finding}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Bottom Verification Footer — single 1px Champagne Gold rule, no 3D seal */}
            <footer className="mt-12 pt-4 border-t border-[var(--accent-graphic)]">
              <p className="font-mono-tabular text-[11px] text-[#475569]">
                SHA-256 {(run.findingHash || run.inputHash).replace(/^sha256:/, "")} · ENGINE 1.0.0
              </p>
            </footer>
          </article>
        </div>

        {/* Right 38% (5 cols) — Inspector */}
        <aside className="no-print lg:col-span-5 bg-[var(--bg-surface)] border-t lg:border-t-0 lg:border-l border-[var(--border-hair)] divide-y divide-[var(--border-hair)] flex flex-col">
          {/* 1. CRYPTOGRAPHIC DIGEST */}
          <section className="p-6">
            <p className="font-mono-tabular text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-3">
              CRYPTOGRAPHIC DIGEST
            </p>
            <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border-elevated)] rounded-[2px]">
              <span className="font-mono-tabular text-[12px] text-[var(--ink-secondary)] truncate">
                {(run.findingHash || run.inputHash).replace(/^sha256:/, "")}
              </span>
              <button
                type="button"
                onClick={() => void copyHash()}
                aria-label="Copy cryptographic digest"
                className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer shrink-0 transition-colors"
              >
                {copied ? <Check size={14} className="text-[var(--status-emerald)]" /> : <Copy size={14} />}
              </button>
            </div>
            <p className="sr-only">hash {run.findingHash}</p>
          </section>

          {/* 2. ENGINE METADATA */}
          <section className="p-6">
            <p className="font-mono-tabular text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-3">
              ENGINE METADATA
            </p>
            <dl className="space-y-2 text-[13px]">
              <div className="flex items-center justify-between">
                <dt className="text-[var(--ink-secondary)]">Engine:</dt>
                <dd className="font-mono-tabular text-[var(--ink-primary)]">1.0.0</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--ink-secondary)]">Thresholds:</dt>
                <dd className="font-mono-tabular text-[var(--ink-primary)]">2026-11-24</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-[var(--ink-secondary)]">Provider:</dt>
                <dd className="font-mono-tabular text-[var(--ink-secondary)]">
                  {run.providerId}/{run.modelId}
                </dd>
              </div>
            </dl>
          </section>

          {/* 3. BLOCKING CHECKPOINT */}
          <section className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono-tabular text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                BLOCKING CHECKPOINT
              </p>
              <span
                className={`font-mono-tabular text-[11px] ${
                  unresolved.length === 0 ? "text-[var(--status-emerald)]" : "text-[var(--status-crimson)]"
                }`}
              >
                {unresolved.length === 0
                  ? "ALL CLEAR"
                  : `${unresolved.length} BLOCKING`}
              </span>
            </div>

            {unresolved.length === 0 && resolvedFindings.length === 0 ? (
              <p className="text-[13px] text-[var(--status-emerald)]">
                All claims supported. Export is available.
              </p>
            ) : (
              <div className="space-y-2.5">
                {run.findings
                  .filter((f) => f.finding !== "SUPPORTED")
                  .map((finding) => {
                    const isResolved = finding.resolution !== null;
                    const isSelected = selectedClaimId === finding.claimId;
                    return (
                      <label
                        key={finding.claimId}
                        className={`flex items-start gap-3 text-[13px] cursor-pointer ${
                          isResolved ? "text-[var(--ink-secondary)]" : "text-[var(--ink-primary)]"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isResolved || isSelected}
                          disabled={isResolved}
                          onChange={() =>
                            setSelectedClaimId(isSelected ? null : finding.claimId)
                          }
                          className="mt-1 h-4 w-4 rounded-[2px] border border-[var(--border-elevated)] bg-[var(--bg-canvas)] accent-[#D4AF6A]"
                        />
                        <span className="leading-[1.4]">
                          {isResolved
                            ? `${finding.claimText} (${finding.resolution?.action})`
                            : `Resolve ${finding.finding.toLowerCase().replace("_", " ")}: ${finding.claimText}`}
                        </span>
                      </label>
                    );
                  })}
              </div>
            )}

            {/* Inline Resolution Form when an unresolved checkpoint is selected */}
            {selectedClaimId && (
              <div className="mt-4 pt-4 border-t border-[var(--border-hair)] space-y-3">
                <select
                  aria-label="Resolution action"
                  value={action}
                  onChange={(e) =>
                    setAction(e.target.value as "downgrade" | "fund_gap" | "accept_limitation")
                  }
                  className="w-full px-3 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)]"
                >
                  {ACTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <textarea
                  rows={2}
                  aria-label="This claim dies if"
                  value={falsifier}
                  onChange={(e) => setFalsifier(e.target.value)}
                  placeholder="If fewer than 3 of 10 clinics prepay within 14 days, downgrade claim."
                  className="w-full px-3 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-graphic)] focus:outline-none"
                />

                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tabular text-[11px] text-[var(--ink-muted)]">
                    {falsifier.trim().length}/40 chars
                  </span>
                  <button
                    type="button"
                    disabled={busy || !falsifierValid}
                    onClick={() => void submitResolution()}
                    className="px-3.5 py-1.5 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[12px] font-medium rounded-[2px] hover:opacity-90 disabled:opacity-40 cursor-pointer transition-opacity"
                  >
                    {busy ? "Saving…" : "Confirm resolution"}
                  </button>
                </div>

                {resolveError && (
                  <p className="font-mono-tabular text-[11px] text-[var(--status-crimson)]" role="alert">
                    {resolveError}
                  </p>
                )}
              </div>
            )}

            {exportError && (
              <p className="mt-3 font-mono-tabular text-[11px] text-[var(--status-crimson)]" role="alert">
                {exportError}
              </p>
            )}
          </section>

          {/* 4. FALSIFIER CHECK */}
          <section className="p-6">
            <p className="font-mono-tabular text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)] mb-2">
              FALSIFIER CHECK
            </p>
            {activeFalsifierDisplay ? (
              <p className="text-[13px] leading-[1.55] text-[var(--ink-secondary)]">
                Observable rule verified:{" "}
                <span className="text-[var(--ink-primary)]">{activeFalsifierDisplay}</span>
              </p>
            ) : falsifier.trim().length > 0 ? (
              <p className="text-[12px] text-[var(--status-amber)]">
                {falsifier.trim().length < 40
                  ? "Requires at least 40 characters."
                  : falsifierCheck.reason}
              </p>
            ) : (
              <p className="text-[13px] leading-[1.55] text-[var(--ink-muted)]">
                Select a blocking checkpoint above and enter an observable condition
                (if/when/unless + numeric threshold) to unlock PDF export.
              </p>
            )}
          </section>

          {/* 5. DETERMINISM & AGENT CONTROLS */}
          <section className="p-6 mt-auto space-y-3 bg-[var(--bg-canvas)]/40">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as ProviderIdOption)}
                disabled={streaming || busy}
                className="px-2.5 py-1.5 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] font-mono-tabular text-[11px] text-[var(--ink-primary)]"
              >
                {PROVIDER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void doStream()}
                disabled={streaming || busy}
                className="px-3 py-1.5 border border-[var(--border-elevated)] bg-[var(--bg-surface)] text-[var(--ink-primary)] text-[11px] rounded-[2px] hover:bg-[var(--bg-elevated)] cursor-pointer disabled:opacity-40 transition-colors"
              >
                {streaming ? "Streaming…" : "Run agents"}
              </button>

              <button
                type="button"
                onClick={() => void doRecompute()}
                disabled={busy || streaming}
                className="px-3 py-1.5 border border-[var(--border-elevated)] bg-[var(--bg-surface)] text-[var(--ink-primary)] text-[11px] rounded-[2px] hover:bg-[var(--bg-elevated)] cursor-pointer disabled:opacity-40 transition-colors"
              >
                Recompute
              </button>
            </div>

            {recompute && (
              <p
                className={`font-mono-tabular text-[11px] ${
                  recompute.identical ? "text-[var(--status-emerald)]" : "text-[var(--status-crimson)]"
                }`}
              >
                {recompute.identical ? "IDENTICAL" : "DIVERGED"} · {recompute.hash}
              </p>
            )}

            {streamLog.length > 0 && (
              <ol
                className="max-h-28 overflow-y-auto font-mono-tabular text-[11px] text-[var(--ink-secondary)] space-y-0.5 pt-2 border-t border-[var(--border-hair)]"
                aria-live="polite"
              >
                {streamLog.map((line, i) => (
                  <li key={`${i}-${line}`}>{line}</li>
                ))}
              </ol>
            )}

            <div className="flex items-center gap-4 pt-1 font-mono-tabular text-[11px] text-[var(--ink-muted)]">
              <Link href={`/runs/${run.id}/recruiting`} className="hover:text-[var(--ink-primary)] no-underline">
                Recruiting brief →
              </Link>
              <a href={`/api/workspaces/${workspaceSlug}/events`} className="hover:text-[var(--ink-primary)] no-underline">
                Audit log JSON →
              </a>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function StatementClaimRow({
  index,
  finding,
}: {
  index: number;
  finding: FindingView;
}) {
  const num = String(index).padStart(2, "0");
  const isSupported = finding.finding === "SUPPORTED" || finding.resolution !== null;
  const statusLabel =
    finding.finding === "SUPPORTED"
      ? "Supported"
      : finding.resolution !== null
        ? "Resolved"
        : "Blocked";

  return (
    <div className="py-3.5 grid grid-cols-12 items-baseline gap-2 text-[13px]">
      <div className="col-span-6 text-[#0F172A] truncate" title={finding.claimText}>
        <span className="font-mono-tabular mr-2">{num} ·</span>
        {finding.claimText}
      </div>
      <div className="col-span-2 font-mono-tabular text-[#0F172A]">
        · L{finding.level}
      </div>
      <div className="col-span-2 font-mono-tabular text-[#0F172A]">
        {finding.interval
          ? `· 95% CI [${finding.interval[0].toFixed(2)}, ${finding.interval[1].toFixed(2)}]`
          : `· ${finding.support} org${finding.support === 1 ? "" : "s"}`}
      </div>
      <div
        className={`col-span-2 text-right font-medium ${
          isSupported ? "text-[#0B534D]" : "text-[#991B1B]"
        }`}
      >
        · {statusLabel}
      </div>
    </div>
  );
}
