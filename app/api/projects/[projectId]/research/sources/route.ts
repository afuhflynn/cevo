import { NextResponse } from "next/server";
import { z } from "zod";
import { checkResearchRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import {
  buildReference,
  canonicalDoi,
  checkResearchCap,
  computeVerificationState,
  fetchSourceById,
  normalizeAuthorName,
  normalizeTitleKey,
  parseAuthorsJson,
  type ResearchAuthor,
} from "@/lib/research";
import { clientIp, loadOwnedProject, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string }> };

const saveSchema = z.object({
  doi: z.string().max(200).optional(),
  openAlexId: z.string().max(300).optional(),
  payload: z
    .object({
      title: z.string().max(2000).optional(),
      authors: z.array(z.unknown()).max(60).optional(),
      year: z.number().int().min(1000).max(2100).nullable().optional(),
      venue: z.string().max(500).nullable().optional(),
      publisher: z.string().max(500).nullable().optional(),
      abstract: z.string().max(20000).nullable().optional(),
      pdfUrl: z.string().max(2000).nullable().optional(),
      isOpenAccess: z.boolean().optional(),
    })
    .optional(),
  note: z.string().max(2000).optional(),
  studentNote: z.string().max(2000).optional(),
  tags: z.array(z.string().max(24)).max(10).optional(),
  isPinned: z.boolean().optional(),
});

function normalizeTags(tags: unknown): string[] | null {
  if (tags === undefined) return null;
  if (!Array.isArray(tags)) return null;
  const out: string[] = [];
  for (const t of tags) {
    if (typeof t !== "string") continue;
    const v = t.trim().toLowerCase().slice(0, 24);
    if (!v) continue;
    if (!out.includes(v)) out.push(v);
    if (out.length >= 10) break;
  }
  return out;
}

function ownerOnly(
  error: 403 | 404,
  role: string,
): { status: 403 | 404; hide: boolean } {
  if (error === 404) return { status: 404, hide: true };
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  return isAdmin ? { status: 403, hide: false } : { status: 404, hide: true };
}

export async function POST(request: Request, { params }: Ctx) {
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
  const cap = checkResearchCap(user.id, "save");
  if (!cap.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSeconds: cap.retryAfterSeconds },
      { status: 429, headers: { "retry-after": String(cap.retryAfterSeconds) } },
    );
  }
  if (!(await checkResearchRateLimit(request, "save"))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const doiInput = parsed.data.doi?.trim()
    ? canonicalDoi(parsed.data.doi)
    : null;
  const openAlexInput = parsed.data.openAlexId?.trim() || null;
  if (!doiInput && !openAlexInput) {
    return NextResponse.json(
      {
        error: "UNRESOLVABLE",
        message:
          "A DOI or OpenAlex ID is required. Title-only results cannot be saved until resolved.",
      },
      { status: 400 },
    );
  }
  const hit = await fetchSourceById({ doi: doiInput, openAlexId: openAlexInput });
  if (!hit) {
    return NextResponse.json(
      { error: "UNRESOLVABLE", message: "Could not verify this source with either provider." },
      { status: 400 },
    );
  }
  const authors: ResearchAuthor[] = hit.authors.map(normalizeAuthorName);
  const canonical = hit.doi ? canonicalDoi(hit.doi) : null;
  let sourceRow: { id: string } | null = null;
  if (canonical) {
    sourceRow = await db.orm.public.ResearchSource.where({ doi: canonical }).first();
  }
  if (!sourceRow && hit.openAlexId) {
    sourceRow = await db.orm.public.ResearchSource.where({
      openAlexId: hit.openAlexId,
    }).first();
  }
  if (!sourceRow) {
    const titleKey = normalizeTitleKey(hit.title);
    let candidates: { id: string; title: string; publicationYear: number | null; authors: unknown }[] = [];
    try {
      candidates = (await db.orm.public.ResearchSource.select("id", "title", "publicationYear", "authors")
        .limit(50)
        .all()) as unknown as typeof candidates;
    } catch {
      candidates = [];
    }
    for (const c of candidates as { id: string; title: string; publicationYear: number | null; authors: unknown }[]) {
      if (normalizeTitleKey(c.title) !== titleKey) continue;
      if ((c.publicationYear ?? null) !== (hit.year ?? null)) continue;
      const first = parseAuthorsJson(c.authors)[0]?.family.toLowerCase() ?? "";
      if (first !== (authors[0]?.family ?? "").toLowerCase()) continue;
      sourceRow = { id: c.id };
      break;
    }
  }
  const verificationState = computeVerificationState({
    doi: canonical,
    title: hit.title,
    authors,
    year: hit.year,
    pdfUrl: hit.pdfUrl,
    disagreement: false,
  });
  const apa = buildReference("APA_7", {
    authors, year: hit.year, title: hit.title, venue: hit.venue,
    volume: hit.volume, issue: hit.issue, pages: hit.pages,
    publisher: hit.publisher, doi: canonical, pdfUrl: hit.pdfUrl,
  });
  const harvard = buildReference("HARVARD", {
    authors, year: hit.year, title: hit.title, venue: hit.venue,
    volume: hit.volume, issue: hit.issue, pages: hit.pages,
    publisher: hit.publisher, doi: canonical, pdfUrl: hit.pdfUrl,
  });
  const rawMetadata = {
    providers: [hit.providerOrigin],
    fetchedAt: new Date().toISOString(),
    openAlexId: hit.openAlexId,
    ...((hit.raw as Record<string, unknown> | null) ?? {}),
  };
  let sourceId: string;
  if (sourceRow) {
    const updated = await db.orm.public.ResearchSource.where({ id: sourceRow.id }).update({
      doi: canonical ?? undefined,
      openAlexId: hit.openAlexId ?? undefined,
      title: hit.title,
      authors: authors as unknown as never,
      publicationYear: hit.year ?? undefined,
      venue: hit.venue ?? undefined,
      volume: hit.volume ?? undefined,
      issue: hit.issue ?? undefined,
      pages: hit.pages ?? undefined,
      publisher: hit.publisher ?? undefined,
      abstract: hit.abstract ?? undefined,
      pdfUrl: hit.pdfUrl ?? undefined,
      isOpenAccess: hit.isOpenAccess,
      verificationState: verificationState as never,
      rawMetadata: rawMetadata as unknown as never,
      formattedApa: apa,
      formattedHarvard: harvard,
      lastVerifiedAt: new Date(),
    } as never).catch(() => null);
    sourceId = sourceRow.id;
    void updated;
  } else {
    const created = await db.orm.public.ResearchSource.create({
      doi: canonical ?? undefined,
      openAlexId: hit.openAlexId ?? undefined,
      title: hit.title,
      authors: authors as unknown as never,
      publicationYear: hit.year ?? undefined,
      venue: hit.venue ?? undefined,
      volume: hit.volume ?? undefined,
      issue: hit.issue ?? undefined,
      pages: hit.pages ?? undefined,
      publisher: hit.publisher ?? undefined,
      abstract: hit.abstract ?? undefined,
      pdfUrl: hit.pdfUrl ?? undefined,
      isOpenAccess: hit.isOpenAccess,
      verificationState: verificationState as never,
      rawMetadata: rawMetadata as unknown as never,
      formattedApa: apa,
      formattedHarvard: harvard,
      lastVerifiedAt: new Date(),
    } as never);
    sourceId = (created as { id: string }).id;
  }
  const note = (parsed.data.studentNote ?? parsed.data.note ?? "").trim().slice(0, 2000);
  const tags = normalizeTags(parsed.data.tags);
  const existingLink = await db.orm.public.ProjectSource.where((r) =>
    r.projectId.eq(projectId),
  )
    .where((r) => r.sourceId.eq(sourceId))
    .first();
  if (existingLink) {
    return NextResponse.json({
      sourceId,
      projectSourceId: existingLink.id,
      deduped: true,
    });
  }
  const link = await db.orm.public.ProjectSource.create({
    projectId,
    sourceId,
    studentNote: note || undefined,
    tags: (tags ?? undefined) as unknown as never,
    isPinned: parsed.data.isPinned ?? false,
  } as never);
  await logWorkspaceAudit({
    userId: user.id,
    action: "research.save",
    targetType: "ProjectSource",
    targetId: (link as { id: string }).id,
    details: { projectId, sourceId, doi: canonical },
    ipAddress: await clientIp(),
  });
  return NextResponse.json(
    {
      sourceId,
      projectSourceId: (link as { id: string }).id,
      deduped: false,
    },
    { status: 201 },
  );
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
    allowAdminRead: true,
  });
  if (!owned.ok) {
    const status = owned.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  const url = new URL(request.url);
  const filter = (url.searchParams.get("filter") ?? "").trim().toLowerCase().slice(0, 200);
  const tag = (url.searchParams.get("tag") ?? "").trim().toLowerCase().slice(0, 24);
  const cursor = url.searchParams.get("cursor");
  const pageSize = 20;
  const links = await db.orm.public.ProjectSource.select(
    "id", "projectId", "sourceId", "studentNote", "tags", "isPinned", "createdAt", "updatedAt",
  )
    .where((r) => r.projectId.eq(projectId))
    .limit(500)
    .all();
  type LinkRow = {
    id: string; projectId: string; sourceId: string;
    studentNote: string | null; tags: unknown; isPinned: boolean;
    createdAt: Date | string; updatedAt: Date | string;
  };
  let rows = links as unknown as LinkRow[];
  const sourceIds = [...new Set(rows.map((r) => r.sourceId))];
  const sourcesById = new Map<string, {
    id: string; doi: string | null; openAlexId: string | null; title: string;
    authors: unknown; publicationYear: number | null; venue: string | null;
    isOpenAccess: boolean; pdfUrl: string | null; verificationState: string;
  }>();
  for (let i = 0; i < sourceIds.length; i += 50) {
    const chunk = sourceIds.slice(i, i + 50) as [string, ...string[]];
    if (chunk.length === 0) continue;
    const found = await db.orm.public.ResearchSource.select(
      "id", "doi", "openAlexId", "title", "authors", "publicationYear",
      "venue", "isOpenAccess", "pdfUrl", "verificationState",
    )
      .where((r) => r.id.in(chunk))
      .limit(50)
      .all();
    for (const s of found as unknown as {
      id: string; doi: string | null; openAlexId: string | null; title: string;
      authors: unknown; publicationYear: number | null; venue: string | null;
      isOpenAccess: boolean; pdfUrl: string | null; verificationState: string;
    }[]) sourcesById.set(s.id, s);
  }
  if (filter) {
    rows = rows.filter((r) => {
      const s = sourcesById.get(r.sourceId);
      const authors = Array.isArray(s ? parseAuthorsJson(s.authors) : [])
        ? parseAuthorsJson(s!.authors).map((a) => `${a.family} ${a.given ?? ""}`).join(" ")
        : "";
      const hay = `${s?.title ?? ""} ${authors} ${s?.venue ?? ""} ${r.studentNote ?? ""}`.toLowerCase();
      return hay.includes(filter);
    });
  }
  if (tag) {
    rows = rows.filter((r) => {
      const tags = Array.isArray(r.tags) ? (r.tags as string[]) : [];
      return tags.map((t) => String(t).toLowerCase()).includes(tag);
    });
  }
  rows.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    const ta = new Date(a.createdAt).getTime();
    const tb = new Date(b.createdAt).getTime();
    if (ta !== tb) return tb - ta;
    return a.id.localeCompare(b.id);
  });
  const total = rows.length;
  let start = 0;
  if (cursor) {
    const idx = rows.findIndex((r) => r.id === cursor);
    start = idx >= 0 ? idx + 1 : 0;
  }
  const page = rows.slice(start, start + pageSize);
  const nextCursor = start + pageSize < rows.length ? page[page.length - 1]!.id : null;
  return NextResponse.json({
    links: page.map((r) => {
      const s = sourcesById.get(r.sourceId);
      return {
        id: r.id,
        sourceId: r.sourceId,
        studentNote: r.studentNote ?? null,
        tags: Array.isArray(r.tags) ? r.tags : [],
        isPinned: r.isPinned,
        createdAt: new Date(r.createdAt).toISOString(),
        source: s
          ? {
              id: s.id,
              doi: s.doi,
              openAlexId: s.openAlexId,
              title: s.title,
              authors: parseAuthorsJson(s.authors),
              year: s.publicationYear,
              venue: s.venue,
              isOpenAccess: s.isOpenAccess,
              pdfUrl: s.pdfUrl,
              verificationState: s.verificationState,
            }
          : null,
      };
    }),
    nextCursor,
    total,
    readOnly: owned.readOnly ? true : undefined,
  });
}
