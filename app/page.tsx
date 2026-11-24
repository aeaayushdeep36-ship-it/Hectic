"use client";

import { useMutation } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useContext,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  MAX_ROSTER_FILE_BYTES,
  MAX_ROSTER_ROWS,
  parseRosterUpload,
  type RosterUploadPreview,
} from "@/lib/roster-upload";
import { WorkspaceNavContext } from "@/components/WorkspaceNavContext";
import { DEFAULT_ANALYSIS_PROVIDER, MODEL_BY_PROVIDER } from "@/lib/provider-options";

const focusRing =
  "focus-visible:ring-2 focus-visible:ring-[var(--ink)] focus-visible:ring-offset-2";

export default function WorkspaceDashboard() {
  const workspaces = useContext(WorkspaceNavContext);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [preview, setPreview] = useState<RosterUploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workspaceSlug, setWorkspaceSlug] = useState(workspaces[0]?.slug ?? "");

  const audit = useMutation({
    mutationFn: async ({ slug, csv }: { slug: string; csv: string }): Promise<string> => {
      const importResponse = await fetch(`/api/workspaces/${slug}/evidence/import`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const imported = (await importResponse.json()) as { error?: string };
      if (!importResponse.ok) throw new Error(imported.error ?? "IMPORT_FAILED");

      const runResponse = await fetch(`/api/workspaces/${slug}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: DEFAULT_ANALYSIS_PROVIDER,
          modelId: MODEL_BY_PROVIDER[DEFAULT_ANALYSIS_PROVIDER],
        }),
      });
      const body = (await runResponse.json()) as { run?: { id: string }; error?: string };
      if (!runResponse.ok || !body.run) throw new Error(body.error ?? "RUN_FAILED");
      if (!/^[A-Za-z0-9_-]+$/.test(body.run.id)) throw new Error("RUN_FAILED");
      return body.run.id;
    },
    onSuccess: (runId) => {
      router.push(`/runs/${runId}`);
    },
  });

  const processFile = useCallback(async (uploadedFile: File) => {
    setError(null);
    setPreview(null);
    setIsParsing(true);
    try {
      setPreview(await parseRosterUpload(uploadedFile));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read this file.");
    } finally {
      setIsParsing(false);
    }
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const [first] = Array.from(event.dataTransfer.files);
      if (first) void processFile(first);
    },
    [processFile],
  );

  const onSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const [first] = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (first) void processFile(first);
    },
    [processFile],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const errorMessage = error ?? audit.error?.message ?? null;
  const busy = isParsing || audit.isPending;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="label">Hectic / evidence coverage auditor</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">Evidence Audit</h1>
        <p className="text-lg text-[var(--ink-muted)]">
          Upload your interview roster to begin structuring your evidence.
        </p>
      </header>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 text-center transition-colors bg-white",
          isDragging
            ? "border-[var(--ink-faint)] bg-[var(--surface-sunk)]"
            : "border-[var(--border)] hover:border-[var(--border-strong)]",
          errorMessage ? "border-[var(--signal-border)] bg-[var(--signal-bg)]" : "",
        )}
      >
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-[var(--surface-sunk)] rounded-full text-[var(--ink-muted)]">
            <UploadCloud size={32} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-medium text-[var(--ink)]">
              {preview ? preview.fileName : "Click to upload or drag and drop"}
            </p>
            <p id="file-upload-hint" className="text-sm text-[var(--ink-muted)] mt-1">
              CSV format only (max. {MAX_ROSTER_FILE_BYTES / 1_000_000}MB, {MAX_ROSTER_ROWS} rows)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            aria-label="Roster CSV file"
            aria-describedby="file-upload-hint"
            className="sr-only"
            id="file-upload"
            tabIndex={-1}
            onChange={onSelect}
          />
          <button
            type="button"
            data-testid="file-select-button"
            onClick={openFilePicker}
            aria-describedby="file-upload-hint"
            className={cn(
              "mt-4 px-6 py-2.5 bg-white border border-[var(--border-strong)] rounded-lg text-sm font-medium text-[var(--ink)] cursor-pointer transition-colors shadow-sm hover:bg-[var(--paper)]",
              focusRing,
            )}
          >
            Select File
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div
          role="alert"
          data-testid="upload-error"
          className="flex items-start gap-2 text-[var(--signal)] bg-[var(--signal-bg)] border border-[var(--signal-border)] p-4 rounded-lg text-sm"
        >
          <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      {isParsing ? (
        <p role="status" className="text-center text-[var(--ink-muted)]">
          Parsing data…
        </p>
      ) : null}

      {audit.isPending ? (
        <div role="status" className="card p-6" aria-live="polite">
          <p className="label">Working</p>
          <ol className="mono mt-3 space-y-1 text-[13px] text-[var(--ink-muted)]">
            <li>1. Import and redact roster</li>
            <li>2. Run deterministic audit</li>
          </ol>
          <p className="mt-4 text-sm text-[var(--ink-muted)]">Do not close this tab.</p>
        </div>
      ) : null}

      {workspaces.length > 0 ? (
        <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="workspace-select" className="label">
            Target workspace
          </label>
          <select
            id="workspace-select"
            className="field max-w-xs"
            value={workspaceSlug}
            onChange={(event) => setWorkspaceSlug(event.target.value)}
            disabled={busy}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.slug} value={workspace.slug}>
                {workspace.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-[var(--ink-muted)]">
          No workspaces yet — open a workspace to start an audit.
        </p>
      )}

      {preview && !isParsing ? (
        <div className="card overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--ink)] flex items-center gap-2">
                <CheckCircle2 className="text-[var(--confirm)]" size={20} aria-hidden="true" />
                Roster Parsed Successfully
              </h2>
              <p className="text-sm text-[var(--ink-muted)] mt-1">
                {preview.rowCount} {preview.rowCount === 1 ? "row" : "rows"} detected.
                {preview.invalidRowCount > 0
                  ? ` ${preview.invalidRowCount} rows will be skipped by the importer.`
                  : ""}
              </p>
            </div>
            {workspaceSlug ? (
              <button
                type="button"
                className={cn("btn btn-primary inline-flex items-center gap-2", focusRing)}
                disabled={busy}
                onClick={() =>
                  audit.mutate({ slug: workspaceSlug, csv: preview.csv })
                }
              >
                {audit.isPending ? "Analysing…" : "Run Audit"}
              </button>
            ) : null}
          </div>

          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-sm whitespace-nowrap" aria-label="Roster preview">
              <thead className="bg-[var(--paper)] text-[var(--ink-muted)] border-b border-[var(--border)] sticky top-0">
                <tr>
                  {preview.headers.map((key) => (
                    <th key={key} className="px-6 py-3 font-medium">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--ink)]">
                {preview.rows.slice(0, 10).map((row, index) => (
                  <tr key={index} className="hover:bg-[var(--paper)] transition-colors">
                    {row.map((value, column) => (
                      <td key={column} className="px-6 py-3 truncate max-w-[200px]">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.rowCount > 10 ? (
            <div className="p-4 border-t border-[var(--border)] text-center text-sm text-[var(--ink-muted)] bg-[var(--paper)]">
              Showing first 10 rows. All valid rows will be analysed.
            </div>
          ) : null}
        </div>
      ) : null}

      <footer className="border-t border-[var(--border)] pt-6 text-sm text-[var(--ink-muted)]">
        Need an existing audit?{" "}
        {workspaces[0] ? (
          <Link href={`/workspaces/${workspaces[0].slug}`} className="underline underline-offset-4">
            Open {workspaces[0].name}
          </Link>
        ) : (
          <span>No workspaces available.</span>
        )}
      </footer>
    </div>
  );
}
