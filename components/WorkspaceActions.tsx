"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkspaceActions({ slug }: { slug: string }) {
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
        setError(body.error ?? "RUN_FAILED");
        setBusy(false);
        return;
      }
      router.push(`/runs/${body.run.id}`);
    } catch {
      setError("NETWORK_ERROR");
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-primary" onClick={analyse} disabled={busy}>
        {busy ? "Analysing…" : "Analyse now"}
      </button>
      {error ? (
        <p className="mono mt-2 text-[13px] text-[var(--signal)]" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
