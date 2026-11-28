import { NextResponse } from "next/server";
import { exportGate, getRun, markExported } from "../../../../../server/store";
import { composeStatement } from "../../../../../agents";
import { checkRequest, publicError } from "../../../../../lib/http";

export const dynamic = "force-dynamic";

function gateFailure(gate: { unresolved: string[]; empty: boolean }) {
  return NextResponse.json(
    {
      error: gate.empty ? "NO_FINDINGS" : "UNRESOLVED_FINDINGS",
      unresolved: gate.unresolved,
    },
    { status: 422 },
  );
}

/**
 * The authoritative checkpoint. Layer 2 of four (docs/04-security.md §8).
 * A direct curl cannot obtain a verified statement while findings are open,
 * and a run with no findings at all is never "verified".
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const refused = checkRequest(request);
  if (refused) return refused;

  const { id } = await context.params;
  const run = getRun(id);
  if (!run) return NextResponse.json({ error: "UNKNOWN_RUN" }, { status: 404 });

  const gate = exportGate(id);
  if (!gate.ok) return gateFailure(gate);
  return NextResponse.json({ statement: composeStatement(run), run });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const refused = checkRequest(request);
  if (refused) return refused;

  const { id } = await context.params;
  if (!getRun(id)) return NextResponse.json({ error: "UNKNOWN_RUN" }, { status: 404 });

  const gate = exportGate(id);
  if (!gate.ok) return gateFailure(gate);

  try {
    const run = markExported(id);
    return NextResponse.json({ run });
  } catch (error) {
    // The database trigger is the last line of defence and can still refuse.
    const unresolved =
      error && typeof error === "object" && "unresolved" in error
        ? (error as { unresolved: string[] }).unresolved
        : [];
    if (unresolved.length > 0 || (error instanceof Error && error.message === "unresolved findings")) {
      return NextResponse.json({ error: "UNRESOLVED_FINDINGS", unresolved }, { status: 422 });
    }
    return NextResponse.json({ error: publicError(error, "EXPORT_FAILED") }, { status: 400 });
  }
}
