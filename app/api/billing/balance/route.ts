import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getBalance } from "@/lib/billing";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { balance, lowBalance } = await getBalance(user.id);
  return NextResponse.json({ balance, lowBalance });
}
