import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import { parseAuthorsJson, providerOriginLabel } from "@/lib/research";
import { clientIp, loadOwnedProject, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string; linkId: string }> };

const patchSchema = z.object({
  studentNote: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  isPinned: z.boolean().optional(),
});

async function loadLink(projectId: string, linkId: string) {
  const link = await db.orm.public.ProjectSource.where({ id: linkId }).first();
  if (!link || link.projectId !== projectId) return null;
  return link;
}

export async function GET(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, linkId } = await params;
  const owned = await loadOwnedProject({
    userId: user.id, role: user.role, projectId, allowAdminRead: true,
  });
  if (!owned.ok) {
    const status = owned.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  const link = await loadLink(projectId, linkId);
  if (!link)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const source = await db.orm.public.ResearchSource.where({ id: link.sourceId }).first();
  if (!source)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const raw = (source.rawMetadata ?? {}) as Record<string, unknown>;
  const origin =
    typeof raw["providers"] !== "undefined"
      ? providerOriginLabel({
          providerOrigin:
            String(JSON.stringify(raw["providers"])).includes("crossref") &&
            String(JSON.stringify(raw["providers"])).includes("openalex")
              ? "merged"
              : String(JSON.stringify(raw["providers"])).includes("crossref")
                ? "crossref"
                : "openalex",
        } as never)
      : "OpenAlex";
  return NextResponse.json({
    link: {
      id: link.id,
      sourceId: link.sourceId,
      studentNote: link.studentNote ?? null,
      tags: Array.isArray(link.tags) ? link.tags : [],
      isPinned: link.isPinned,
      createdAt: new Date(link.createdAt).toISOString(),
    },
    source: {
      id: source.id,
      doi: source.doi,
      openAlexId: source.openAlexId,
      title: source.title,
      authors: parseAuthorsJson(source.authors),
      year: source.publicationYear,
      venue: source.venue,
      volume: source.volume,
      issue: source.issue,
      pages: source.pages,
      publisher: source.publisher,
      abstract: source.abstract ?? null,
      pdfUrl: source.pdfUrl ?? null,
      isOpenAccess: source.isOpenAccess,
      verificationState: source.verificationState,
      formattedApa: source.formattedApa ?? null,
      formattedHarvard: source.formattedHarvard ?? null,
    },
    providerOrigin: origin,
    lastVerifiedAt: source.lastVerifiedAt
      ? new Date(source.lastVerifiedAt).toISOString()
      : null,
    readOnly: owned.readOnly ? true : undefined,
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, linkId } = await params;
  const owned = await loadOwnedProject({
    userId: user.id, role: user.role, projectId, allowAdminRead: false,
  });
  if (!owned.ok) {
    if (owned.error === 404)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    if (isAdmin)
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (owned.readOnly)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const link = await loadLink(projectId, linkId);
  if (!link)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const patch: Record<string, unknown> = {};
  if (parsed.data.studentNote !== undefined) {
    patch["studentNote"] =
      parsed.data.studentNote === null
        ? null
        : parsed.data.studentNote.trim().slice(0, 2000) || null;
  }
  if (parsed.data.tags !== undefined) {
    for (const t of parsed.data.tags) {
      if (t.trim().length > 24) {
        return NextResponse.json(
          { error: "INVALID_TAGS", message: "Each tag is max 24 chars." },
          { status: 400 },
        );
      }
    }
    patch["tags"] = parsed.data.tags
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .slice(0, 10);
  }
  if (parsed.data.isPinned !== undefined) patch["isPinned"] = parsed.data.isPinned;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "INVALID_INPUT", message: "Nothing to update." },
      { status: 422 },
    );
  }
  const updated = await db.orm.public.ProjectSource.where({ id: linkId }).update(
    patch as never,
  );
  if (!updated)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await logWorkspaceAudit({
    userId: user.id,
    action: "research.update",
    targetType: "ProjectSource",
    targetId: linkId,
    details: { projectId, patch: Object.keys(patch) },
    ipAddress: await clientIp(),
  });
  return NextResponse.json({
    link: {
      id: updated.id,
      sourceId: updated.sourceId,
      studentNote: updated.studentNote ?? null,
      tags: Array.isArray(updated.tags) ? updated.tags : [],
      isPinned: updated.isPinned,
    },
  });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, linkId } = await params;
  const owned = await loadOwnedProject({
    userId: user.id, role: user.role, projectId, allowAdminRead: false,
  });
  if (!owned.ok) {
    if (owned.error === 404)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    if (isAdmin)
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (owned.readOnly)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const link = await loadLink(projectId, linkId);
  if (!link)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await db.orm.public.ProjectSource.where({ id: linkId }).delete().catch(() => undefined);
  await logWorkspaceAudit({
    userId: user.id,
    action: "research.unsave",
    targetType: "ProjectSource",
    targetId: linkId,
    details: { projectId, sourceId: link.sourceId },
    ipAddress: await clientIp(),
  });
  return NextResponse.json({ ok: true });
}
