"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEVEL_LABELS } from "@/lib/levels";
import { cn } from "@/lib/utils";

interface Proposal {
  rawText: string;
  population: string;
  predicate: string;
  kind: string;
  claimType: "theme" | "prevalence";
  rationale: string;
  ambiguityFlags: string[];
  injection: boolean;
  flags: string[];
}

const KINDS = [
  { value: "pain", label: "Pain" },
  { value: "frequency", label: "Frequency" },
  { value: "willingness_to_pay", label: "Willingness to pay" },
  { value: "role_ownership", label: "Role ownership" },
  { value: "displacement", label: "Displacement" },
  { value: "retention", label: "Retention" },
  { value: "comparative", label: "Comparative" },
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]";

export function ClaimFormaliser({ slug }: { slug: string }) {
  const router = useRouter();
  const [sentence, setSentence] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [level, setLevel] = useState<string>("");
  const [observedK, setObservedK] = useState("");
  const [observedN, setObservedN] = useState("");
  const [tolerance, setTolerance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function formalise() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${slug}/claims/formalise`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawText: sentence }),
      });
      const body = (await response.json()) as Proposal & { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not formalise this claim. Please try again.");
      } else {
        setProposal(body);
        setLevel("");
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  function setProp<K extends keyof Proposal>(key: K, value: Proposal[K]) {
    setProposal((cur) => (cur ? { ...cur, [key]: value } : cur));
  }

  async function confirm() {
    if (!proposal) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${slug}/claims`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawText: proposal.rawText,
          population: proposal.population,
          predicate: proposal.predicate,
          kind: proposal.kind,
          claimType: proposal.claimType,
          claimedLevel: Number(level),
          observed:
            observedK && observedN
              ? { k: Number(observedK), n: Number(observedN) }
              : null,
          precisionTolerance: tolerance ? Number(tolerance) : null,
          ambiguityFlags: proposal.ambiguityFlags,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "Could not save this claim.");
      } else {
        setProposal(null);
        setSentence("");
        setObservedK("");
        setObservedN("");
        setTolerance("");
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
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
      aria-labelledby="formaliser-heading"
    >
      {/* Header */}
      <div
        className="px-6 py-5"
        style={{ background: "var(--cream-dark)", borderBottom: "1px solid var(--border)" }}
      >
        <h2
          id="formaliser-heading"
          className="serif text-[var(--ink)]"
          style={{ fontSize: "1.3rem" }}
        >
          Add a claim
        </h2>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          Write a founder belief in plain language. The model proposes structure — every field is
          editable, and the evidence level is yours to assert.
        </p>
      </div>

      <div className="px-6 py-6 space-y-5">
        {/* Input + formalise */}
        <div>
          <label htmlFor="claim-sentence" className="label mb-2 block">
            Belief in one sentence
          </label>
          <div className="flex gap-2">
            <input
              id="claim-sentence"
              className={cn("field flex-1", focusRing)}
              placeholder="e.g. Dental practice managers will pay €200/month for automated scheduling"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sentence.length >= 3 && !busy) void formalise();
              }}
            />
            <button
              type="button"
              className={cn("btn btn-primary text-sm shrink-0", focusRing)}
              onClick={formalise}
              disabled={busy || sentence.length < 3}
            >
              {busy && !proposal ? (
                <span className="flex items-center gap-2">
                  <span className="spinner" aria-hidden="true" />
                  Analysing…
                </span>
              ) : (
                "Formalise →"
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="px-4 py-3 text-sm"
            style={{
              background: "var(--signal-bg)",
              border: "1px solid var(--signal-border)",
              borderRadius: "2px",
              color: "var(--signal)",
            }}
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Proposal review */}
        {proposal && (
          <div
            className="space-y-5 pt-5"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 text-sm"
              style={{
                background: "var(--gold-light)",
                border: "1px solid rgba(184,149,90,0.3)",
                borderRadius: "2px",
              }}
            >
              <span style={{ color: "var(--gold)" }}>✓</span>
              <span className="text-[var(--ink-muted)]">
                Review and edit the formalised claim below, then confirm.
              </span>
            </div>

            {/* Injection warning */}
            {(proposal.injection || proposal.flags.length > 0) && (
              <div
                className="px-4 py-3 text-sm mono"
                style={{
                  background: "var(--signal-bg)",
                  border: "1px solid var(--signal-border)",
                  borderRadius: "2px",
                  color: "var(--signal)",
                  fontSize: "12px",
                }}
                role="status"
              >
                Input guard: {[...proposal.flags, ...(proposal.injection ? ["INJECTION_FLAGGED"] : [])].join(", ")}
              </div>
            )}

            {/* Ambiguity warning */}
            {proposal.ambiguityFlags.length > 0 && (
              <div
                className="px-4 py-3 text-sm"
                style={{
                  background: "var(--gold-light)",
                  border: "1px solid rgba(184,149,90,0.3)",
                  borderRadius: "2px",
                  color: "var(--ink-muted)",
                  fontSize: "13px",
                }}
              >
                <span className="label mr-2">Ambiguity flags:</span>
                {proposal.ambiguityFlags.join(", ")}
              </div>
            )}

            {/* Editable fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Population" value={proposal.population} onChange={(v) => setProp("population", v)} />
              <FormField label="Predicate" value={proposal.predicate} onChange={(v) => setProp("predicate", v)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label mb-2 block">Kind</span>
                <select
                  className={cn("field", focusRing)}
                  value={proposal.kind}
                  onChange={(e) => setProp("kind", e.target.value)}
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label mb-2 block">Claim type</span>
                <select
                  className={cn("field", focusRing)}
                  value={proposal.claimType}
                  onChange={(e) => setProp("claimType", e.target.value as "theme" | "prevalence")}
                >
                  <option value="theme">Theme</option>
                  <option value="prevalence">Prevalence</option>
                </select>
              </label>
            </div>

            {/* Evidence level */}
            <div
              className="p-4 space-y-4"
              style={{
                background: "var(--cream-dark)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
              }}
            >
              <p className="label">Evidence level assertion</p>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="label mb-2 block">Claimed level *</span>
                  <select
                    className={cn("field", focusRing)}
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    aria-required="true"
                  >
                    <option value="">Choose L1–L6</option>
                    {([1, 2, 3, 4, 5, 6] as const).map((v) => (
                      <option key={v} value={v}>
                        L{v} — {LEVEL_LABELS[v]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label mb-2 block">Observed k</span>
                  <input
                    className={cn("field mono", focusRing)}
                    inputMode="numeric"
                    placeholder="0"
                    value={observedK}
                    onChange={(e) => setObservedK(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="label mb-2 block">Approached n</span>
                  <input
                    className={cn("field mono", focusRing)}
                    inputMode="numeric"
                    placeholder="0"
                    value={observedN}
                    onChange={(e) => setObservedN(e.target.value)}
                  />
                </label>
              </div>

              <label className="block">
                <span className="label mb-2 block">
                  Precision tolerance{" "}
                  <span className="normal-case font-normal" style={{ letterSpacing: 0, color: "var(--ink-faint)" }}>
                    (± share, optional)
                  </span>
                </span>
                <input
                  className={cn("field mono", focusRing)}
                  style={{ maxWidth: "180px" }}
                  inputMode="decimal"
                  placeholder="0.05"
                  value={tolerance}
                  onChange={(e) => setTolerance(e.target.value)}
                />
              </label>
            </div>

            {/* Confirm */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={cn("btn btn-primary text-sm", focusRing)}
                  disabled={busy || proposal.population.trim().length === 0 || level === ""}
                  onClick={confirm}
                >
                  {busy ? (
                    <span className="flex items-center gap-2">
                      <span className="spinner" aria-hidden="true" />
                      Saving…
                    </span>
                  ) : (
                    "Confirm claim →"
                  )}
                </button>
                <button
                  type="button"
                  className={cn("btn text-sm", focusRing)}
                  onClick={() => { setProposal(null); setSentence(""); }}
                  disabled={busy}
                >
                  Start over
                </button>
              </div>
              {(proposal.population.trim().length === 0 || level === "") && (
                <p className="text-xs text-[var(--ink-muted)]">
                  {proposal.population.trim().length === 0
                    ? "Enter a target population above to confirm."
                    : "Select a claimed evidence level (L1–L6) above to enable Confirm claim."}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FormField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      <input
        className="field focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
