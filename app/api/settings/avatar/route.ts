import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { presignPreviewUrl } from "@/lib/storage";

/**
 * Serves the signed-in user's avatar. User.image stores the S3 key
 * (never a presigned URL, which would expire), so every view resolves a
 * fresh short-lived preview URL and redirects to it.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const row = (await db.orm.public.User.where({
    id: user.id,
  }).first()) as unknown as {
    image: string | null;
  } | null;
  const key = row?.image ?? null;
  if (!key || !key.startsWith("avatars/")) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  try {
    const { url } = await presignPreviewUrl(key, "avatar", "image/*");
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503 });
  }
}
