import { NextResponse } from "next/server";
import { formalise } from "../../../../../../agents";
import {
  checkRequest,
  isMetered,
  isRateLimited,
  payloadTooLarge,
  readJsonObject,
  tooManyRequests,
} from "../../../../../../lib/http";
import { getProvider } from "../../../../../../providers";

export const dynamic = "force-dynamic";

const MAX_RAW_TEXT = 2000;

export async function POST(request: Request) {
  const refused = checkRequest(request, { json: true });
  if (refused) return refused;

  const body = await readJsonObject(request);
  if (body === null) return payloadTooLarge();

  const rawText = typeof body.rawText === "string" ? body.rawText : "";
  if (rawText.trim().length < 3) {
    return NextResponse.json({ error: "RAW_TEXT_REQUIRED" }, { status: 400 });
  }
  if (rawText.length > MAX_RAW_TEXT) {
    return NextResponse.json({ error: "RAW_TEXT_TOO_LONG" }, { status: 413 });
  }

  // The provider is chosen from an allowlist; a caller cannot inject a key.
  const requested = body.providerId === "mock" ? "mock" : undefined;
  const provider = requested ? getProvider(requested) : getProvider();

  // A real provider spends the user's free-tier quota: cap calls per minute.
  if (isMetered(provider.id) && isRateLimited("formalise", 30)) {
    return tooManyRequests();
  }

  const result = await formalise(rawText, provider);

  return NextResponse.json({
    ...result.proposal,
    flags: result.flags,
    injection: result.injection,
    promptVersion: "claim-formaliser.v1",
    providerId: provider.id,
  });
}
