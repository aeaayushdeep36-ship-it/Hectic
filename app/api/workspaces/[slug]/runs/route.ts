import { NextResponse } from "next/server";
import { createRun, listRuns } from "../../../../../server/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  return NextResponse.json({ runs: listRuns(slug) });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    providerId?: string;
    modelId?: string;
  };
  try {
    const run = createRun(slug, body.providerId ?? "mock", body.modelId ?? "mock-v1");
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RUN_FAILED" },
      { status: 400 },
    );
  }
}
