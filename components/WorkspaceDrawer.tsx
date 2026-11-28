"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { LEVEL_LABELS } from "@/lib/levels";
import { DEFAULT_ANALYSIS_PROVIDER, MODEL_BY_PROVIDER } from "@/lib/provider-options";
import { parseRosterUpload, type RosterUploadPreview } from "@/lib/roster-upload";
import { useAuth } from "./AuthProvider";

interface Proposal {
  rawText: string;
  population: string;
  predicate: string;
  kind: string;
  claimType: "theme" | "prevalence";
  rationale: string;
  ambiguityFlags: string[];
}

export function WorkspaceDrawer({
  open,
  slug,
  onClose,
}: {
  open: boolean;
  slug: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<RosterUploadPreview | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const [sentence, setSentence] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [claimedLevel, setClaimedLevel] = useState("4");
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSaved, setClaimSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleFile = useCallback(async (file: File) => {
    setImportError(null);
    setImportStatus(null);
    try {
      const parsed = await parseRosterUpload(file);
      setPreview(parsed);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Could not parse CSV file.");
    }
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const [file] = Array.from(e.dataTransfer.files);
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const [file] = Array.from(e.target.files ?? []);
      e.target.value = "";
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  async function formaliseSentence() {
    if (sentence.trim().length < 3) return;
    setBusy(true);
    setClaimError(null);
    setClaimSaved(false);
    try {
      const res = await fetch(`/api/workspaces/${slug}/claims/formalise`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawText: sentence }),
      });
      const body = (await res.json()) as Proposal & { error?: string };
      if (!res.ok) {
        setClaimError(body.error ?? "FORMALISATION_FAILED");
      } else {
        setProposal(body);
      }
    } catch {
      setClaimError("Network error while formalising claim.");
    } finally {
      setBusy(false);
    }
  }

  async function saveClaimIfNeeded(): Promise<boolean> {
    if (!proposal || claimSaved) return true;
    const res = await fetch(`/api/workspaces/${slug}/claims`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rawText: proposal.rawText,
        population: proposal.population,
        predicate: proposal.predicate,
        kind: proposal.kind,
        claimType: proposal.claimType,
        claimedLevel: Number(claimedLevel),
        observed: null,
        precisionTolerance: null,
        ambiguityFlags: proposal.ambiguityFlags,
      }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      setClaimError(body.error ?? "Could not save claim.");
      return false;
    }
    setClaimSaved(true);
    return true;
  }

  async function runAudit() {
    if (!user) {
      setImportError("Please sign in before running an audit.");
      return;
    }
    setBusy(true);
    setImportError(null);
    setClaimError(null);
    try {
      if (preview) {
        const impRes = await fetch(`/api/workspaces/${slug}/evidence/import`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ csv: preview.csv }),
        });
        const impBody = (await impRes.json()) as { imported?: number; error?: string };
        if (!impRes.ok) {
          setImportError(impBody.error ?? "IMPORT_FAILED");
          setBusy(false);
          return;
        }
        setImportStatus(`${impBody.imported ?? 0} rows imported`);
      }

      if (sentence.trim().length >= 3 && !proposal) {
        await formaliseSentence();
      }
      if (proposal && !claimSaved) {
        const ok = await saveClaimIfNeeded();
        if (!ok) {
          setBusy(false);
          return;
        }
      }

      const runRes = await fetch(`/api/workspaces/${slug}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: DEFAULT_ANALYSIS_PROVIDER,
          modelId: MODEL_BY_PROVIDER[DEFAULT_ANALYSIS_PROVIDER],
        }),
      });
      const runBody = (await runRes.json()) as { run?: { id: string }; error?: string };
      if (!runRes.ok || !runBody.run) {
        setImportError(runBody.error ?? "RUN_FAILED");
        setBusy(false);
        return;
      }
      onClose();
      router.push(`/runs/${runBody.run.id}`);
      router.refresh();
    } catch {
      setImportError("Network error while running audit.");
      setBusy(false);
    }
  }

  const headerIdx = (name: string) => preview?.headers.indexOf(name) ?? -1;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Import Roster and Formalise Claim">
          {/* Flat dark backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#07080A]/75"
          />

          {/* Right Slide-Over Sheet (460px, 0px radius) */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-[460px] max-w-full h-full bg-[#0E1014] border-l border-[#262B35] rounded-none flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E222A]">
              <h2 className="text-[14px] font-medium text-[#F5F6F8]">
                Import Roster &amp; Formalise Claim
              </h2>
              <div className="flex items-center gap-3">
                <span className="font-mono-tabular text-[10px] uppercase tracking-[0.06em] px-2 py-0.5 bg-[#0F1D19] border border-[#183D31] text-[#10B981] rounded-[2px]">
                  PII REDACTED LOCALLY
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="text-[#9CA3AF] hover:text-[#F5F6F8] p-1 cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* CSV Dropzone */}
              <div>
                <p className="text-[12px] font-medium text-[#F5F6F8] mb-2.5">
                  CSV Dropzone
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  aria-label="Roster CSV file"
                  className="sr-only"
                  onChange={onFileChange}
                />
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                  onDrop={onDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
                  className={`py-10 px-4 border border-dashed rounded-none flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-[#D4AF6A] bg-[#15181F]"
                      : "border-[#D4AF6A]/65 bg-[#07080A] hover:bg-[#15181F]"
                  }`}
                >
                  <p className="text-[13px] text-[#9CA3AF] flex items-center gap-2">
                    <span>
                      Drop interview CSV or{" "}
                      <span className="text-[#D4AF6A] underline underline-offset-4">
                        browse files
                      </span>
                    </span>
                    <Upload size={14} className="text-[#D4AF6A]" />
                  </p>
                  {preview && (
                    <p className="mt-2 font-mono-tabular text-[11px] text-[#10B981]">
                      {preview.fileName} · {preview.rowCount} rows ready
                    </p>
                  )}
                </div>

                {importError && (
                  <p className="mt-2 font-mono-tabular text-[11px] text-[#EF4444]" role="alert">
                    {importError}
                  </p>
                )}
                {importStatus && (
                  <p className="mt-2 font-mono-tabular text-[11px] text-[#10B981]" role="status">
                    {importStatus}
                  </p>
                )}
              </div>

              {/* Parsed Preview Rows */}
              <div>
                <p className="text-[12px] font-medium text-[#F5F6F8] mb-2">
                  Import Interview Roster
                </p>
                <div className="border-t border-[#1E222A] divide-y divide-[#1E222A]">
                  {preview ? (
                    preview.rows.slice(0, 4).map((row, idx) => {
                      const org = row[headerIdx("orgId")] ?? row[1] ?? "org";
                      const seg = row[headerIdx("segment")] ?? row[3] ?? "Segment";
                      const role = row[headerIdx("role")] ?? row[4] ?? "role";
                      const lvl = row[headerIdx("evidenceType")] ?? row[7] ?? "2";
                      return (
                        <div
                          key={idx}
                          className="py-2.5 font-mono-tabular text-[12px] text-[#9CA3AF] truncate"
                        >
                          <span className="text-[#F5F6F8]">{org}</span> · {seg} · {role} · L{lvl}
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-3 font-mono-tabular text-[11px] text-[#7D8CA3]">
                      No file queued — upload a CSV above to preview redacted rows.
                    </p>
                  )}
                </div>
              </div>

              <div className="h-[1px] bg-[#1E222A]" />

              {/* Formalise Belief */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="drawer-belief" className="text-[12px] font-medium text-[#F5F6F8]">
                    Formalise Belief
                  </label>
                  <button
                    type="button"
                    disabled={busy || sentence.trim().length < 3}
                    onClick={() => void formaliseSentence()}
                    className="font-mono-tabular text-[11px] text-[#D4AF6A] hover:underline disabled:text-[#7D8CA3] disabled:no-underline cursor-pointer"
                  >
                    {busy ? "Parsing…" : "Formalise →"}
                  </button>
                </div>

                <textarea
                  id="drawer-belief"
                  rows={3}
                  value={sentence}
                  onChange={(e) => {
                    setSentence(e.target.value);
                    setProposal(null);
                    setClaimSaved(false);
                  }}
                  placeholder="e.g., Clinics will prepay €200/month for automated intake..."
                  className="w-full px-3.5 py-2.5 bg-[#07080A] border border-[#262B35] rounded-[2px] text-[13px] text-[#F5F6F8] placeholder:text-[#7D8CA3] focus:border-[#D4AF6A] focus:outline-none"
                />

                {proposal && (
                  <div className="mt-3 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular text-[11px] uppercase px-2 py-0.5 bg-[#15181F] border border-[#262B35] text-[#9CA3AF] rounded-[2px]">
                        {proposal.claimType}
                      </span>
                      <span className="font-mono-tabular text-[11px] px-2 py-0.5 bg-[#15181F] border border-[#262B35] text-[#9CA3AF] rounded-[2px]">
                        Population: {proposal.population}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label htmlFor="drawer-level" className="font-mono-tabular text-[11px] text-[#7D8CA3]">
                        Claimed Level
                      </label>
                      <select
                        id="drawer-level"
                        value={claimedLevel}
                        onChange={(e) => setClaimedLevel(e.target.value)}
                        className="px-2 py-1 bg-[#07080A] border border-[#262B35] rounded-[2px] font-mono-tabular text-[11px] text-[#F5F6F8]"
                      >
                        {([1, 2, 3, 4, 5, 6] as const).map((lvl) => (
                          <option key={lvl} value={lvl}>
                            L{lvl} · {LEVEL_LABELS[lvl]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void saveClaimIfNeeded()}
                        disabled={busy || claimSaved}
                        className="ml-auto px-2.5 py-1 border border-[#262B35] rounded-[2px] text-[11px] text-[#F5F6F8] hover:bg-[#15181F] cursor-pointer disabled:opacity-50"
                      >
                        {claimSaved ? "Saved ✓" : "Save Claim"}
                      </button>
                    </div>
                  </div>
                )}

                {claimError && (
                  <p className="mt-2 font-mono-tabular text-[11px] text-[#EF4444]" role="alert">
                    {claimError}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#1E222A] flex items-center justify-end gap-3 bg-[#0E1014]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-[12px] text-[#9CA3AF] hover:text-[#F5F6F8] border border-[#262B35] rounded-[2px] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAudit()}
                className="px-5 py-2 bg-[#D4AF6A] text-[#07080A] text-[12px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer disabled:opacity-50 transition-opacity"
              >
                {busy ? "Running…" : "Run Audit"}
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
