import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getResearchLibrarySummary } from "@/lib/research-library";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const summary = await getResearchLibrarySummary(user.id);
  return NextResponse.json(summary);
}
