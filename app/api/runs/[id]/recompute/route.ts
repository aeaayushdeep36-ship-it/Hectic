import { NextResponse } from "next/server";
import { recompute } from "../../../../../server/store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    providerId?: string;
    modelId?: string;
  };
  const providerId = body.providerId ?? "ollama";
  const modelId = body.modelId ?? "qwen2.5:7b";
  try {
    const result = recompute(id, providerId, modelId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RECOMPUTE_FAILED" },
      { status: 400 },
    );
  }
}
