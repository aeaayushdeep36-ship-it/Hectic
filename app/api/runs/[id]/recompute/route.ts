import { NextResponse } from "next/server";
import {
  DEFAULT_RECOMPUTE_PROVIDER,
  parseProviderSelection,
} from "../../../../../lib/provider-options";
import { recompute } from "../../../../../server/store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const selection = parseProviderSelection(body, DEFAULT_RECOMPUTE_PROVIDER);
  if (!selection) {
    return NextResponse.json({ error: "INVALID_PROVIDER_SELECTION" }, { status: 400 });
  }
  try {
    const result = recompute(id, selection.providerId, selection.modelId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RECOMPUTE_FAILED" },
      { status: 400 },
    );
  }
}
