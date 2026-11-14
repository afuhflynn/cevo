import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { matchTemplateForUser } from "@/lib/templates";

export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const match = await matchTemplateForUser(user.id);
  return NextResponse.json(match);
}
