import { NextResponse } from "next/server";
import { createClaim, listClaims } from "../../../../../server/store";
import type { CreateClaimInput } from "../../../../../server/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  return NextResponse.json({ claims: listClaims(slug) });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Partial<CreateClaimInput>;
  try {
    const claim = createClaim(slug, {
      rawText: body.rawText ?? "",
      population: body.population ?? "",
      predicate: body.predicate ?? "",
      kind: body.kind ?? "pain",
      claimType: body.claimType ?? "theme",
      claimedLevel: body.claimedLevel ?? 1,
      observed: body.observed ?? null,
      precisionTolerance: body.precisionTolerance ?? null,
      ambiguityFlags: body.ambiguityFlags ?? [],
    });
    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "CLAIM_REJECTED" },
      { status: 400 },
    );
  }
}
