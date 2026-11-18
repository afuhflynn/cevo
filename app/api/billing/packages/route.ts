import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { listActivePackages } from "@/lib/billing";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  try {
    const packages = await listActivePackages();
    return NextResponse.json({ packages });
  } catch {
    return NextResponse.json({ error: "BILLING_UNAVAILABLE" }, { status: 503 });
  }
}
