import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getVisibleTemplateVersion } from "@/lib/dashboard-templates";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { id } = await params;
  const found = await getVisibleTemplateVersion(id);
  if (!found) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(found);
}
