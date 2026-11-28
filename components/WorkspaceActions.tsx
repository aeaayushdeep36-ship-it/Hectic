"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]";

export function WorkspaceActions({
  slug,
  variant = "primary",
  label = "Run Audit ↗",
}: {
  slug: string;
  variant?: "primary" | "on-dark";
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyse() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${slug}/runs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId: "mock", modelId: "mock-v1" }),
      });
      const body = (await response.json()) as { run?: { id: string }; error?: string };
      if (!response.ok || !body.run) {
        setError(body.error ?? "Could not start the audit run. Please try again.");
        setBusy(false);
        return;
      }
      router.push(`/runs/${body.run.id}`);
    } catch {
      setError("Network error — please check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className={cn(
          "btn text-sm",
          variant === "on-dark" ? "btn-on-dark" : "btn-primary",
          focusRing,
        )}
        onClick={analyse}
        disabled={busy}
        style={{
          padding: "10px 24px",
          ...(variant === "on-dark" ? { borderColor: "rgba(194,157,89,0.65)" } : {}),
        }}
      >
        {busy ? (
          <span className="flex items-center gap-2">
            <span
              className="spinner"
              aria-hidden="true"
              style={variant === "on-dark" ? { borderTopColor: "var(--gold)" } : undefined}
            />
            Starting audit…
          </span>
        ) : (
          label
        )}
      </button>
      {error && (
        <p
          className="mt-2 text-sm"
          style={{ color: variant === "on-dark" ? "#FCA5A5" : "var(--signal)" }}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
