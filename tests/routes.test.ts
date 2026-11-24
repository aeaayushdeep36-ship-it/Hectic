/** Route-boundary regression: untrusted provider/model input never reaches the store. */
import { describe, expect, it } from "vitest";
import { POST as recompute } from "../app/api/runs/[id]/recompute/route";
import { POST as createRun } from "../app/api/workspaces/[slug]/runs/route";
import { POST as streamRun } from "../app/api/workspaces/[slug]/runs/stream/route";

const request = (body: string) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });

const runContext = { params: Promise.resolve({ slug: "missing-workspace" }) };
const recomputeContext = { params: Promise.resolve({ id: "missing-run" }) };

describe("provider selection route validation", () => {
  it("rejects an unknown provider before creating a run", async () => {
    const response = await createRun(request('{"providerId":"made-up"}'), runContext);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_PROVIDER_SELECTION" });
  });

  it("rejects an injected model id before streaming", async () => {
    const response = await streamRun(request('{"providerId":"openrouter","modelId":"bad\\nmodel"}'), runContext);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_PROVIDER_SELECTION" });
  });

  it("rejects an unknown provider before recomputing", async () => {
    const response = await recompute(request('{"providerId":"made-up"}'), recomputeContext);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "INVALID_PROVIDER_SELECTION" });
  });
});
