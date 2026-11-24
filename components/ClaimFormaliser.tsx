"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  "pain",
  "frequency",
  "willingness_to_pay",
  "role_ownership",
  "displacement",
  "retention",
  "comparative",
];

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
        setError(body.error ?? "FORMALISATION_FAILED");
      } else {
        setProposal(body);
        setLevel("");
      }
    } catch {
      setError("NETWORK_ERROR");
    } finally {
      setBusy(false);
    }
  }

  function set<K extends keyof Proposal>(key: K, value: Proposal[K]) {
    setProposal((current) => (current ? { ...current, [key]: value } : current));
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
        setError(body.error ?? "CONFIRM_FAILED");
      } else {
        setProposal(null);
        setSentence("");
        router.refresh();
      }
    } catch {
      setError("NETWORK_ERROR");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5" aria-labelledby="formaliser-heading">
      <h2 id="formaliser-heading" className="text-[20px] font-semibold">
        Add a claim
      </h2>
      <p className="mt-1 text-[13px] text-[var(--ink-muted)]">
        The model proposes meaning only. Every field is editable, and the strength is yours to assert.
      </p>

      <div className="mt-4 flex gap-2">
        <input
          className="field"
          aria-label="Belief in one sentence"
          placeholder="Dental practice managers will pay €200/month"
          value={sentence}
          onChange={(event) => setSentence(event.target.value)}
        />
        <button type="button" className="btn" onClick={formalise} disabled={busy || sentence.length < 3}>
          Formalise
        </button>
      </div>

      {proposal ? (
        <div className="mt-5 space-y-4 border-t border-[var(--border)] pt-4">
          {proposal.injection || proposal.flags.length > 0 ? (
            <p className="mono text-[12px] text-[var(--signal)]" role="status">
              Input guard: {[...proposal.flags, ...(proposal.injection ? ["INJECTION_FLAGGED"] : [])].join(", ")}
            </p>
          ) : null}

          <Field label="Population" value={proposal.population} onChange={(v) => set("population", v)} />
          <Field label="Predicate" value={proposal.predicate} onChange={(v) => set("predicate", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label mb-1 block">Kind</span>
              <select
                className="field"
                value={proposal.kind}
                onChange={(event) => set("kind", event.target.value)}
              >
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label mb-1 block">Claim type</span>
              <select
                className="field"
                value={proposal.claimType}
                onChange={(event) => set("claimType", event.target.value as "theme" | "prevalence")}
              >
                <option value="theme">theme</option>
                <option value="prevalence">prevalence</option>
              </select>
            </label>
          </div>

          {proposal.ambiguityFlags.length > 0 ? (
            <p className="mono text-[12px] text-[var(--signal)]">
              Ambiguity: {proposal.ambiguityFlags.join(", ")}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="label mb-1 block">Claimed level</span>
              <select
                className="field"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                aria-required="true"
              >
                <option value="">Choose L1–L6</option>
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>
                    L{value}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label mb-1 block">Observed k</span>
              <input className="field mono" inputMode="numeric" value={observedK} onChange={(e) => setObservedK(e.target.value)} />
            </label>
            <label className="block">
              <span className="label mb-1 block">Approached n</span>
              <input className="field mono" inputMode="numeric" value={observedN} onChange={(e) => setObservedN(e.target.value)} />
            </label>
          </div>

          <label className="block">
            <span className="label mb-1 block">Precision tolerance (± share, optional)</span>
            <input className="field mono" inputMode="decimal" value={tolerance} onChange={(e) => setTolerance(e.target.value)} />
          </label>

          {error ? (
            <p className="mono text-[13px] text-[var(--signal)]" role="alert">{error}</p>
          ) : null}

          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || proposal.population.trim().length === 0 || level === ""}
            onClick={confirm}
          >
            Confirm claim
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Field({
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
      <span className="label mb-1 block">{label}</span>
      <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
