"use client";

import { useState } from "react";
import type { FindingView } from "../lib/dto";

const ACTIONS = [
  { value: "downgrade", consequence: "Restate the claim at the level the evidence supports." },
  { value: "fund_gap", consequence: "Commit to interviews in a named cell before using the claim." },
  { value: "accept_limitation", consequence: "Use the claim with a written limitation wherever it appears." },
] as const;

export function CheckpointDrawer({
  runId,
  finding,
  onResolved,
  onClose,
}: {
  runId: string;
  finding: FindingView;
  onResolved: () => void;
  onClose: () => void;
}) {
  const [action, setAction] = useState<string>("downgrade");
  const [falsifier, setFalsifier] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = falsifier.trim().length < 40;
  const noCondition = !/\b(if|when|unless|should)\b/i.test(falsifier);
  const valid = !tooShort && !noCondition && !busy;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/runs/${runId}/resolutions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          claimId: finding.claimId,
          action,
          targetLevel: action === "downgrade" ? finding.level : null,
          falsifier,
          note: note || null,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "RESOLUTION_REJECTED");
        setBusy(false);
        return;
      }
      onResolved();
    } catch {
      setError("NETWORK_ERROR");
      setBusy(false);
    }
  }

  return (
    <div
      className="drawer card mt-4 border-[var(--signal-border)] p-5"
      role="dialog"
      aria-label={`Resolve ${finding.claimId}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="label">Checkpoint</p>
          <h3 className="mt-1 text-[18px] font-semibold">Resolve this claim</h3>
        </div>
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      </div>

      <fieldset className="mt-4">
        <legend className="label mb-2">Action</legend>
        {ACTIONS.map((option) => (
          <label key={option.value} className="mb-2 flex gap-3 text-[14px]">
            <input
              type="radio"
              name="action"
              value={option.value}
              checked={action === option.value}
              onChange={() => setAction(option.value)}
              className="mt-1"
            />
            <span>
              <span className="mono">{option.value}</span> — {option.consequence}
            </span>
          </label>
        ))}
      </fieldset>

      <div className="mt-4">
        <label htmlFor="falsifier" className="label mb-2 block">
          This claim dies if…
        </label>
        <textarea
          id="falsifier"
          className="field"
          rows={3}
          value={falsifier}
          onChange={(event) => setFalsifier(event.target.value)}
          aria-describedby="falsifier-help"
          aria-invalid={tooShort || noCondition}
        />
        <p id="falsifier-help" className="mt-1 text-[12px] text-[var(--ink-muted)]">
          Name the observation that would make you abandon this. At least 40 characters;
          include if, when, unless or should. {falsifier.trim().length}/40.
        </p>
      </div>

      <div className="mt-4">
        <label htmlFor="note" className="label mb-2 block">
          Note (optional)
        </label>
        <input
          id="note"
          className="field"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      {error ? (
        <p className="mono mt-3 text-[13px] text-[var(--signal)]" role="alert">
          {error}
        </p>
      ) : null}

      <button type="button" className="btn btn-primary mt-4" disabled={!valid} onClick={submit}>
        {busy ? "Recording…" : "Confirm resolution"}
      </button>
    </div>
  );
}
