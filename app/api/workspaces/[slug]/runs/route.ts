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
import { parseProviderSelection } from "../../../../../lib/provider-options";
import { createRun, listRuns } from "../../../../../server/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const refused = checkRequest(request);
  if (refused) return refused;

  const { slug } = await context.params;
  return NextResponse.json({ runs: listRuns(slug) });
}

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
  if (isMetered(selection.providerId) && isRateLimited("analysis", 10)) {
    return tooManyRequests();
  }
  try {
    const run = createRun(slug, selection.providerId, selection.modelId);
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: publicError(error, "RUN_FAILED") },
      { status: 400 },
    );
  }
}
