import { NextResponse } from "next/server";
import { formalise } from "../../../../../../agents";
import { getProvider } from "../../../../../../providers";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    rawText?: string;
    providerId?: string;
  };
  if (!body.rawText || body.rawText.trim().length < 3) {
    return NextResponse.json({ error: "RAW_TEXT_REQUIRED" }, { status: 400 });
  }

  // The provider is chosen from an allowlist; a caller cannot inject a key.
  const requested = body.providerId === "mock" ? "mock" : undefined;
  const provider = requested ? getProvider(requested) : getProvider();
  const result = await formalise(body.rawText, provider);

  return NextResponse.json({
    ...result.proposal,
    flags: result.flags,
    injection: result.injection,
    promptVersion: "claim-formaliser.v1",
    providerId: provider.id,
  });
}
