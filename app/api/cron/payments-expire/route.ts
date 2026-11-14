import { NextResponse } from "next/server";
import { expireOverduePayments } from "@/lib/billing";

export async function POST(request: Request) {
  const secret = process.env["CRON_SECRET"];
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { expired } = await expireOverduePayments();
  return NextResponse.json({ expired });
}
