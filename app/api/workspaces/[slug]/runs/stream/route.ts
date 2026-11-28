/**
 * U1 — live agent progress over a streaming HTTP response.
 *
 * One NDJSON event per line. The engine has already computed the verdict
 * before the first event is emitted; these events describe only language work.
 * See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md
 * for the supported ReadableStream response pattern.
 */
import {
  checkRequest,
  isMetered,
  isRateLimited,
  payloadTooLarge,
  publicError,
  readJsonObject,
  tooManyRequests,
} from "../../../../../../lib/http";
import { parseProviderSelection } from "../../../../../../lib/provider-options";
import { runAgentPipeline, type AgentPipelineEvent } from "../../../../../../server/agent-pipeline";
import { getWorkspace } from "../../../../../../server/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const refused = checkRequest(request, { json: true });
  if (refused) return refused;

  const { slug } = await context.params;
  const body = await readJsonObject(request);
  if (body === null) return payloadTooLarge();

  const selection = parseProviderSelection(body);
  if (!selection) {
    return NextResponse.json({ error: "INVALID_PROVIDER_SELECTION" }, { status: 400 });
  }
  // The pipeline makes many provider calls per run: cap real-provider runs.
  if (isMetered(selection.providerId) && isRateLimited("analysis", 10)) {
    return tooManyRequests();
  }
  if (!getWorkspace(slug)) {
    return NextResponse.json({ error: "UNKNOWN_WORKSPACE" }, { status: 404 });
  }
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentPipelineEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const result = await runAgentPipeline(slug, selection.providerId, { onProgress: send });
        send(result);
      } catch (error) {
        const event: AgentPipelineEvent = {
          type: "error",
          message: publicError(error, "PIPELINE_FAILED"),
        };
        send(event);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
