import { NextResponse } from "next/server";
import { checkRequest, payloadTooLarge, publicError, readJsonObject } from "../../../../../../lib/http";
import { importEvidence } from "../../../../../../server/store";

export const dynamic = "force-dynamic";

// 2 MB of CSV (enforced again in the store) plus JSON envelope overhead.
const MAX_BODY_BYTES = 2_500_000;

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const refused = checkRequest(request, { json: true });
  if (refused) return refused;

  const { slug } = await context.params;
  const body = await readJsonObject(request, MAX_BODY_BYTES);
  if (body === null) return payloadTooLarge();

  if (typeof body.csv !== "string" || body.csv.trim().length === 0) {
    return NextResponse.json({ error: "CSV_REQUIRED" }, { status: 400 });
  }
  try {
    const result = importEvidence(slug, body.csv);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IMPORT_FAILED";
    const status = message.startsWith("CSV_") ? 413 : 400;
    return NextResponse.json({ error: publicError(error, "IMPORT_FAILED") }, { status });
  }
}
