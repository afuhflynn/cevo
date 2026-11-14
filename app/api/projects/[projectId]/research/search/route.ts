import { NextResponse } from "next/server";
import { checkResearchRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import { db } from "@/lib/prisma";
import {
  RESEARCH_MERGED_MAX,
  RESEARCH_OVERALL_BUDGET_MS,
  canonicalDoi,
  checkResearchCap,
  decodeCursor,
  encodeCursor,
  extractDoiCandidate,
  isDoiQuery,
  mergeHits,
  readResearchCache,
  researchCacheKey,
  searchCrossref,
  searchOpenAlex,
  writeResearchCache,
  type ProviderNotice,
  type ResearchHit,
} from "@/lib/research";
import { clientIp, loadOwnedProject, logWorkspaceAudit } from "@/lib/workspace";

type Ctx = { params: Promise<{ projectId: string }> };

function serializeHit(h: ResearchHit) {
  return {
    doi: h.doi,
    openAlexId: h.openAlexId,
    title: h.title,
    authors: h.authors,
    year: h.year,
    venue: h.venue,
    volume: h.volume,
    issue: h.issue,
    pages: h.pages,
    publisher: h.publisher,
    abstract: h.abstract?.slice(0, 600) ?? null,
    pdfUrl: h.pdfUrl,
    isOpenAccess: h.isOpenAccess,
    verificationState: h.verificationState,
    providerOrigin:
      h.providerOrigin === "merged"
        ? "OpenAlex + Crossref"
        : h.providerOrigin === "openalex"
          ? "OpenAlex"
          : "Crossref",
    doiState: h.doi ? "verified" : "unverified",
  };
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
    if (owned.error === 404)
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
    if (isAdmin)
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 300);
  if (!q)
    return NextResponse.json({ error: "QUERY_REQUIRED" }, { status: 400 });
  const cursorParam = url.searchParams.get("cursor");
  const page = decodeCursor(cursorParam);
  const cap = checkResearchCap(user.id, "search");
  if (!cap.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSeconds: cap.retryAfterSeconds },
      { status: 429, headers: { "retry-after": String(cap.retryAfterSeconds) } },
    );
  }
  if (!(await checkResearchRateLimit(request, "search"))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const cacheKey = researchCacheKey(q, cursorParam);
  const cached = readResearchCache<{
    hits: ReturnType<typeof serializeHit>[];
    nextCursor: string | null;
    providerNotices: ProviderNotice[];
    isDoi: boolean;
  }>(`research:search:${cacheKey}`);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }
  const doiCandidate = extractDoiCandidate(q);
  const doi = doiCandidate ? canonicalDoi(doiCandidate) : null;
  const isDoi = isDoiQuery(q);
  const budget = new Promise<{ timedOut: true }>((resolve) =>
    setTimeout(() => resolve({ timedOut: true }), RESEARCH_OVERALL_BUDGET_MS),
  );
  const work = (async () => {
    const [oa, cr] = await Promise.all([
      searchOpenAlex(q, page, doi),
      searchCrossref(q, page, doi),
    ]);
    return { oa, cr };
  })();
  const result = await Promise.race([work, budget]);
  let oaHits: ResearchHit[] = [];
  let crHits: ResearchHit[] = [];
  let oaFailed = false;
  let crFailed = false;
  let timedOut = false;
  if ("timedOut" in result) {
    timedOut = true;
  } else {
    oaHits = result.oa.hits;
    crHits = result.cr.hits;
    oaFailed = result.oa.failed;
    crFailed = result.cr.failed;
  }
  const notices: ProviderNotice[] = [];
  if (timedOut) {
    notices.push({
      provider: "system",
      code: "timeout",
      message:
        "Search took longer than 12 seconds. Partial results are shown; try again for the full list.",
    });
  }
  if (oaFailed)
    notices.push({
      provider: "OpenAlex",
      code: "provider_timeout",
      message: "OpenAlex timed out after 10 seconds. Showing Crossref results only.",
    });
  if (crFailed)
    notices.push({
      provider: "Crossref",
      code: "provider_timeout",
      message: "Crossref timed out after 10 seconds. Showing OpenAlex results only.",
    });
  if (!oaFailed && !crFailed && !timedOut && oaHits.length === 0 && crHits.length === 0) {
    if (isDoi && doi) {
      notices.push({
        provider: "system",
        code: "doi_miss",
        message:
          "No record found for that DOI. Check the DOI for typos, or try the article title below.",
      });
      const fallback = await searchOpenAlex(q, 1, null).catch(() => ({
        hits: [],
        hasMore: false,
        failed: true,
      }));
      const merged = mergeHits(fallback.hits, [], q, null);
      const payload = {
        hits: merged.map(serializeHit).slice(0, RESEARCH_MERGED_MAX),
        nextCursor: null,
        providerNotices: notices,
        isDoi: true,
      };
      writeResearchCache(`research:search:${cacheKey}`, payload);
      return NextResponse.json(payload);
    }
    notices.push({
      provider: "system",
      code: "no_results",
      message:
        "No verified papers matched. Try fewer keywords, the exact title, or a DOI.",
    });
  }
  const merged = mergeHits(oaHits, crHits, q, doi);
  const hasMore = oaHits.length >= 10 || crHits.length >= 10;
  const nextCursor = hasMore ? encodeCursor(page + 1) : null;
  const payload = {
    hits: merged.map(serializeHit),
    nextCursor,
    providerNotices: notices,
    isDoi,
  };
  writeResearchCache(`research:search:${cacheKey}`, payload);
  if (notices.length > 0) {
    await logWorkspaceAudit({
      userId: user.id,
      action: "research.search.partial",
      targetType: "Project",
      targetId: projectId,
      details: { q: q.slice(0, 120), notices: notices.map((n) => n.code) },
      ipAddress: await clientIp(),
    }).catch(() => undefined);
  }
  void db;
  return NextResponse.json(payload);
}
