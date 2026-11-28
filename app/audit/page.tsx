"use client";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  FileText,
  FolderPlus,
  Lock,
  MoreVertical,
  Play,
  Printer,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type UIEvent,
} from "react";
import { AuthBar } from "@/components/AuthBar";
import { useAuth } from "@/components/AuthProvider";
import { HecticLogo } from "@/components/HecticLogo";
import { ThemeToggle } from "@/components/theme-toggle";
import { WorkspaceNavContext } from "@/components/WorkspaceNavContext";
import {
  validateClaimDraftText,
  validateClaimSubmission,
  validateCsvFileMeta,
} from "@/lib/account-validation";
import { getFirebaseDb } from "@/lib/firebase";
import { contentHash } from "@/lib/hash";
import { LEVEL_LABELS } from "@/lib/levels";
import { parseRosterUpload, type RosterUploadPreview } from "@/lib/roster-upload";
import type { Claim, EvidenceLevel, EvidenceRow } from "@/lib/types";
import {
  EVIDENCE_TYPE_TO_LEVEL,
  LEVEL_TO_EVIDENCE_TYPE,
  formaliseClaimViaWorker,
  parseEvidenceViaWorker,
  runAuditViaWorker,
  validateFalsifierViaWorker,
  type WorkerAuditResponse,
} from "@/lib/worker-api";

interface UserWorkspace {
  id: string;
  slug: string;
  name: string;
  contextNote: string | null;
  createdAt: number;
}

const STARTER_CSV = `id,orgId,alias,segment,role,channel,relationship,evidenceType,date,durationMin,notes
int_01,org_01,VP Operations,Clinics,economic,cold,cold,6,2026-10-12,45,Paid annual invoice for 12 seats after pilot.
int_02,org_02,Clinic Director,Clinics,economic,referral,referral,6,2026-10-14,40,Signed annual contract and cleared first payment.
int_03,org_03,Head of IT,Clinics,technical,cold,cold,4,2026-10-18,35,Committed engineering integration window for Q4.
int_04,org_04,Practice Lead,Dental,user,cold,cold,2,2026-10-20,30,Reported recurring scheduling drop-offs weekly.`;

const ROLE_COLUMNS: ReadonlyArray<{ key: string; label: string }> = [
  { key: "economic", label: "Economic" },
  { key: "technical", label: "Technical" },
  { key: "user", label: "User" },
  { key: "influencer", label: "Influencer" },
  { key: "none", label: "Unmapped" },
];

const LADDER_LEVELS: ReadonlyArray<{ level: EvidenceLevel; label: string }> = [
  { level: 1, label: "L1 Internal" },
  { level: 2, label: "L2 Stated" },
  { level: 3, label: "L3 Concept" },
  { level: 4, label: "L4 Commitment" },
  { level: 5, label: "L5 Investment" },
  { level: 6, label: "L6 Payment" },
];

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "audit";
}

function heatmapClass(orgs: number): string {
  if (orgs === 0) return "bg-[var(--bg-surface)] text-[var(--ink-muted)]";
  if (orgs <= 2) return "bg-[var(--heatmap-1)] text-[var(--ink-primary)]";
  if (orgs === 3) return "bg-[var(--heatmap-2)] text-[var(--ink-primary)]";
  return "bg-[var(--heatmap-3)] text-[var(--ink-primary)]";
}

function computeScrollRatio(el: HTMLElement): number {
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 0) return 1;
  return Math.min(1, Math.max(0.08, el.scrollTop / max));
}

export default function UserAuditStudioPage() {
  const { user, loading: authLoading } = useAuth();
  const sampleWorkspaces = useContext(WorkspaceNavContext);
  const fileRef = useRef<HTMLInputElement>(null);

  const [workspaces, setWorkspaces] = useState<UserWorkspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(true);
  const [creatingOpen, setCreatingOpen] = useState(false);

  // Sidebar menu & delete confirmation state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserWorkspace | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // New workspace form
  const [newName, setNewName] = useState("");
  const [newContext, setNewContext] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Active workspace data
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [auditResult, setAuditResult] = useState<WorkerAuditResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  // Golden scroll-progress indicators (0..1)
  const [evidenceScroll, setEvidenceScroll] = useState(0.15);
  const [claimsScroll, setClaimsScroll] = useState(0.15);

  // CSV upload state
  const [isDragging, setIsDragging] = useState(false);
  const [csvPreview, setCsvPreview] = useState<RosterUploadPreview | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);

  // Claim formaliser state
  const [rawClaim, setRawClaim] = useState("");
  const [population, setPopulation] = useState("");
  const [predicate, setPredicate] = useState("");
  const [kind, setKind] = useState<Claim["kind"]>("willingness_to_pay");
  const [claimType, setClaimType] = useState<Claim["claimType"]>("theme");
  const [claimedLevel, setClaimedLevel] = useState<EvidenceLevel>(6);
  const [observedK, setObservedK] = useState("");
  const [observedN, setObservedN] = useState("");
  const [formalising, setFormalising] = useState(false);
  const [savingClaim, setSavingClaim] = useState(false);
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [claimErr, setClaimErr] = useState<string | null>(null);

  // Audit execution & falsifier check state
  const [runningAudit, setRunningAudit] = useState(false);
  const [auditErr, setAuditErr] = useState<string | null>(null);
  const [falsifierText, setFalsifierText] = useState("");
  const [falsifierResult, setFalsifierResult] = useState<string | null>(null);
  const [falsifierErr, setFalsifierErr] = useState<string | null>(null);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? null,
    [workspaces, activeId],
  );

  const resetTransientState = useCallback(() => {
    setCsvPreview(null);
    setImportErr(null);
    setImportMsg(null);
    if (fileRef.current) fileRef.current.value = "";
    setRawClaim("");
    setPopulation("");
    setPredicate("");
    setKind("willingness_to_pay");
    setClaimType("theme");
    setClaimedLevel(6);
    setObservedK("");
    setObservedN("");
    setClaimErr(null);
    setClaimMsg(null);
    setAuditErr(null);
    setFalsifierText("");
    setFalsifierResult(null);
    setFalsifierErr(null);
    setEvidenceScroll(0.15);
    setClaimsScroll(0.15);
  }, []);

  // Close sidebar 3-dots menu on outside click / Escape
  useEffect(() => {
    if (!menuOpenId) return;
    function onDocClick() {
      setMenuOpenId(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpenId(null);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpenId]);

  // Load user's own workspaces from Firestore
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setWorkspaces([]);
      setActiveId(null);
      setLoadingWorkspaces(false);
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      setLoadingWorkspaces(false);
      return;
    }
    let active = true;
    setLoadingWorkspaces(true);
    const q = query(collection(db, "workspaces"), where("ownerId", "==", user.uid));
    void getDocs(q)
      .then((snap) => {
        if (!active) return;
        const list: UserWorkspace[] = snap.docs
          .map((d) => {
            const data = d.data() as {
              slug?: string;
              name?: string;
              contextNote?: string | null;
              createdAt?: number;
            };
            return {
              id: d.id,
              slug: data.slug ?? d.id,
              name: data.name ?? "Untitled Audit",
              contextNote: data.contextNote ?? null,
              createdAt: typeof data.createdAt === "number" ? data.createdAt : Date.now(),
            };
          })
          .sort((a, b) => b.createdAt - a.createdAt);
        setWorkspaces(list);
        if (list.length > 0) {
          const firstId = list[0]?.id ?? null;
          setActiveId((prev) => (prev && list.some((w) => w.id === prev) ? prev : firstId));
          setCreatingOpen(false);
        } else {
          setActiveId(null);
          setCreatingOpen(true);
        }
      })
      .catch(() => {
        if (active) setCreatingOpen(true);
      })
      .finally(() => {
        if (active) setLoadingWorkspaces(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, user]);

  // Load evidence + claims + latest saved audit result for active workspace
  useEffect(() => {
    if (!user || !activeId) {
      setEvidence([]);
      setClaims([]);
      setAuditResult(null);
      return;
    }
    const db = getFirebaseDb();
    if (!db) return;
    let active = true;
    setLoadingData(true);
    setAuditResult(null);
    void Promise.all([
      getDocs(collection(db, "workspaces", activeId, "evidence")),
      getDocs(query(collection(db, "workspaces", activeId, "claims"), orderBy("ordinal", "asc"))),
      getDocs(query(collection(db, "workspaces", activeId, "events"), orderBy("createdAt", "desc"))),
    ])
      .then(([evSnap, clSnap, evtSnap]) => {
        if (!active) return;
        const evRows: EvidenceRow[] = evSnap.docs.map((d) => {
          const r = d.data() as Record<string, unknown>;
          const level = EVIDENCE_TYPE_TO_LEVEL[String(r.evidenceType ?? "L2_stated")] ?? 2;
          return {
            id: d.id,
            alias: String(r.alias ?? "Interviewee"),
            date: String(r.interviewedAt ?? "2026-01-01"),
            role: (r.role as EvidenceRow["role"]) ?? "none",
            orgId: String(r.orgRef ?? "org_1"),
            segment: String(r.segment ?? "General"),
            channel: String(r.sourceChannel ?? "cold"),
            relationship: (r.relationship as EvidenceRow["relationship"]) ?? "unknown",
            evidenceType: level,
            durationMin: typeof r.durationMin === "number" ? r.durationMin : 30,
            notes: String(r.notesRedacted ?? r.notesRaw ?? ""),
          };
        });
        const clRows: Claim[] = clSnap.docs.map((d, idx) => {
          const c = d.data() as Record<string, unknown>;
          const k = typeof c.observedK === "number" ? c.observedK : null;
          const n = typeof c.observedN === "number" ? c.observedN : null;
          return {
            id: d.id,
            ordinal: typeof c.ordinal === "number" ? c.ordinal : idx,
            rawText: String(c.rawText ?? ""),
            population: String(c.population ?? ""),
            populationSpec: {},
            predicate: String(c.predicate ?? ""),
            kind: (c.kind as Claim["kind"]) ?? "pain",
            claimType: (c.claimType as Claim["claimType"]) ?? "theme",
            claimedLevel: (Number(c.claimedLevel ?? 2) as EvidenceLevel) || 2,
            observed: k !== null && n !== null ? { k, n } : null,
            precisionTolerance:
              typeof c.precisionTolerance === "number" ? c.precisionTolerance : null,
            confirmed: true,
          };
        });

        let savedAudit: WorkerAuditResponse | null = null;
        for (const evDoc of evtSnap.docs) {
          const ed = evDoc.data() as { type?: string; payloadJson?: string };
          if (ed.type === "AUDIT_RESULT" && typeof ed.payloadJson === "string") {
            try {
              savedAudit = JSON.parse(ed.payloadJson) as WorkerAuditResponse;
              break;
            } catch {
              // ignore malformed event payload
            }
          }
        }

        setEvidence(evRows);
        setClaims(clRows);
        setAuditResult(savedAudit);
      })
      .finally(() => {
        if (active) setLoadingData(false);
      });
    return () => {
      active = false;
    };
  }, [user, activeId]);

  function openNewWorkspaceForm() {
    resetTransientState();
    setNewName("");
    setNewContext("");
    setCreateError(null);
    setCreatingOpen(true);
  }

  function selectWorkspace(id: string) {
    if (id !== activeId) {
      resetTransientState();
      setActiveId(id);
    }
    setCreatingOpen(false);
  }

  async function handleCreateWorkspace(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      setCreateError("Please enter an audit workspace name.");
      return;
    }
    const db = getFirebaseDb();
    if (!db) {
      setCreateError("Firestore is not configured.");
      return;
    }
    setCreateBusy(true);
    setCreateError(null);
    try {
      const id = `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const now = Date.now();
      const slug = `${slugify(trimmed)}-${id.slice(-4)}`;
      await setDoc(doc(db, "workspaces", id), {
        ownerId: user.uid,
        slug,
        name: trimmed,
        contextNote: newContext.trim() || null,
        isDemo: false,
        createdAt: now,
        archivedAt: null,
      });
      const created: UserWorkspace = {
        id,
        slug,
        name: trimmed,
        contextNote: newContext.trim() || null,
        createdAt: now,
      };
      resetTransientState();
      setEvidence([]);
      setClaims([]);
      setAuditResult(null);
      setWorkspaces((prev) => [created, ...prev]);
      setActiveId(id);
      setNewName("");
      setNewContext("");
      setCreatingOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create workspace.");
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleConfirmDeleteWorkspace() {
    if (!deleteTarget) return;
    const db = getFirebaseDb();
    if (!db) return;
    setDeleteBusy(true);
    try {
      const targetId = deleteTarget.id;
      for (const sub of ["evidence", "claims", "runs", "events"] as const) {
        const snap = await getDocs(collection(db, "workspaces", targetId, sub));
        await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      }
      await deleteDoc(doc(db, "workspaces", targetId));

      const remaining = workspaces.filter((w) => w.id !== targetId);
      setWorkspaces(remaining);
      if (activeId === targetId) {
        resetTransientState();
        setEvidence([]);
        setClaims([]);
        setAuditResult(null);
        if (remaining.length > 0) {
          setActiveId(remaining[0]!.id);
          setCreatingOpen(false);
        } else {
          setActiveId(null);
          setCreatingOpen(true);
        }
      }
      setDeleteTarget(null);
    } finally {
      setDeleteBusy(false);
    }
  }

  const processCsvFile = useCallback((file: File) => {
    setImportErr(null);
    setImportMsg(null);
    setCsvPreview(null);

    const metaCheck = validateCsvFileMeta(file);
    if (!metaCheck.ok) {
      setImportErr(metaCheck.reason ?? "Invalid file type. Only .csv files are allowed.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    void parseRosterUpload(file)
      .then((parsed) => {
        setCsvPreview(parsed);
        if (parsed.rowCount === 0) {
          setImportErr("No valid data rows found in CSV.");
        }
      })
      .catch((err: unknown) => {
        setCsvPreview(null);
        setImportErr(err instanceof Error ? err.message : "Invalid CSV format.");
      });
  }, []);

  function onFileDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processCsvFile(file);
  }

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processCsvFile(file);
  }

  function loadStarterCsv() {
    setImportErr(null);
    setImportMsg(null);
    void parseRosterUpload({
      name: "starter-roster.csv",
      size: STARTER_CSV.length,
      text: async () => STARTER_CSV,
    })
      .then((parsed) => setCsvPreview(parsed))
      .catch((err: unknown) => {
        setImportErr(err instanceof Error ? err.message : "Could not load starter CSV.");
      });
  }

  async function importCsvToWorkspace() {
    if (!user || !activeId || !csvPreview) return;
    const db = getFirebaseDb();
    if (!db) return;
    setImportBusy(true);
    setImportErr(null);
    setImportMsg(null);
    try {
      const parsed = await parseEvidenceViaWorker(csvPreview.csv);
      if (parsed.rows.length === 0) {
        setImportErr(
          parsed.errors[0]?.reason ?? "No valid rows could be parsed from this CSV.",
        );
        return;
      }
      const now = Date.now();
      const savedRows: EvidenceRow[] = [];
      for (const [idx, row] of parsed.rows.entries()) {
        const docId = row.id || `ev_${now}_${idx}`;
        await setDoc(doc(db, "workspaces", activeId, "evidence", docId), {
          workspaceId: activeId,
          alias: row.alias,
          interviewedAt: row.date,
          role: row.role,
          orgRef: row.orgId,
          segment: row.segment,
          sourceChannel: row.channel,
          relationship: row.relationship,
          evidenceType: LEVEL_TO_EVIDENCE_TYPE[row.evidenceType] ?? "L2_stated",
          durationMin: row.durationMin,
          notesRaw: row.notes,
          notesRedacted: row.notes,
          importBatch: parsed.batchId,
          createdAt: now,
        });
        savedRows.push({ ...row, id: docId });
      }
      setEvidence((prev) => {
        const map = new Map(prev.map((r) => [r.id, r]));
        for (const r of savedRows) map.set(r.id, r);
        return Array.from(map.values());
      });
      setCsvPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      setImportMsg(
        `Imported ${savedRows.length} interview${savedRows.length === 1 ? "" : "s"} (PII redacted).`,
      );
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : "Failed to import CSV.");
    } finally {
      setImportBusy(false);
    }
  }

  async function handleFormalise() {
    if (evidence.length === 0) {
      setClaimErr("Step 02 required: Import a valid interview CSV roster before formalising claims.");
      return;
    }
    const textCheck = validateClaimDraftText(rawClaim);
    if (!textCheck.ok) {
      setClaimErr(textCheck.reason ?? "Please enter a valid founder or customer claim.");
      return;
    }

    setFormalising(true);
    setClaimErr(null);
    setClaimMsg(null);
    try {
      const res = await formaliseClaimViaWorker(rawClaim.trim());
      setPopulation(res.population);
      setPredicate(res.predicate);
      setKind(res.kind);
      setClaimType(res.claimType);
      setClaimedLevel(res.claimedLevel);
      setClaimMsg("Claim formalised. Review fields below and click Add Claim.");
    } catch (err) {
      setClaimErr(err instanceof Error ? err.message : "Could not formalise claim.");
    } finally {
      setFormalising(false);
    }
  }

  async function handleAddClaim(e: FormEvent) {
    e.preventDefault();
    if (!user || !activeId) return;
    if (evidence.length === 0) {
      setClaimErr("Step 02 required: Import a valid interview CSV roster before adding claims.");
      return;
    }
    const db = getFirebaseDb();
    if (!db) return;

    const claimCheck = validateClaimSubmission({
      rawText: rawClaim,
      population,
      predicate,
      claimType,
      observedK,
      observedN,
    });
    if (!claimCheck.ok) {
      setClaimErr(claimCheck.reason ?? "Please check your claim fields.");
      return;
    }

    const obsK = claimType === "prevalence" ? Number.parseInt(observedK, 10) : null;
    const obsN = claimType === "prevalence" ? Number.parseInt(observedN, 10) : null;

    setSavingClaim(true);
    setClaimErr(null);
    setClaimMsg(null);
    try {
      const now = Date.now();
      const id = `clm_${now.toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const ordinal = claims.length;
      await setDoc(doc(db, "workspaces", activeId, "claims", id), {
        workspaceId: activeId,
        ordinal,
        rawText: rawClaim.trim(),
        population: population.trim(),
        populationSpec: { segments: [], roles: [] },
        predicate: predicate.trim(),
        kind,
        claimType,
        claimedLevel,
        observedK: obsK,
        observedN: obsN,
        precisionTolerance: claimType === "prevalence" ? 0.3 : null,
        proposedByAgent: true,
        modelProposal: null,
        humanEditDiff: null,
        ambiguityFlags: null,
        confirmedAt: now,
        createdAt: now,
      });
      const newClaim: Claim = {
        id,
        ordinal,
        rawText: rawClaim.trim(),
        population: population.trim(),
        populationSpec: {},
        predicate: predicate.trim(),
        kind,
        claimType,
        claimedLevel,
        observed: obsK !== null && obsN !== null ? { k: obsK, n: obsN } : null,
        precisionTolerance: claimType === "prevalence" ? 0.3 : null,
        confirmed: true,
      };
      setClaims((prev) => [...prev, newClaim]);
      setRawClaim("");
      setPopulation("");
      setPredicate("");
      setObservedK("");
      setObservedN("");
      setClaimMsg("Claim added to audit.");
    } catch (err) {
      setClaimErr(err instanceof Error ? err.message : "Could not save claim.");
    } finally {
      setSavingClaim(false);
    }
  }

  async function handleRemoveClaim(claimId: string) {
    if (!activeId) return;
    const db = getFirebaseDb();
    if (!db) return;
    await deleteDoc(doc(db, "workspaces", activeId, "claims", claimId));
    setClaims((prev) => prev.filter((c) => c.id !== claimId));
  }

  async function handleRunAudit() {
    if (!activeId) return;
    if (evidence.length === 0) {
      setAuditErr("Import at least one interview row before running the audit.");
      return;
    }
    if (claims.length === 0) {
      setAuditErr("Add at least one formalised claim before running the audit.");
      return;
    }
    setRunningAudit(true);
    setAuditErr(null);
    try {
      const res = await runAuditViaWorker(evidence, claims);
      setAuditResult(res);
      const db = getFirebaseDb();
      if (db) {
        const now = Date.now();
        const runId = `run_${now.toString(36)}`;
        const blocked = res.findings.some((f) => f.kind !== "SUPPORTED");
        await setDoc(doc(db, "workspaces", activeId, "runs", runId), {
          workspaceId: activeId,
          status: blocked ? "BLOCKED" : "ANALYSED",
          engineVersion: res.engineVersion,
          thresholdVersion: res.thresholdVersion,
          inputHash: contentHash({ evidenceCount: evidence.length, claimCount: claims.length }),
          findingHash: res.findingHash,
          providerId: "deterministic",
          modelId: null,
          startedAt: now,
          finishedAt: now,
          costEur: 0,
          callCount: 0,
        });
        const payload = JSON.stringify(res);
        if (payload.length <= 49000) {
          await setDoc(doc(db, "workspaces", activeId, "events", runId), {
            workspaceId: activeId,
            runId,
            type: "AUDIT_RESULT",
            payloadJson: payload,
            createdAt: now,
          });
        }
      }
    } catch (err) {
      setAuditErr(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setRunningAudit(false);
    }
  }

  async function handleCheckFalsifier(e: FormEvent) {
    e.preventDefault();
    setFalsifierErr(null);
    setFalsifierResult(null);
    try {
      const res = await validateFalsifierViaWorker(falsifierText);
      if (!res.ok) {
        setFalsifierErr(
          res.error ?? "Falsifier must include a measurable threshold and timeframe (40+ chars).",
        );
      } else {
        setFalsifierResult("Falsifier rule verified and accepted.");
      }
    } catch {
      setFalsifierErr("Could not validate falsifier.");
    }
  }

  function onEvidenceScroll(e: UIEvent<HTMLDivElement>) {
    setEvidenceScroll(computeScrollRatio(e.currentTarget));
  }

  function onClaimsScroll(e: UIEvent<HTMLDivElement>) {
    setClaimsScroll(computeScrollRatio(e.currentTarget));
  }

  // Derived integrity & ladder metrics
  const ladderCounts = useMemo(() => {
    const counts: Record<EvidenceLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const row of evidence) {
      counts[row.evidenceType] = (counts[row.evidenceType] ?? 0) + 1;
    }
    return counts;
  }, [evidence]);

  const orgCount = useMemo(() => new Set(evidence.map((e) => e.orgId)).size, [evidence]);
  const maxLadder = Math.max(1, ...Object.values(ladderCounts));
  const step3Unlocked = evidence.length > 0;

  // Unauthenticated gate
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
        <header className="h-16 border-b border-[var(--border-hair)] px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <HecticLogo size={28} />
            <span className="font-display text-[24px] leading-none text-[var(--ink-primary)]">Hectic</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthBar />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-[460px] bg-[var(--bg-surface)] border border-[var(--border-hair)] p-8 space-y-5">
            <p className="font-mono-tabular text-[11px] uppercase tracking-[0.12em] text-[var(--accent-text)]">
              SIGN IN REQUIRED
            </p>
            <h1 className="font-display text-[32px] leading-[1.08] text-[var(--ink-primary)]">
              Create an account to start your audit
            </h1>
            <p className="text-[13px] leading-[1.6] text-[var(--ink-secondary)]">
              Your workspaces, interview rosters, and deterministic evidence statements are private
              to your account. Sign in or create an account first to begin.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link
                href="/signin"
                className="px-5 py-2.5 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[13px] font-medium rounded-[2px] no-underline hover:opacity-90"
              >
                Create Account / Sign In
              </Link>
              <Link
                href="/workspaces/clean"
                className="text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] no-underline"
              >
                Explore sample demo →
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      {/* ── Left Sidebar: User Workspaces First, Sample Demos Aside ── */}
      <aside className="hidden md:flex w-[250px] shrink-0 flex-col border-r border-[var(--border-hair)] bg-[var(--bg-canvas)]">
        <div className="h-16 px-5 flex items-center justify-between border-b border-[var(--border-hair)]">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <HecticLogo size={24} />
            <span className="font-display text-[20px] leading-none text-[var(--ink-primary)]">Hectic</span>
          </Link>
        </div>

        <div className="p-4 border-b border-[var(--border-hair)]">
          <button
            type="button"
            onClick={openNewWorkspaceForm}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[12px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer"
          >
            <FolderPlus size={14} />
            New Audit Workspace
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-4 space-y-6">
          <div>
            <p className="px-2 mb-2 font-mono-tabular text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              YOUR AUDITS
            </p>
            {loadingWorkspaces ? (
              <p className="px-2 font-mono-tabular text-[11px] text-[var(--ink-muted)]">Loading…</p>
            ) : workspaces.length === 0 ? (
              <p className="px-2 text-[12px] text-[var(--ink-muted)]">
                No workspaces yet. Create your first audit.
              </p>
            ) : (
              <div className="space-y-1">
                {workspaces.map((ws) => {
                  const isActive = ws.id === activeId && !creatingOpen;
                  const isMenuOpen = menuOpenId === ws.id;
                  return (
                    <div
                      key={ws.id}
                      className={`relative flex items-center justify-between rounded-[2px] transition-colors ${
                        isActive
                          ? "bg-[var(--bg-elevated)] text-[var(--accent-text)] border-l-2 border-[var(--accent-graphic)]"
                          : "text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--bg-surface)]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => selectWorkspace(ws.id)}
                        className="flex-1 min-w-0 text-left px-3 py-2 text-[13px] cursor-pointer truncate"
                      >
                        {ws.name}
                      </button>

                      <button
                        type="button"
                        aria-label={`Audit options for ${ws.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(isMenuOpen ? null : ws.id);
                        }}
                        className="px-2 py-2 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] cursor-pointer shrink-0"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-1 top-full mt-1 w-36 bg-[var(--bg-elevated)] border border-[var(--border-elevated)] rounded-[2px] z-40 shadow-md"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenId(null);
                              setDeleteTarget(ws);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] text-[var(--status-crimson)] hover:bg-[var(--status-crimson-bg)] cursor-pointer"
                          >
                            <Trash2 size={13} />
                            Delete Audit
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[var(--border-hair)]">
            <p className="px-2 mb-2 font-mono-tabular text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              SAMPLE DEMOS
            </p>
            <div className="space-y-1">
              {sampleWorkspaces.map((demo) => (
                <Link
                  key={demo.slug}
                  href={`/workspaces/${demo.slug}`}
                  className="block px-3 py-1.5 text-[12px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] no-underline truncate"
                >
                  {demo.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main Studio Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[var(--border-hair)] px-6 lg:px-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="font-mono-tabular text-[11px] uppercase tracking-[0.12em] text-[var(--accent-text)]">
              USER AUDIT STUDIO
            </span>
            {activeWorkspace && !creatingOpen && (
              <>
                <span className="text-[var(--border-elevated)]">/</span>
                <span className="text-[13px] text-[var(--ink-primary)] truncate">
                  {activeWorkspace.name}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={openNewWorkspaceForm}
              className="md:hidden px-3 py-1.5 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[12px] font-medium rounded-[2px] cursor-pointer"
            >
              + New Audit
            </button>
            <AuthBar />
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-10 max-w-[1160px] w-full mx-auto space-y-8">
          {/* Create Workspace Form */}
          {(creatingOpen || !activeWorkspace) && (
            <motion.section
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--bg-surface)] border border-[var(--border-hair)] p-8"
            >
              <p className="font-mono-tabular text-[11px] uppercase tracking-[0.12em] text-[var(--accent-text)] mb-2">
                STEP 01 · CREATE YOUR AUDIT WORKSPACE
              </p>
              <h1 className="font-display text-[34px] leading-[1.08] text-[var(--ink-primary)]">
                Start a new evidence audit
              </h1>
              <p className="mt-2 text-[13px] text-[var(--ink-secondary)] max-w-[60ch]">
                Name your workspace, then upload your interview CSV and formalise the claims you
                want verified with deterministic math.
              </p>

              <form onSubmit={(e) => void handleCreateWorkspace(e)} className="mt-6 space-y-4 max-w-[540px]">
                <div>
                  <label
                    htmlFor="ws-name"
                    className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[var(--ink-secondary)] mb-1.5"
                  >
                    Audit Workspace Name
                  </label>
                  <input
                    id="ws-name"
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Acme Q4 Buyer Discovery"
                    className="w-full px-3.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-graphic)] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="ws-context"
                    className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[var(--ink-secondary)] mb-1.5"
                  >
                    Context Note (Optional)
                  </label>
                  <textarea
                    id="ws-context"
                    rows={2}
                    value={newContext}
                    onChange={(e) => setNewContext(e.target.value)}
                    placeholder="Target segment, pricing hypothesis, or diligence scope..."
                    className="w-full px-3.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-graphic)] focus:outline-none"
                  />
                </div>
                {createError && (
                  <p className="font-mono-tabular text-[11px] text-[var(--status-crimson)]">
                    {createError}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={createBusy}
                    className="px-5 py-2.5 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[13px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer disabled:opacity-50"
                  >
                    {createBusy ? "Creating…" : "Create Workspace & Continue"}
                  </button>
                  {activeWorkspace && (
                    <button
                      type="button"
                      onClick={() => setCreatingOpen(false)}
                      className="px-4 py-2.5 border border-[var(--border-elevated)] text-[12px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] rounded-[2px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </motion.section>
          )}

          {/* Active User Audit Workspace */}
          {activeWorkspace && !creatingOpen && (
            <>
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-hair)] pb-6">
                <div>
                  <h1 className="font-display text-[36px] leading-[1.06] text-[var(--ink-primary)]">
                    {activeWorkspace.name}
                  </h1>
                  <p className="mt-1.5 font-mono-tabular text-[12px] text-[var(--ink-muted)]">
                    {loadingData
                      ? "Loading workspace…"
                      : `${evidence.length} interviews · ${orgCount} orgs · ${claims.length} claims`}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={runningAudit || evidence.length === 0 || claims.length === 0}
                  onClick={() => void handleRunAudit()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[13px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer disabled:opacity-45"
                >
                  <Play size={14} />
                  {runningAudit ? "Running Audit…" : "Run Deterministic Audit"}
                </button>
              </div>

              {auditErr && (
                <div className="px-4 py-3 bg-[var(--status-crimson-bg)] border border-[var(--status-crimson-border)] text-[var(--status-crimson)] font-mono-tabular text-[12px]">
                  {auditErr}
                </div>
              )}

              {/* Step 02 & Step 03 Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Step 02: Interview Roster CSV Upload */}
                <section className="lg:col-span-6 bg-[var(--bg-surface)] border border-[var(--border-hair)] p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular text-[11px] uppercase tracking-[0.1em] text-[var(--accent-text)]">
                      02 · INTERVIEW ROSTER
                    </span>
                    <button
                      type="button"
                      onClick={loadStarterCsv}
                      className="font-mono-tabular text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)] underline cursor-pointer"
                    >
                      Load starter CSV template
                    </button>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onFileDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border border-dashed p-6 text-center cursor-pointer transition-colors ${
                      isDragging
                        ? "border-[var(--accent-graphic)] bg-[var(--bg-elevated)]"
                        : "border-[var(--border-elevated)] hover:border-[var(--ink-muted)]"
                    }`}
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={onFileInput}
                      className="hidden"
                    />
                    <Upload size={18} className="mx-auto text-[var(--accent-text)] mb-2" />
                    <p className="text-[13px] text-[var(--ink-primary)]">
                      Drop valid .csv roster here or click to browse
                    </p>
                    <p className="mt-1 font-mono-tabular text-[11px] text-[var(--ink-muted)]">
                      Required .csv columns: id, orgId, alias, segment, role, channel, relationship, evidenceType, date
                    </p>
                  </div>

                  {csvPreview && (
                    <div className="p-4 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] space-y-3">
                      <div className="flex items-center justify-between font-mono-tabular text-[11px]">
                        <span className="text-[var(--ink-primary)]">{csvPreview.fileName}</span>
                        <span className="text-[var(--status-emerald)]">
                          {csvPreview.rowCount} valid rows detected
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={importBusy}
                        onClick={() => void importCsvToWorkspace()}
                        className="w-full py-2 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[12px] font-medium rounded-[2px] cursor-pointer disabled:opacity-50"
                      >
                        {importBusy ? "Redacting PII & Importing…" : "Import & Save Roster"}
                      </button>
                    </div>
                  )}

                  {importErr && (
                    <div
                      role="alert"
                      className="px-3 py-2 bg-[var(--status-crimson-bg)] border border-[var(--status-crimson-border)] font-mono-tabular text-[11px] text-[var(--status-crimson)]"
                    >
                      {importErr}
                    </div>
                  )}
                  {importMsg && (
                    <p className="font-mono-tabular text-[11px] text-[var(--status-emerald)]">
                      {importMsg}
                    </p>
                  )}

                  {evidence.length > 0 && (
                    <div className="border-t border-[var(--border-hair)] pt-4 space-y-2">
                      <p className="font-mono-tabular text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                        IMPORTED INTERVIEWS ({evidence.length})
                      </p>
                      <div
                        onScroll={onEvidenceScroll}
                        className="max-h-[220px] overflow-y-auto no-scrollbar space-y-0.5 pr-1"
                      >
                        {evidence.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between py-2 border-b border-[var(--border-hair)] font-mono-tabular text-[11px]"
                          >
                            <span className="text-[var(--ink-primary)] truncate">
                              {ev.orgId} · {ev.segment} · {ev.role}
                            </span>
                            <span className="text-[var(--accent-text)] shrink-0 ml-2">
                              L{ev.evidenceType}
                            </span>
                          </div>
                        ))}
                      </div>
                      {/* Golden Scroll Progress Line */}
                      <div className="h-[2px] w-full bg-[var(--border-hair)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-graphic)] transition-all duration-150"
                          style={{ width: `${Math.round(evidenceScroll * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </section>

                {/* Step 03: Formalise & Add Claims (Locked until valid CSV imported) */}
                <section
                  className={`lg:col-span-6 bg-[var(--bg-surface)] border border-[var(--border-hair)] p-6 space-y-4 transition-opacity ${
                    step3Unlocked ? "opacity-100" : "opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tabular text-[11px] uppercase tracking-[0.1em] text-[var(--accent-text)]">
                      03 · FORMALISE &amp; ADD CLAIMS
                    </span>
                    {!step3Unlocked && (
                      <span className="inline-flex items-center gap-1.5 font-mono-tabular text-[10px] text-[var(--status-amber)]">
                        <Lock size={11} />
                        IMPORT CSV FIRST
                      </span>
                    )}
                  </div>

                  {!step3Unlocked && (
                    <div className="px-3.5 py-2.5 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] font-mono-tabular text-[11px] text-[var(--ink-secondary)]">
                      Step 02 required: Import a valid interview CSV roster before formalising and
                      adding claims.
                    </div>
                  )}

                  <form onSubmit={(e) => void handleAddClaim(e)} className="space-y-3">
                    <div>
                      <label
                        htmlFor="claim-raw"
                        className="block font-mono-tabular text-[11px] uppercase text-[var(--ink-secondary)] mb-1"
                      >
                        Founder / Product Claim
                      </label>
                      <div className="flex gap-2">
                        <input
                          id="claim-raw"
                          type="text"
                          disabled={!step3Unlocked}
                          value={rawClaim}
                          onChange={(e) => setRawClaim(e.target.value)}
                          placeholder="e.g. Clinic buyers are willing to pay annually after pilot"
                          className="flex-1 px-3 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[13px] text-[var(--ink-primary)] focus:border-[var(--accent-graphic)] focus:outline-none disabled:cursor-not-allowed"
                        />
                        <button
                          type="button"
                          disabled={!step3Unlocked || formalising}
                          onClick={() => void handleFormalise()}
                          className="px-3 py-2 border border-[var(--accent-graphic)] text-[var(--accent-text)] text-[12px] rounded-[2px] hover:bg-[var(--bg-elevated)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                          {formalising ? "Parsing…" : "Formalise"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="claim-pop"
                          className="block font-mono-tabular text-[11px] uppercase text-[var(--ink-secondary)] mb-1"
                        >
                          Target Population
                        </label>
                        <input
                          id="claim-pop"
                          type="text"
                          disabled={!step3Unlocked}
                          value={population}
                          onChange={(e) => setPopulation(e.target.value)}
                          placeholder="e.g. Clinics"
                          className="w-full px-3 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)] focus:border-[var(--accent-graphic)] focus:outline-none disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="claim-pred"
                          className="block font-mono-tabular text-[11px] uppercase text-[var(--ink-secondary)] mb-1"
                        >
                          Predicate
                        </label>
                        <input
                          id="claim-pred"
                          type="text"
                          disabled={!step3Unlocked}
                          value={predicate}
                          onChange={(e) => setPredicate(e.target.value)}
                          placeholder="e.g. paid annual invoice"
                          className="w-full px-3 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)] focus:border-[var(--accent-graphic)] focus:outline-none disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label
                          htmlFor="claim-type"
                          className="block font-mono-tabular text-[10px] uppercase text-[var(--ink-secondary)] mb-1"
                        >
                          Claim Type
                        </label>
                        <select
                          id="claim-type"
                          disabled={!step3Unlocked}
                          value={claimType}
                          onChange={(e) => setClaimType(e.target.value as Claim["claimType"])}
                          className="w-full px-2.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)] disabled:cursor-not-allowed"
                        >
                          <option value="theme">Theme</option>
                          <option value="prevalence">Prevalence</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="claim-level"
                          className="block font-mono-tabular text-[10px] uppercase text-[var(--ink-secondary)] mb-1"
                        >
                          Claimed Level
                        </label>
                        <select
                          id="claim-level"
                          disabled={!step3Unlocked}
                          value={claimedLevel}
                          onChange={(e) => setClaimedLevel(Number(e.target.value) as EvidenceLevel)}
                          className="w-full px-2.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)] disabled:cursor-not-allowed"
                        >
                          {([1, 2, 3, 4, 5, 6] as EvidenceLevel[]).map((lvl) => (
                            <option key={lvl} value={lvl}>
                              L{lvl} · {LEVEL_LABELS[lvl]}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="claim-kind"
                          className="block font-mono-tabular text-[10px] uppercase text-[var(--ink-secondary)] mb-1"
                        >
                          Kind
                        </label>
                        <select
                          id="claim-kind"
                          disabled={!step3Unlocked}
                          value={kind}
                          onChange={(e) => setKind(e.target.value as Claim["kind"])}
                          className="w-full px-2.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)] disabled:cursor-not-allowed"
                        >
                          <option value="pain">Pain</option>
                          <option value="willingness_to_pay">Willingness to pay</option>
                          <option value="frequency">Frequency</option>
                          <option value="role_ownership">Role ownership</option>
                          <option value="displacement">Displacement</option>
                          <option value="retention">Retention</option>
                          <option value="comparative">Comparative</option>
                        </select>
                      </div>
                    </div>

                    {claimType === "prevalence" && (
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="number"
                          min={0}
                          disabled={!step3Unlocked}
                          value={observedK}
                          onChange={(e) => setObservedK(e.target.value)}
                          placeholder="Observed k (successes)"
                          className="px-3 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)]"
                        />
                        <input
                          type="number"
                          min={1}
                          disabled={!step3Unlocked}
                          value={observedN}
                          onChange={(e) => setObservedN(e.target.value)}
                          placeholder="Observed n (total)"
                          className="px-3 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)]"
                        />
                      </div>
                    )}

                    {claimErr && (
                      <div
                        role="alert"
                        className="px-3 py-2 bg-[var(--status-crimson-bg)] border border-[var(--status-crimson-border)] font-mono-tabular text-[11px] text-[var(--status-crimson)]"
                      >
                        {claimErr}
                      </div>
                    )}
                    {claimMsg && (
                      <p className="font-mono-tabular text-[11px] text-[var(--status-emerald)]">
                        {claimMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={!step3Unlocked || savingClaim}
                      className="w-full py-2 bg-[var(--bg-elevated)] border border-[var(--border-elevated)] text-[var(--ink-primary)] hover:border-[var(--accent-graphic)] text-[12px] font-medium rounded-[2px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingClaim ? "Saving…" : "Add Claim to Audit"}
                    </button>
                  </form>

                  {claims.length > 0 && (
                    <div className="border-t border-[var(--border-hair)] pt-4 space-y-2">
                      <p className="font-mono-tabular text-[10px] uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                        CLAIMS ({claims.length})
                      </p>
                      <div
                        onScroll={onClaimsScroll}
                        className="max-h-[200px] overflow-y-auto overflow-x-hidden no-scrollbar space-y-1"
                      >
                        {claims.map((cl) => (
                          <div
                            key={cl.id}
                            className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border-hair)] text-[12px]"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="inline-block font-mono-tabular text-[10px] text-[var(--accent-text)] mr-2">
                                {cl.claimType.toUpperCase()} · L{cl.claimedLevel}
                              </span>
                              <span className="text-[var(--ink-primary)] break-words">
                                {cl.rawText}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => void handleRemoveClaim(cl.id)}
                              aria-label="Remove claim"
                              className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--status-crimson)] hover:bg-[var(--status-crimson-bg)] rounded-[2px] cursor-pointer shrink-0 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Golden Scroll Progress Line */}
                      <div className="h-[2px] w-full bg-[var(--border-hair)] overflow-hidden">
                        <div
                          className="h-full bg-[var(--accent-graphic)] transition-all duration-150"
                          style={{ width: `${Math.round(claimsScroll * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {/* Evidence Ladder Summary */}
              {evidence.length > 0 && (
                <section className="bg-[var(--bg-surface)] border border-[var(--border-hair)] p-6">
                  <h2 className="font-mono-tabular text-[11px] uppercase tracking-[0.1em] text-[var(--ink-muted)] mb-4">
                    EVIDENCE LADDER DISTRIBUTION
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {LADDER_LEVELS.map(({ level, label }) => {
                      const count = ladderCounts[level] ?? 0;
                      const pct = Math.round((count / maxLadder) * 100);
                      return (
                        <div key={level} className="space-y-1.5">
                          <div className="flex items-center justify-between font-mono-tabular text-[11px]">
                            <span className="text-[var(--ink-secondary)]">{label}</span>
                            <span className="text-[var(--ink-primary)]">{count}</span>
                          </div>
                          <div className="h-1 bg-[var(--border-hair)]">
                            <div
                              className="h-full bg-[var(--accent-graphic)]"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Step 04: Deterministic Audit Results & Statement (Persisted) */}
              {auditResult && (
                <section id="runs" className="bg-[var(--bg-surface)] border border-[var(--border-hair)] p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-hair)] pb-5">
                    <div>
                      <p className="font-mono-tabular text-[11px] uppercase tracking-[0.12em] text-[var(--status-emerald)]">
                        04 · DETERMINISTIC EVIDENCE STATEMENT (SAVED)
                      </p>
                      <h2 className="font-display text-[28px] text-[var(--ink-primary)] mt-1">
                        Audit Verdicts &amp; Cryptographic Digest
                      </h2>
                      <p className="font-mono-tabular text-[11px] text-[var(--ink-muted)] mt-1">
                        ENGINE {auditResult.engineVersion} · SHA-256 {auditResult.findingHash}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-4 py-2 border border-[var(--border-elevated)] text-[12px] text-[var(--ink-primary)] hover:border-[var(--accent-graphic)] rounded-[2px] cursor-pointer"
                    >
                      <Printer size={14} />
                      Print / Export PDF
                    </button>
                  </div>

                  <div className="space-y-4">
                    {auditResult.findings.map((f) => {
                      const claim = claims.find((c) => c.id === f.claimId);
                      const isSupported = f.kind === "SUPPORTED";
                      const segments = Array.from(new Set(f.coverage.matrix.map((c) => c.segment)));
                      const cellMap = new Map(
                        f.coverage.matrix.map((c) => [`${c.segment}::${c.role}`, c.orgs]),
                      );
                      return (
                        <div key={f.claimId} className="bg-[var(--bg-canvas)] border border-[var(--border-hair)] p-6 space-y-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <span className="font-mono-tabular text-[11px] uppercase text-[var(--ink-muted)]">
                                {claim?.claimType.toUpperCase()} · L{claim?.claimedLevel}
                              </span>
                              <h3 className="text-[16px] font-medium text-[var(--ink-primary)] mt-1">
                                {claim?.rawText ?? f.claimId}
                              </h3>
                              <p className="text-[13px] text-[var(--ink-secondary)] mt-1">{f.explanation}</p>
                            </div>
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1 font-mono-tabular text-[11px] rounded-[2px] border"
                              style={
                                isSupported
                                  ? {
                                      backgroundColor: "var(--status-emerald-bg)",
                                      borderColor: "var(--status-emerald)",
                                      color: "var(--status-emerald)",
                                    }
                                  : {
                                      backgroundColor: "var(--status-crimson-bg)",
                                      borderColor: "var(--status-crimson-border)",
                                      color: "var(--status-crimson)",
                                    }
                              }
                            >
                              {isSupported ? <CheckCircle2 size={13} /> : <ShieldAlert size={13} />}
                              {f.kind}
                            </span>
                          </div>

                          {f.verdict.interval && (
                            <p className="font-mono-tabular text-[12px] text-[var(--accent-text)]">
                              Wilson 95% CI: [{f.verdict.interval[0].toFixed(2)},{" "}
                              {f.verdict.interval[1].toFixed(2)}] · Width{" "}
                              {f.verdict.interval[2].toFixed(2)}
                            </p>
                          )}

                          {segments.length > 0 && (
                            <div className="overflow-x-auto no-scrollbar">
                              <table className="w-full border-collapse font-mono-tabular text-[11px]">
                                <thead>
                                  <tr className="border-b border-[var(--border-hair)] text-[var(--ink-muted)]">
                                    <th className="py-2 pr-4 text-left font-normal">Segment</th>
                                    {ROLE_COLUMNS.map((r) => (
                                      <th key={r.key} className="py-2 px-2 text-center font-normal">
                                        {r.label}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {segments.map((seg) => (
                                    <tr key={seg} className="border-b border-[var(--border-hair)]">
                                      <td className="py-2 pr-4 text-[var(--ink-primary)]">{seg}</td>
                                      {ROLE_COLUMNS.map((r) => {
                                        const orgs = cellMap.get(`${seg}::${r.key}`) ?? 0;
                                        return (
                                          <td
                                            key={r.key}
                                            className={`py-2 px-2 text-center ${heatmapClass(orgs)}`}
                                          >
                                            {orgs > 0 ? `${orgs} orgs` : "—"}
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
                      );
                    })}
                  </div>

                  {/* Falsifier Validation */}
                  <form onSubmit={(e) => void handleCheckFalsifier(e)} className="pt-4 border-t border-[var(--border-hair)] space-y-3">
                    <div className="flex items-center gap-2 font-mono-tabular text-[11px] uppercase text-[var(--ink-muted)]">
                      <FileText size={13} />
                      <span>FALSIFIER RULE CHECK (REQUIRED FOR BLOCKED CLAIMS)</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={falsifierText}
                        onChange={(e) => setFalsifierText(e.target.value)}
                        placeholder="e.g. If fewer than 3 of 10 clinics prepay within 14 days, downgrade claim."
                        className="flex-1 px-3.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[12px] text-[var(--ink-primary)] focus:border-[var(--accent-graphic)] focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 border border-[var(--accent-graphic)] text-[var(--accent-text)] text-[12px] rounded-[2px] cursor-pointer shrink-0"
                      >
                        Validate Falsifier
                      </button>
                    </div>
                    {falsifierErr && (
                      <p className="font-mono-tabular text-[11px] text-[var(--status-crimson)]">
                        {falsifierErr}
                      </p>
                    )}
                    {falsifierResult && (
                      <p className="font-mono-tabular text-[11px] text-[var(--status-emerald)]">
                        {falsifierResult}
                      </p>
                    )}
                  </form>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Permanent Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-audit-title"
        >
          <div className="w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-elevated)] p-6 space-y-4">
            <p className="font-mono-tabular text-[11px] uppercase tracking-[0.1em] text-[var(--status-crimson)]">
              CONFIRM PERMANENT DELETION
            </p>
            <h2
              id="delete-audit-title"
              className="font-display text-[28px] leading-[1.1] text-[var(--ink-primary)]"
            >
              Delete &ldquo;{deleteTarget.name}&rdquo;?
            </h2>
            <p className="text-[13px] leading-[1.6] text-[var(--ink-secondary)]">
              This will permanently delete this audit workspace, along with all imported
              interviews, claims, and saved audit results. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-[var(--border-elevated)] text-[12px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] rounded-[2px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => void handleConfirmDeleteWorkspace()}
                className="px-4 py-2 bg-[var(--status-crimson)] text-white text-[12px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {deleteBusy ? "Deleting…" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
