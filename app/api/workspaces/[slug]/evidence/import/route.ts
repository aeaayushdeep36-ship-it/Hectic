import { NextResponse } from "next/server";
import { importEvidence } from "../../../../../../server/store";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { csv?: string };
  if (typeof body.csv !== "string" || body.csv.trim().length === 0) {
    return NextResponse.json({ error: "CSV_REQUIRED" }, { status: 400 });
  }
  try {
    const result = importEvidence(slug, body.csv);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IMPORT_FAILED";
    const status = message.startsWith("CSV_") ? 413 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
