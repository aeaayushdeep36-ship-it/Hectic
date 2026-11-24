/** U1 — the streaming pipeline emits ordered progress and a locked ledger. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { seedDatabase } from "../db/seed-data";
import { sqlite } from "../db/client";
import { runAgentPipeline } from "../server/agent-pipeline";
import { workspaceInputs } from "../server/store";
import { verdictHash } from "../lib/hash";
import { audit } from "../engine/index";

function expectedHash(slug: string): string {
  const { rows, claims } = workspaceInputs(slug);
  return verdictHash(audit(rows, claims));
}

beforeAll(() => {
  seedDatabase();
});

afterAll(() => {
  sqlite.close();
});

describe("the agent pipeline behind the live stream", () => {
  it("reports each step and finishes with an unchanged finding hash", async () => {
    const steps: string[] = [];
    const details: string[] = [];
    const result = await runAgentPipeline("clean", "mock", {
      onProgress: (event) => {
        steps.push(event.step);
        details.push(event.detail);
      },
    });

    expect(result.type).toBe("done");
    expect(steps).toContain("engine");
    expect(steps).toContain("formalise");
    expect(steps).toContain("tag");
    expect(steps).toContain("explain");
    expect(steps).toContain("compose");
    expect(details.some((line) => line.includes("in one batch"))).toBe(true);
    expect(result.findingHash).toBe(expectedHash("clean"));
    expect(result.callCount).toBeGreaterThan(0);
    expect(result.fallbackReasons).toEqual([]);
  });

  it("logs a fallback reason instead of changing the verdict on total provider failure", async () => {
    const result = await runAgentPipeline("underpowered", "mock", {
      provider: {
        id: "mock",
        modelId: "always-429",
        complete: async () => ({
          text: "{}",
          promptTokens: null,
          outputTokens: null,
          latencyMs: 0,
          ok: false,
          errorCode: "HTTP_429",
        }),
      },
      retry: { maxRetries: 1, sleep: async () => {} },
    });

    expect(result.type).toBe("done");
    expect(result.findingHash).toBe(expectedHash("underpowered"));
    expect(result.fallbackReasons.length).toBeGreaterThan(0);
    expect(result.fallbackReasons.every((reason) => reason.includes("HTTP_429"))).toBe(true);
  });
});
