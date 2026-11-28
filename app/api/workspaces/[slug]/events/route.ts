import { NextResponse } from "next/server";
import { checkRequest } from "../../../../../lib/http";
import { auditEvents } from "../../../../../server/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const refused = checkRequest(request);
  if (refused) return refused;

  const { slug } = await context.params;
  return NextResponse.json({ events: auditEvents(slug) });
}
