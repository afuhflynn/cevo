import { NextResponse } from "next/server";
import { checkResearchRateLimit } from "@/lib/arcjet";
import { getCurrentUser } from "@/lib/auth-helpers";
import {
  canonicalDoi,
  checkResearchCap,
  decodeCursor,
  encodeCursor,
  extractDoiCandidate,
  filterHitsByWorkType,
  isDoiQuery,
  mergeHits,
  type ProviderNotice,
  parseWorkTypeParam,
  RESEARCH_MERGED_MAX,
  RESEARCH_OVERALL_BUDGET_MS,
  type ResearchHit,
  readResearchCache,
  researchCacheKey,
  searchCrossref,
  searchOpenAlex,
  writeResearchCache,
} from "@/lib/research";

function serializeHit(h: ResearchHit) {
  return {
    doi: h.doi,
    openAlexId: h.openAlexId,
    title: h.title,
    authors: h.authors,
    year: h.year,
    venue: h.venue,
    abstract: h.abstract?.slice(0, 600) ?? null,
    pdfUrl: h.pdfUrl,
    isOpenAccess: h.isOpenAccess,
    verificationState: h.verificationState,
    workType: h.workType,
    providerOrigin:
      h.providerOrigin === "merged"
        ? "OpenAlex + Crossref"
        : h.providerOrigin === "openalex"
          ? "OpenAlex"
          : "Crossref",
    doiState: h.doi ? "verified" : "unverified",
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 300);
  if (!q)
    return NextResponse.json({ error: "QUERY_REQUIRED" }, { status: 400 });
  const workType = parseWorkTypeParam(url.searchParams.get("type"));
  const cursorParam = url.searchParams.get("cursor");
  const page = decodeCursor(cursorParam);
  const cap = checkResearchCap(user.id, "search");
  if (!cap.allowed) {
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSeconds: cap.retryAfterSeconds },
      {
        status: 429,
        headers: { "retry-after": String(cap.retryAfterSeconds) },
      },
    );
  }
  if (!(await checkResearchRateLimit(request, "search"))) {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }
  const cacheKey = `research:global:${researchCacheKey(q, `${workType}|${cursorParam ?? ""}`)}`;
  const cached = readResearchCache<{
    hits: ReturnType<typeof serializeHit>[];
    nextCursor: string | null;
    providerNotices: ProviderNotice[];
    isDoi: boolean;
  }>(cacheKey);
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
      message:
        "OpenAlex timed out after 10 seconds. Showing Crossref results only.",
    });
  if (crFailed)
    notices.push({
      provider: "Crossref",
      code: "provider_timeout",
      message:
        "Crossref timed out after 10 seconds. Showing OpenAlex results only.",
    });
  const merged = mergeHits(oaHits, crHits, q, doi);
  if (!timedOut && !oaFailed && !crFailed && merged.length === 0) {
    if (isDoi && doi) {
      notices.push({
        provider: "system",
        code: "doi_miss",
        message:
          "No record found for that DOI. Check the DOI for typos, or try the article title below.",
      });
    } else {
      notices.push({
        provider: "system",
        code: "no_results",
        message:
          "No verified papers matched. Try fewer keywords, the exact title, or a DOI.",
      });
    }
  }
  const hasMore = oaHits.length >= 10 || crHits.length >= 10;
  const nextCursor = hasMore ? encodeCursor(page + 1) : null;
  const payload = {
    hits: filterHitsByWorkType(merged, workType)
      .map(serializeHit)
      .slice(0, RESEARCH_MERGED_MAX),
    nextCursor,
    providerNotices: notices,
    isDoi,
    workType,
  };
  writeResearchCache(cacheKey, payload);
  return NextResponse.json(payload);
}
