import { NextResponse } from "next/server";
import { checkRequest, payloadTooLarge, publicError, readJsonObject } from "../../../../../lib/http";
import { guard } from "../../../../../lib/guard";
import { createClaimInputSchema } from "../../../../../lib/schemas";
import { createClaim, listClaims } from "../../../../../server/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const refused = checkRequest(request);
  if (refused) return refused;

  const { slug } = await context.params;
  return NextResponse.json({ claims: listClaims(slug) });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const refused = checkRequest(request, { json: true });
  if (refused) return refused;

  const { slug } = await context.params;
  const body = await readJsonObject(request);
  if (body === null) return payloadTooLarge();

  const parsed = createClaimInputSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: "INVALID_CLAIM", field: issue?.path.join(".") || null },
      { status: 400 },
    );
  }
  const input = parsed.data;

  try {
    // Claims are third-party-adjacent free text: redact before they are stored
    // or ever reach a provider, exactly as the formaliser does for its input.
    const claim = createClaim(slug, {
      ...input,
      rawText: guard(input.rawText).redacted,
      population: guard(input.population).redacted,
      predicate: guard(input.predicate).redacted,
    });
    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: publicError(error, "CLAIM_REJECTED") },
      { status: 400 },
    );
  }
}
