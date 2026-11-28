import { NextResponse } from "next/server";
import {
  checkRequest,
  isMetered,
  isRateLimited,
  payloadTooLarge,
  publicError,
  readJsonObject,
  tooManyRequests,
} from "../../../../../lib/http";
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
  const refused = checkRequest(request, { json: true });
  if (refused) return refused;

  const { id } = await context.params;
  const body = await readJsonObject(request);
  if (body === null) return payloadTooLarge();

  const selection = parseProviderSelection(body, DEFAULT_RECOMPUTE_PROVIDER);
  if (!selection) {
    return NextResponse.json({ error: "INVALID_PROVIDER_SELECTION" }, { status: 400 });
  }
  if (isMetered(selection.providerId) && isRateLimited("analysis", 10)) {
    return tooManyRequests();
  }
  try {
    const result = recompute(id, selection.providerId, selection.modelId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: publicError(error, "RECOMPUTE_FAILED") },
      { status: 400 },
    );
  }
}
