import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { listActiveTemplateVersions } from "@/lib/wizard-template";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const templates = await listActiveTemplateVersions();
  return NextResponse.json({ templates });
}
