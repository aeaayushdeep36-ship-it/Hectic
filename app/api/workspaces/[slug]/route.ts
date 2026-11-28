import { NextResponse } from "next/server";
import { checkRequest } from "../../../../lib/http";
import {
  getWorkspace,
  listClaims,
  listRuns,
  workspaceMatrix,
} from "../../../../server/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const refused = checkRequest(request);
  if (refused) return refused;

  const { slug } = await context.params;
  const workspace = getWorkspace(slug);
  if (!workspace) {
    return NextResponse.json({ error: "UNKNOWN_WORKSPACE" }, { status: 404 });
  }
  return NextResponse.json({
    workspace,
    claims: listClaims(slug),
    matrix: workspaceMatrix(slug),
    runs: listRuns(slug),
  });
}
