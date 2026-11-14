import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { deleteStorageObject } from "@/lib/storage";

export async function GET(request: Request) {
  const secret = process.env["CRON_SECRET"];
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const now = new Date();
  let rows: Array<{ id: string; s3Key: string | null }> = [];
  try {
    rows = (await db.orm.public.ExportJob.select("id", "s3Key")
      .where((r) => r.expiresAt.lte(now))
      .where((r) => r.s3Key.isNotNull())
      .limit(100)
      .all()) as unknown as Array<{ id: string; s3Key: string | null }>;
  } catch {
    rows = [];
  }
  let pruned = 0;
  for (const row of rows) {
    if (!row.s3Key) continue;
    await deleteStorageObject(row.s3Key).catch(() => false);
    try {
      await db.orm.public.ExportJob.where({ id: row.id }).update({ s3Key: null } as never);
    } catch {
      continue;
    }
    pruned += 1;
  }
  return NextResponse.json({ pruned });
}
