import { NextResponse } from "next/server";
import { getRun } from "../../../../server/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const run = getRun(id);
  if (!run) return NextResponse.json({ error: "UNKNOWN_RUN" }, { status: 404 });
  return NextResponse.json({ run });
}
