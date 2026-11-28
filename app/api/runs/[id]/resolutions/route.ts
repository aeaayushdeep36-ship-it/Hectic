import { NextResponse } from "next/server";
import { checkRequest, payloadTooLarge, publicError, readJsonObject } from "../../../../../lib/http";
import { checkFalsifier } from "../../../../../lib/falsifier";
import { guard } from "../../../../../lib/guard";
import { addResolution } from "../../../../../server/store";

export const dynamic = "force-dynamic";

const ACTIONS = new Set(["downgrade", "fund_gap", "accept_limitation"]);
const MAX_FALSIFIER = 1000;
const MAX_NOTE = 2000;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const refused = checkRequest(request, { json: true });
  if (refused) return refused;

  const { id } = await context.params;
  const body = await readJsonObject(request);
  if (body === null) return payloadTooLarge();

  const { claimId, action, targetLevel, falsifier, note } = body;

  if (
    typeof claimId !== "string" ||
    claimId.length === 0 ||
    claimId.length > 100 ||
    typeof action !== "string" ||
    !ACTIONS.has(action)
  ) {
    return NextResponse.json({ error: "INVALID_RESOLUTION" }, { status: 400 });
  }
  if (falsifier !== undefined && typeof falsifier !== "string") {
    return NextResponse.json({ error: "INVALID_RESOLUTION", field: "falsifier" }, { status: 400 });
  }
  if (note !== undefined && note !== null && typeof note !== "string") {
    return NextResponse.json({ error: "INVALID_RESOLUTION", field: "note" }, { status: 400 });
  }
  if (
    targetLevel !== undefined &&
    targetLevel !== null &&
    (typeof targetLevel !== "number" ||
      !Number.isInteger(targetLevel) ||
      targetLevel < 1 ||
      targetLevel > 6)
  ) {
    return NextResponse.json({ error: "INVALID_TARGET_LEVEL", field: "targetLevel" }, { status: 400 });
  }

  const falsifierText = falsifier ?? "";
  if (falsifierText.length > MAX_FALSIFIER || (note ?? "").length > MAX_NOTE) {
    return NextResponse.json({ error: "TEXT_TOO_LONG" }, { status: 413 });
  }
  if (falsifierText.trim().length < 40) {
    return NextResponse.json(
      { error: "FALSIFIER_TOO_SHORT", field: "falsifier" },
      { status: 422 },
    );
  }
  const falsifierCheck = checkFalsifier(falsifierText);
  if (!falsifierCheck.ok) {
    return NextResponse.json(
      { error: falsifierCheck.reason ?? "FALSIFIER_NOT_OBSERVABLE", field: "falsifier" },
      { status: 422 },
    );
  }

  try {
    const run = addResolution(
      id,
      claimId,
      action as "downgrade" | "fund_gap" | "accept_limitation",
      (targetLevel as number | null | undefined) ?? null,
      falsifierText,
      // Free-text notes can contain interviewee details: redact before storage.
      typeof note === "string" ? guard(note).redacted : null,
    );
    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json(
      { error: publicError(error, "RESOLUTION_REJECTED") },
      { status: 400 },
    );
  }
}
