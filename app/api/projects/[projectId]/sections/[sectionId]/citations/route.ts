import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import {
  computeSuffixGroups,
  formatCitation,
  makeCitationKey,
  newAnchorId,
  normalizeStyle,
  orderBibliography,
  parseAuthorsJson,
  type CitationStyle,
  type ResearchAuthor,
} from "@/lib/research";
import { clientIp, loadOwnedSection, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string; sectionId: string }> };

const postSchema = z.object({ sourceId: z.string().min(1).max(64) });

async function sectionBibliography(sectionId: string, style: CitationStyle) {
  const rows = await db.orm.public.Citation.select(
    "id", "sectionId", "sourceId", "inlineText", "citationKey",
    "style", "formattedText", "anchorId", "createdAt",
  )
    .where((r) => r.sectionId.eq(sectionId))
    .limit(500)
    .all();
  type Row = {
    id: string; sectionId: string; sourceId: string; inlineText: string;
    citationKey: string; style: string; formattedText: string | null;
    anchorId: string | null; createdAt: Date | string;
  };
  const list = rows as unknown as Row[];
  const sourceIds = [...new Set(list.map((r) => r.sourceId))];
  const sourcesById = new Map<string, {
    title: string; authors: unknown; publicationYear: number | null;
    venue: string | null; volume: string | null; issue: string | null;
    pages: string | null; publisher: string | null; doi: string | null; pdfUrl: string | null;
  }>();
  for (let i = 0; i < sourceIds.length; i += 50) {
    const chunk = sourceIds.slice(i, i + 50) as [string, ...string[]];
    if (chunk.length === 0) continue;
    const found = await db.orm.public.ResearchSource.select(
      "id", "title", "authors", "publicationYear", "venue",
      "volume", "issue", "pages", "publisher", "doi", "pdfUrl",
    )
      .where((r) => r.id.in(chunk))
      .limit(50)
      .all();
    for (const s of found as unknown as {
      id: string; title: string; authors: unknown; publicationYear: number | null;
      venue: string | null; volume: string | null; issue: string | null;
      pages: string | null; publisher: string | null; doi: string | null; pdfUrl: string | null;
    }[]) sourcesById.set(s.id, s);
  }
  const enriched = list.map((r) => {
    const s = sourcesById.get(r.sourceId);
    const authors = s ? parseAuthorsJson(s.authors) : [];
    return {
      row: r,
      authors,
      year: s?.publicationYear ?? null,
      title: s?.title ?? "",
      style: (normalizeStyle(r.style) ?? style) as CitationStyle,
    };
  });
  const suffixById = computeSuffixGroups(
    enriched.map((e) => ({
      id: e.row.id, authors: e.authors, year: e.year, title: e.title, style: e.style,
    })),
  );
  const ordered = orderBibliography(
    enriched.map((e) => ({ ...e, sortTitle: e.title })),
  );
  return { enriched, suffixById, ordered };
}

export async function GET(_request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, sectionId } = await params;
  const loaded = await loadOwnedSection({
    userId: user.id, role: user.role, projectId, sectionId, allowAdminRead: true,
  });
  if (!loaded.ok) {
    const status = loaded.error;
    return NextResponse.json(
      { error: status === 404 ? "NOT_FOUND" : "FORBIDDEN" },
      { status },
    );
  }
  const style = normalizeStyle(
    (loaded.project as { referencingStyle?: string }).referencingStyle,
  ) ?? "APA_7";
  const { ordered, suffixById } = await sectionBibliography(sectionId, style);
  return NextResponse.json({
    citations: ordered.map((e) => ({
      id: e.row.id,
      sourceId: e.row.sourceId,
      inlineText: e.row.inlineText,
      formattedText: e.row.formattedText,
      citationKey: e.row.citationKey,
      style: e.row.style,
      anchorId: e.row.anchorId,
      suffix: suffixById.get(e.row.id) ?? "",
      source: {
        title: e.title,
        authors: e.authors,
        year: e.year,
      },
    })),
    readOnly: loaded.readOnly ? true : undefined,
  });
}

export async function POST(request: Request, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const { projectId, sectionId } = await params;
  const loaded = await loadOwnedSection({
    userId: user.id, role: user.role, projectId, sectionId, allowAdminRead: false,
  });
  if (!loaded.ok) {
    if (loaded.error === 404)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    if (isAdmin)
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (loaded.readOnly)
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  const link = await db.orm.public.ProjectSource.where((r) =>
    r.projectId.eq(projectId),
  )
    .where((r) => r.sourceId.eq(parsed.data.sourceId))
    .first();
  if (!link) {
    return NextResponse.json(
      { error: "UNKNOWN_SOURCE", message: "Source is not linked to this project." },
      { status: 400 },
    );
  }
  const existing = await db.orm.public.Citation.where((r) =>
    r.sectionId.eq(sectionId),
  )
    .where((r) => r.sourceId.eq(parsed.data.sourceId))
    .first();
  if (existing) {
    return NextResponse.json({
      citationId: existing.id,
      inlineText: existing.inlineText,
      formattedText: existing.formattedText,
      citationKey: existing.citationKey,
      anchorId: existing.anchorId,
      reused: true,
    });
  }
  const style =
    normalizeStyle((loaded.project as { referencingStyle?: string }).referencingStyle) ??
    "APA_7";
  if (!["APA_7", "HARVARD"].includes(
    (loaded.project as { referencingStyle?: string }).referencingStyle ?? "APA_7",
  ) && normalizeStyle((loaded.project as { referencingStyle?: string }).referencingStyle) === null) {
    return NextResponse.json({ error: "UNKNOWN_STYLE" }, { status: 400 });
  }
  const source = await db.orm.public.ResearchSource.where({
    id: parsed.data.sourceId,
  }).first();
  if (!source)
    return NextResponse.json({ error: "UNKNOWN_SOURCE" }, { status: 400 });
  const authors: ResearchAuthor[] = parseAuthorsJson(source.authors);
  const input = {
    authors,
    year: source.publicationYear ?? null,
    title: source.title,
    venue: source.venue ?? null,
    volume: source.volume ?? null,
    issue: source.issue ?? null,
    pages: source.pages ?? null,
    publisher: source.publisher ?? null,
    doi: source.doi ?? null,
    pdfUrl: source.pdfUrl ?? null,
  };
  let citationKey = makeCitationKey(authors, input.year, source.id, projectId);
  let attempt = 0;
  for (;;) {
    const clash = await db.orm.public.Citation.where({ citationKey }).first().catch(() => null);
    if (!clash) break;
    if ((clash as { sourceId?: string }).sourceId === source.id) break;
    attempt += 1;
    citationKey = `${makeCitationKey(authors, input.year, source.id, projectId)}-${attempt + 1}`;
    if (attempt > 5) {
      citationKey = `${citationKey}-${Date.now().toString(36)}`;
      break;
    }
  }
  const anchorId = newAnchorId();
  const { inlineText, formattedText } = formatCitation(style, input, "");
  const created = await db.orm.public.Citation.create({
    sectionId,
    sourceId: source.id,
    inlineText,
    citationKey,
    style,
    formattedText,
    anchorId,
  } as never);
  const createdId = (created as { id: string }).id;
  await refreshSuffixes(sectionId, style);
  const fresh = await db.orm.public.Citation.where({ id: createdId }).first();
  await logWorkspaceAudit({
    userId: user.id,
    action: "citation.insert",
    targetType: "Citation",
    targetId: createdId,
    details: { projectId, sectionId, sourceId: source.id, style },
    ipAddress: await clientIp(),
  });
  return NextResponse.json(
    {
      citationId: createdId,
      inlineText: (fresh as unknown as { inlineText: string } | null)?.inlineText ?? inlineText,
      formattedText: (fresh as unknown as { formattedText: string | null } | null)?.formattedText ?? formattedText,
      citationKey,
      anchorId,
      reused: false,
    },
    { status: 201 },
  );
}

async function refreshSuffixes(sectionId: string, fallbackStyle: CitationStyle) {
  const rows = await db.orm.public.Citation.select("id", "sourceId", "style")
    .where((r) => r.sectionId.eq(sectionId))
    .limit(500)
    .all();
  const list = rows as unknown as { id: string; sourceId: string; style: string }[];
  if (list.length <= 1) return;
  const sourceIds = [...new Set(list.map((r) => r.sourceId))];
  const sourcesById = new Map<string, { title: string; authors: unknown; publicationYear: number | null; venue: string | null; volume: string | null; issue: string | null; pages: string | null; publisher: string | null; doi: string | null; pdfUrl: string | null }>();
  for (let i = 0; i < sourceIds.length; i += 50) {
    const chunk = sourceIds.slice(i, i + 50) as [string, ...string[]];
    if (chunk.length === 0) continue;
    const found = await db.orm.public.ResearchSource.select(
      "id", "title", "authors", "publicationYear", "venue",
      "volume", "issue", "pages", "publisher", "doi", "pdfUrl",
    )
      .where((r) => r.id.in(chunk))
      .limit(50)
      .all();
    for (const s of found as unknown as {
      id: string; title: string; authors: unknown; publicationYear: number | null;
      venue: string | null; volume: string | null; issue: string | null;
      pages: string | null; publisher: string | null; doi: string | null; pdfUrl: string | null;
    }[]) sourcesById.set(s.id, s);
  }
  const items = list.map((r) => {
    const s = sourcesById.get(r.sourceId);
    return {
      id: r.id,
      authors: s ? parseAuthorsJson(s.authors) : [],
      year: s?.publicationYear ?? null,
      title: s?.title ?? "",
      style: (normalizeStyle(r.style) ?? fallbackStyle) as CitationStyle,
      raw: s,
    };
  });
  const suffixById = computeSuffixGroups(items);
  for (const item of items) {
    const suffix = suffixById.get(item.id) ?? "";
    if (!item.raw) continue;
    const { inlineText, formattedText } = formatCitation(item.style, {
      authors: item.authors, year: item.year, title: item.raw.title,
      venue: item.raw.venue, volume: item.raw.volume, issue: item.raw.issue,
      pages: item.raw.pages, publisher: item.raw.publisher,
      doi: item.raw.doi, pdfUrl: item.raw.pdfUrl,
    }, suffix);
    await db.orm.public.Citation.where({ id: item.id }).update({
      inlineText, formattedText,
    } as never).catch(() => undefined);
  }
}
