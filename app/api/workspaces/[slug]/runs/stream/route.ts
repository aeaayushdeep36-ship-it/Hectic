/**
 * U1 — live agent progress over a streaming HTTP response.
 *
 * One NDJSON event per line. The engine has already computed the verdict
 * before the first event is emitted; these events describe only language work.
 * See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md
 * for the supported ReadableStream response pattern.
 */
import { runAgentPipeline, type AgentPipelineEvent } from "../../../../../../server/agent-pipeline";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { providerId?: string };
  const providerId = body.providerId ?? "mock";
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentPipelineEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const result = await runAgentPipeline(slug, providerId, { onProgress: send });
        send(result);
      } catch (error) {
        const event: AgentPipelineEvent = {
          type: "error",
          message: error instanceof Error ? error.message : "PIPELINE_FAILED",
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
