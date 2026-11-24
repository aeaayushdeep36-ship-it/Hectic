"use client";

import { useState } from "react";
import type { RunView } from "../lib/dto";
import { CheckpointDrawer } from "./CheckpointDrawer";
import { FindingRow } from "./FindingRow";

/** The wire format of the NDJSON stream. Kept local so no server code is bundled. */
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

export function RunConsole({
  initialRun,
  workspaceSlug,
}: {
  initialRun: RunView;
  workspaceSlug: string;
}) {
  const [run, setRun] = useState(initialRun);
  const [openClaim, setOpenClaim] = useState<string | null>(null);
  const [recompute, setRecompute] = useState<{ identical: boolean; hash: string } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamLog, setStreamLog] = useState<string[]>([]);

  const unresolved = run.findings.filter((finding) => finding.resolution === null && finding.finding !== "SUPPORTED");

  async function refresh() {
    const response = await fetch(`/api/runs/${run.id}`, { cache: "no-store" });
    const body = (await response.json()) as { run: RunView };
    setRun(body.run);
  }

  async function doStream() {
    setStreaming(true);
    setStreamLog(["Connecting to the agent stream…"]);
    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/runs/stream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId: "mock" }),
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
            setStreamLog((current) => [
              ...current,
              `${event.step} — ${event.detail} (${event.completed}/${event.total})`,
            ]);
          } else if (event.type === "done") {
            setStreamLog((current) => [
              ...current,
              `Done · ${event.providerId} · ${event.callCount} calls · ${event.cacheHits} cache hits · ${event.latencyMs} ms`,
              `Finding hash ${event.findingHash}`,
            ]);
            const refreshed = await fetch(`/api/runs/${event.runId}`, { cache: "no-store" });
            const body = (await refreshed.json()) as { run: RunView };
            setRun(body.run);
          } else {
            setStreamLog((current) => [...current, `Error — ${event.message}`]);
          }
        }
      }
    } catch (error) {
      setStreamLog((current) => [
        ...current,
        `Error — ${error instanceof Error ? error.message : "STREAM_FAILED"}`,
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
        body: JSON.stringify({ providerId: "ollama", modelId: "qwen2.5:7b" }),
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
        setExportError(`UNRESOLVED_FINDINGS: ${body.unresolved.length}`);
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

  const active = run.findings.find((finding) => finding.claimId === openClaim);

  return (
    <div>
      <div className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="label">Run</p>
          <p className="mono mt-1 text-[13px]">
            {run.status} · {run.providerId}/{run.modelId}
          </p>
          <p className="mono text-[12px] text-[var(--ink-muted)]">hash {run.findingHash}</p>
          <p className="mono text-[12px] text-[var(--ink-muted)]">
            input {run.inputHash} · {run.costEur.toFixed(2)} EUR · {run.callCount} calls
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={() => void doStream()} disabled={streaming || busy}>
            {streaming ? "Running agents…" : "Run agents with live status"}
          </button>
          <button type="button" className="btn" onClick={doRecompute} disabled={busy}>
            {busy ? "Working…" : "Recompute with another provider"}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={doExport}
            disabled={busy || unresolved.length > 0}
            title={unresolved.length > 0 ? `${unresolved.length} unresolved findings` : undefined}
          >
            Export statement
          </button>
          <a className="btn" href={`/runs/${run.id}/recruiting`}>
            Recruiting brief
          </a>
          <a className="btn" href={`/api/workspaces/${workspaceSlug}/events`}>
            Audit log
          </a>
        </div>
      </div>

      {streamLog.length > 0 ? (
        <section className="card mb-6 p-4" aria-live="polite" aria-label="Agent progress">
          <p className="label mb-2">Live agent status</p>
          <ol className="mono max-h-56 space-y-1 overflow-y-auto text-[12px] text-[var(--ink-muted)]">
            {streamLog.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ol>
          <p className="mt-2 text-[12px] text-[var(--ink-faint)]">
            Numbers are computed by the pure engine before these steps; no model produces a level, count or verdict.
          </p>
        </section>
      ) : null}

      {recompute ? (
        <div className="card mb-6 border-[var(--confirm-border)] bg-[var(--confirm-bg)] p-4">
          <p className="mono text-[13px] text-[var(--confirm)]">
            {recompute.identical ? "IDENTICAL" : "DIVERGED"} · {recompute.hash}
          </p>
          <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
            The provider changed; the finding hash did not. No number is produced by a model.
          </p>
        </div>
      ) : null}

      {unresolved.length > 0 ? (
        <p className="mb-4 text-[14px] text-[var(--signal)]">
          {unresolved.length} of {run.findings.length} claims have no resolution. Export is blocked.
        </p>
      ) : (
        <p className="mb-4 text-[14px] text-[var(--confirm)]">
          All claims resolved. Export is available.
        </p>
      )}

      {exportError ? (
        <p className="mono mb-4 text-[13px] text-[var(--signal)]" role="alert">
          {exportError}
        </p>
      ) : null}

      <ol className="space-y-4">
        {run.findings.map((finding) => (
          <li key={finding.claimId}>
            <FindingRow
              finding={finding}
              onResolve={
                finding.finding === "SUPPORTED" || finding.resolution
                  ? undefined
                  : () => setOpenClaim(finding.claimId)
              }
            />
            {active?.claimId === finding.claimId ? (
              <CheckpointDrawer
                runId={run.id}
                finding={active}
                onClose={() => setOpenClaim(null)}
                onResolved={() => {
                  setOpenClaim(null);
                  void refresh();
                }}
              />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
