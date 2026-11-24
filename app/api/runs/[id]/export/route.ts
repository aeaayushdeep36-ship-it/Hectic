import { NextResponse } from "next/server";
import { exportGate, getRun, markExported } from "../../../../../server/store";
import { composeStatement } from "../../../../../agents";

export const dynamic = "force-dynamic";

/**
 * The authoritative checkpoint. Layer 2 of four (docs/04-security.md §8).
 * A direct curl cannot obtain a verified statement while findings are open.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const gate = exportGate(id);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "UNRESOLVED_FINDINGS", unresolved: gate.unresolved },
      { status: 422 },
    );
  }
  const run = getRun(id);
  if (!run) return NextResponse.json({ error: "UNKNOWN_RUN" }, { status: 404 });
  return NextResponse.json({ statement: composeStatement(run), run });
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const run = markExported(id);
    return NextResponse.json({ run });
  } catch (error) {
    const unresolved =
      error && typeof error === "object" && "unresolved" in error
        ? (error as { unresolved: string[] }).unresolved
        : [];
    return NextResponse.json(
      { error: "UNRESOLVED_FINDINGS", unresolved },
      { status: 422 },
    );
  }
}
