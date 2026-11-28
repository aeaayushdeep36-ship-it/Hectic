import { NextResponse } from "next/server";
import { checkRequest } from "../../../../lib/http";
import { getRun } from "../../../../server/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const refused = checkRequest(request);
  if (refused) return refused;

  const { id } = await context.params;
  const run = getRun(id);
  if (!run) return NextResponse.json({ error: "UNKNOWN_RUN" }, { status: 404 });
  return NextResponse.json({ run });
}
