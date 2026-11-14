import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  decodeCursor,
  encodeCursor,
  FILE_CATEGORIES,
  LIST_PAGE_SIZE,
  toIso,
} from "@/lib/files";
import { db } from "@/lib/prisma";
import { loadOwnedProject } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string }> };

const querySchema = z.object({
  category: z.enum(FILE_CATEGORIES).nullish(),
  cursor: z.string().max(500).nullish(),
  limit: z.coerce.number().int().min(1).max(20).default(LIST_PAGE_SIZE),
});

function ownerOnly(error: 403 | 404, role: string): { status: 403 | 404 } {
  if (error === 404) return { status: 404 };
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  return { status: isAdmin ? 403 : 404 };
}

export async function GET(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId } = await params;
  const owned = await loadOwnedProject({
    userId: user.id,
    role: user.role,
    projectId,
    allowAdminRead: false,
  });
  if (!owned.ok) {
    const mapped = ownerOnly(owned.error, user.role);
    return NextResponse.json(
      { error: mapped.status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status: mapped.status },
    );
  }
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    category: url.searchParams.get("category"),
    cursor: url.searchParams.get("cursor"),
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const { category, cursor, limit } = parsed.data;
  const decoded = cursor ? decodeCursor(cursor) : null;
  if (cursor && !decoded) {
    return NextResponse.json({ error: "INVALID_CURSOR" }, { status: 400 });
  }

  const all = (await db.orm.public.FileAsset.select(
    "id",
    "fileName",
    "fileSize",
    "mimeType",
    "category",
    "extractionStatus",
    "extractionError",
    "createdAt",
  )
    .where({ projectId } as never)
    .limit(500)
    .all()) as unknown as Array<{
    id: string;
    fileName: string;
    fileSize: number | null;
    mimeType: string;
    category: string;
    extractionStatus: string;
    extractionError: string | null;
    createdAt: Date | string;
  }>;

  const scoped = category ? all.filter((r) => r.category === category) : all;

  const sorted = [...scoped].sort((a, b) => {
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (ta === tb) return b.id.localeCompare(a.id);
    return tb - ta;
  });

  let start = 0;
  if (decoded) {
    const idx = sorted.findIndex(
      (r) => toIso(r.createdAt) === decoded.createdAt && r.id === decoded.id,
    );
    start = idx >= 0 ? idx + 1 : sorted.length;
  }
  const page = sorted.slice(start, start + limit);
  const last = page[page.length - 1];
  const hasMore = start + limit < sorted.length;
  const quotaUsedBytes = sorted.reduce((n, r) => n + (r.fileSize ?? 0), 0);

  return NextResponse.json({
    files: page.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      fileSize: r.fileSize,
      mimeType: r.mimeType,
      category: r.category,
      extractionStatus: r.extractionStatus,
      extractionError: r.extractionError,
      createdAt: toIso(r.createdAt),
    })),
    nextCursor:
      hasMore && last ? encodeCursor(toIso(last.createdAt), last.id) : null,
    total: sorted.length,
    quotaUsedBytes,
  });
}
