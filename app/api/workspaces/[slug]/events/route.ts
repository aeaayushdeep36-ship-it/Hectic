import { NextResponse } from "next/server";
import { auditEvents } from "../../../../../server/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  return NextResponse.json({ events: auditEvents(slug) });
}
