import { NextResponse } from "next/server";
import { addResolution } from "../../../../../server/store";

export const dynamic = "force-dynamic";

const ACTIONS = new Set(["downgrade", "fund_gap", "accept_limitation"]);

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as {
    claimId?: string;
    action?: string;
    targetLevel?: number | null;
    falsifier?: string;
    note?: string | null;
  };

  if (!body.claimId || !body.action || !ACTIONS.has(body.action)) {
    return NextResponse.json({ error: "INVALID_RESOLUTION" }, { status: 400 });
  }
  const falsifier = body.falsifier ?? "";
  if (falsifier.trim().length < 40) {
    return NextResponse.json(
      { error: "FALSIFIER_TOO_SHORT", field: "falsifier" },
      { status: 422 },
    );
  }
  if (!/\b(if|when|unless|should)\b/i.test(falsifier)) {
    return NextResponse.json(
      { error: "FALSIFIER_NEEDS_CONDITION", field: "falsifier" },
      { status: 422 },
    );
  }

  try {
    const run = addResolution(
      id,
      body.claimId,
      body.action as "downgrade" | "fund_gap" | "accept_limitation",
      body.targetLevel ?? null,
      falsifier,
      body.note ?? null,
    );
    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "RESOLUTION_REJECTED" },
      { status: 400 },
    );
  }
}
