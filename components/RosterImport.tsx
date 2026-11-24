"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  parseRosterText,
  parseRosterUpload,
  ROSTER_REQUIRED_COLUMNS,
} from "../lib/roster-upload";

interface ImportResult {
  readonly imported: number;
  readonly duplicates: number;
  readonly redacted: number;
  readonly injections: number;
  readonly errors: readonly { line: number; message: string }[];
}

export function RosterImport({ slug }: { slug: string }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const validated = await parseRosterText(csv);
      const response = await fetch(`/api/workspaces/${slug}/evidence/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv: validated.csv }),
      });
      const body = (await response.json()) as ImportResult & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "IMPORT_FAILED");
      } else {
        setResult(body);
        setCsv("");
        router.refresh();
      }
    } catch {
      setError("NETWORK_ERROR");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    try {
      const preview = await parseRosterUpload(file);
      setCsv(preview.csv);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this file.");
    }
  }

  return (
    <section className="card p-5" aria-labelledby="import-heading">
      <h2 id="import-heading" className="text-[20px] font-semibold">
        Import a roster
      </h2>
      <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
        Paste or choose a CSV with these columns: {ROSTER_REQUIRED_COLUMNS.join(", ")}. Names are
        not required — use an alias and a stable organisation reference. Cells are redacted before
        anything leaves this machine.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label="Roster CSV file"
          className="text-[13px]"
          onChange={(event) => void onFile(event.target.files?.[0])}
        />
        <span className="label">or paste</span>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Roster CSV content</span>
        <textarea
          className="field mono"
          rows={5}
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          placeholder={`${ROSTER_REQUIRED_COLUMNS.join(",")}\n…`}
        />
      </label>

      <button
        type="button"
        className="btn mt-3"
        onClick={() => void submit()}
        disabled={busy || csv.trim().length === 0}
      >
        {busy ? "Importing…" : "Import roster"}
      </button>

      {error ? (
        <p className="mono mt-3 text-[13px] text-[var(--signal)]" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-3 border-t border-[var(--border)] pt-3 text-[13px]" role="status">
          <p className="mono">
            {result.imported} imported · {result.duplicates} already present ·{" "}
            {result.redacted} redacted · {result.injections} injection flags
          </p>
          {result.errors.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[var(--signal)]">
              {result.errors.slice(0, 10).map((issue, index) => (
                <li key={`${issue.line}-${index}`} className="mono text-[12px]">
                  line {issue.line}: {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
