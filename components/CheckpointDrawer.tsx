"use client";

import { useEffect, useRef, useState } from "react";
import type { FindingView } from "../lib/dto";
import { checkFalsifier } from "../lib/falsifier";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    value: "downgrade",
    label: "Downgrade the claim",
    consequence: "Restate the claim at the level the evidence supports.",
    icon: "↓",
  },
  {
    value: "fund_gap",
    label: "Fund the gap",
    consequence: "Commit to interviews in a named cell before using the claim.",
    icon: "○",
  },
  {
    value: "accept_limitation",
    label: "Accept with limitation",
    consequence: "Use the claim with a written limitation wherever it appears.",
    icon: "✓",
  },
] as const;

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]";

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
  const [action, setAction] = useState<string>("");
  const [falsifier, setFalsifier] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    drawerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  const trimmedLength = falsifier.trim().length;
  const validation = checkFalsifier(falsifier);
  const lengthOk = trimmedLength >= 40;
  const valid = action !== "" && lengthOk && validation.ok && !busy;

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
        setError(body.error ?? "Resolution rejected — please check your entries.");
        setBusy(false);
        return;
      }
      onResolved();
    } catch {
      setError("Network error — please try again.");
      setBusy(false);
    }
  }

  return (
    <div
      ref={drawerRef}
      className="drawer mt-3"
      role="dialog"
      aria-modal="true"
      aria-label={`Resolve claim: ${finding.claimText}`}
      style={{
        border: "1px solid var(--border-strong)",
        borderRadius: "2px",
        background: "var(--cream)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        className="flex items-start justify-between gap-4 px-6 py-5"
        style={{
          background: "var(--forest-rich)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <p className="label mb-1" style={{ color: "rgba(184,149,90,0.8)" }}>
            Checkpoint — Resolution Required
          </p>
          <h3
            className="serif text-[var(--cream)]"
            style={{ fontSize: "1.3rem", lineHeight: 1.3 }}
          >
            {finding.claimText}
          </h3>
          <p className="mono mt-1 text-xs" style={{ color: "rgba(245,240,232,0.4)" }}>
            {finding.claimId}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={cn("btn-on-dark shrink-0 mt-1", focusRing)}
          style={{
            background: "none",
            border: "1px solid rgba(245,240,232,0.2)",
            color: "rgba(245,240,232,0.7)",
            padding: "6px 14px",
            borderRadius: "2px",
            cursor: "pointer",
            fontSize: "13px",
          }}
          aria-label="Close resolution panel"
        >
          ✕
        </button>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Step 1: Choose action */}
        <fieldset>
          <legend className="label mb-3">Step 1 — Choose an action</legend>
          <div className="space-y-2">
            {ACTIONS.map((option) => {
              const selected = action === option.value;
              return (
                <label
                  key={option.value}
                  className="flex gap-4 cursor-pointer p-4 transition-colors"
                  style={{
                    border: `1px solid ${selected ? "var(--forest)" : "var(--border)"}`,
                    background: selected ? "var(--cream-dark)" : "var(--surface)",
                    borderRadius: "2px",
                  }}
                >
                  <input
                    type="radio"
                    name="action"
                    value={option.value}
                    checked={selected}
                    onChange={() => setAction(option.value)}
                    className="mt-1 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontSize: "16px",
                          color: selected ? "var(--forest)" : "var(--ink-faint)",
                        }}
                        aria-hidden="true"
                      >
                        {option.icon}
                      </span>
                      <span
                        className="font-medium text-sm text-[var(--ink)]"
                      >
                        {option.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
                      {option.consequence}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Step 2: Falsifier */}
        <div>
          <label htmlFor="falsifier" className="label mb-2 block">
            Step 2 — This claim dies if…
          </label>
          <textarea
            id="falsifier"
            className={cn("field", focusRing)}
            rows={3}
            value={falsifier}
            onChange={(e) => setFalsifier(e.target.value)}
            placeholder="e.g. If fewer than 3 of 10 approached prospects sign an NDA after the demo, we will abandon this claim."
            aria-describedby="falsifier-help"
            aria-invalid={trimmedLength > 0 && (!lengthOk || !validation.ok)}
          />
          <p id="falsifier-help" className="mt-2 text-xs text-[var(--ink-muted)]">
            Name the observation that would make you abandon this claim. Include if/when/unless, a
            measurable number, and at least 40 characters.{" "}
            <span
              style={{
                color:
                  lengthOk && validation.ok
                    ? "var(--confirm)"
                    : trimmedLength > 0
                      ? "var(--gold)"
                      : "var(--ink-faint)",
              }}
            >
              {trimmedLength}/40 characters
            </span>
          </p>
          {trimmedLength > 0 && (!lengthOk || !validation.ok) && (
            <p className="mono mt-1 text-xs text-[var(--signal)]" role="status">
              {!lengthOk ? "A falsifier must be at least 40 characters." : validation.reason}
            </p>
          )}
        </div>

        {/* Step 3: Optional note */}
        <div>
          <label htmlFor="res-note" className="label mb-2 block">
            Step 3 — Note{" "}
            <span className="font-normal normal-case" style={{ letterSpacing: "0", color: "var(--ink-faint)" }}>
              (optional)
            </span>
          </label>
          <input
            id="res-note"
            className={cn("field", focusRing)}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Context for this decision…"
          />
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

        {/* Submit */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={cn("btn btn-primary", focusRing)}
            disabled={!valid}
            onClick={submit}
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <span className="spinner" aria-hidden="true" />
                Recording…
              </span>
            ) : (
              "Confirm Resolution →"
            )}
          </button>
          <button
            type="button"
            className={cn("btn", focusRing)}
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
