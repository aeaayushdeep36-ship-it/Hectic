import { NextResponse } from "next/server";
import { parseProviderSelection } from "../../../../../lib/provider-options";
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
  const body = await request.json().catch(() => ({}));
  const selection = parseProviderSelection(body);
  if (!selection) {
    return NextResponse.json({ error: "INVALID_PROVIDER_SELECTION" }, { status: 400 });
  }
  try {
    const run = createRun(slug, selection.providerId, selection.modelId);
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RUN_FAILED" },
      { status: 400 },
    );
  }
}
