"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  parseRosterText,
  parseRosterUpload,
  ROSTER_REQUIRED_COLUMNS,
} from "../lib/roster-upload";
import { cn } from "@/lib/utils";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

interface ImportResult {
  readonly imported: number;
  readonly duplicates: number;
  readonly redacted: number;
  readonly injections: number;
  readonly errors: readonly { line: number; message: string }[];
}

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]";

export function RosterImport({ slug }: { slug: string }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    let validatedCsv: string;
    try {
      const validated = await parseRosterText(csv);
      validatedCsv = validated.csv;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid CSV format.");
      setBusy(false);
      return;
    }

    try {
      const response = await fetch(`/api/workspaces/${slug}/evidence/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv: validatedCsv }),
      });
      const body = (await response.json()) as ImportResult & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Import failed — please check your CSV format.");
      } else {
        setResult(body);
        setCsv("");
        setFileName(null);
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const preview = await parseRosterUpload(file);
      setCsv(preview.csv);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this file.");
      setFileName(null);
    }
  }

  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "2px",
        background: "var(--surface)",
        overflow: "hidden",
      }}
      aria-labelledby="import-heading"
    >
      {/* Header */}
      <div
        className="px-6 py-5"
        style={{ background: "var(--cream-dark)", borderBottom: "1px solid var(--border)" }}
      >
        <h2
          id="import-heading"
          className="serif text-[var(--ink)]"
          style={{ fontSize: "1.3rem" }}
        >
          Add more interviews
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Upload a CSV or paste your roster directly. Required columns:{" "}
          <span className="mono text-xs">{ROSTER_REQUIRED_COLUMNS.join(", ")}</span>.
          Cells are redacted before anything leaves this machine.
        </p>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* File upload */}
        <div>
          <label
            htmlFor="roster-file"
            className={cn(
              "flex items-center gap-4 cursor-pointer p-4 transition-colors",
              focusRing,
            )}
            style={{
              border: "1px dashed var(--border-strong)",
              borderRadius: "2px",
              background: fileName ? "var(--cream-dark)" : "var(--cream)",
            }}
          >
            <UploadCloud
              size={22}
              strokeWidth={1.5}
              aria-hidden="true"
              style={{ color: "var(--gold)", flexShrink: 0 }}
            />
            <div>
              <p className="text-sm font-medium text-[var(--ink)]">
                {fileName ?? "Choose a CSV file"}
              </p>
              <p className="text-xs text-[var(--ink-muted)] mt-0.5">
                .csv format only
              </p>
            </div>
            <input
              id="roster-file"
              type="file"
              accept=".csv,text/csv"
              aria-label="Roster CSV file"
              className="sr-only"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
        </div>

        {/* OR divider */}
        <div className="flex items-center gap-3">
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span className="label" style={{ letterSpacing: "0.1em" }}>or paste CSV</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* Textarea */}
        <label className="block">
          <span className="sr-only">Roster CSV content</span>
          <textarea
            className={cn("field mono", focusRing)}
            rows={4}
            value={csv}
            onChange={(e) => { setCsv(e.target.value); setFileName(null); }}
            placeholder={`${ROSTER_REQUIRED_COLUMNS.join(",")}\n…`}
            style={{ fontSize: "12px" }}
          />
        </label>

        {/* Import button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={cn("btn btn-primary text-sm", focusRing)}
            onClick={() => void submit()}
            disabled={busy || csv.trim().length === 0}
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="spinner" aria-hidden="true" />
                Importing…
              </span>
            ) : (
              "Import roster →"
            )}
          </button>
          {csv.trim().length > 0 && (
            <button
              type="button"
              className={cn("btn text-sm", focusRing)}
              onClick={() => { setCsv(""); setFileName(null); setError(null); setResult(null); }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2 px-4 py-3 text-sm"
            style={{
              background: "var(--signal-bg)",
              border: "1px solid var(--signal-border)",
              borderRadius: "2px",
              color: "var(--signal)",
            }}
            role="alert"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Success result */}
        {result && (
          <div
            className="px-4 py-4"
            style={{
              background: "var(--confirm-bg)",
              border: "1px solid var(--confirm-border)",
              borderRadius: "2px",
            }}
            role="status"
          >
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} style={{ color: "var(--confirm)" }} aria-hidden="true" />
              <p className="text-sm font-medium" style={{ color: "var(--confirm)" }}>
                Import complete
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              {[
                { label: "Imported", value: result.imported },
                { label: "Duplicates", value: result.duplicates },
                { label: "Redacted", value: result.redacted },
                { label: "Injection flags", value: result.injections },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="label" style={{ marginBottom: "2px" }}>{label}</p>
                  <p className="mono font-semibold text-[var(--ink)]">{value}</p>
                </div>
              ))}
            </div>
            {result.errors.length > 0 && (
              <ul className="mt-3 space-y-1">
                {result.errors.slice(0, 10).map((issue, index) => (
                  <li key={`${issue.line}-${index}`} className="mono text-xs text-[var(--signal)]">
                    Line {issue.line}: {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
