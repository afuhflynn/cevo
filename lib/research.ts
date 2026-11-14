import { createHash, randomUUID } from "node:crypto";

export type ResearchAuthor = {
  family: string;
  given?: string;
  affiliation?: string;
};

export type CitationStyle = "APA_7" | "HARVARD";

export type VerificationStateValue =
  | "METADATA_VERIFIED"
  | "DOI_VERIFIED"
  | "FULL_TEXT_AVAILABLE"
  | "REQUIRES_REVIEW"
  | "INCOMPLETE_METADATA";

export type ResearchHit = {
  doi: string | null;
  openAlexId: string | null;
  title: string;
  authors: ResearchAuthor[];
  year: number | null;
  venue: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publisher: string | null;
  abstract: string | null;
  pdfUrl: string | null;
  isOpenAccess: boolean;
  verificationState: VerificationStateValue;
  providerOrigin: "openalex" | "crossref" | "merged";
  raw: Record<string, unknown>;
};

export const RESEARCH_SEARCH_PAGE_SIZE = 10;
export const RESEARCH_MERGED_MAX = 20;
export const RESEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
export const RESEARCH_PROVIDER_TIMEOUT_MS = 10_000;
export const RESEARCH_OVERALL_BUDGET_MS = 12_000;
export const FORMATTER_VERSION = 1;

export function contactEmail(): string {
  return (
    process.env["RESEARCH_CONTACT_EMAIL"] ??
    process.env["OPENAX_EMAIL"] ??
    "research@cevo.example"
  );
}

const DOI_RE = /10\.\d{4,}\/[^\s"'<>]+/i;

export function extractDoiCandidate(input: string): string | null {
  const trimmed = input.trim();
  const m = trimmed.match(DOI_RE);
  return m ? m[0]! : null;
}

export function isDoiQuery(input: string): boolean {
  return extractDoiCandidate(input) !== null;
}

export function canonicalDoi(input: string): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
  s = s.replace(/^doi:\s*/, "");
  s = s.replace(/[.,;)\]]+$/, "");
  return s.trim();
}

export function normalizeTitleKey(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function normalizeAuthorName(a: ResearchAuthor): ResearchAuthor {
  return {
    family: a.family.trim(),
    given: a.given?.trim() || undefined,
    affiliation: a.affiliation?.trim() || undefined,
  };
}

export function parseAuthorsJson(value: unknown): ResearchAuthor[] {
  if (!Array.isArray(value)) return [];
  const out: ResearchAuthor[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const family =
      typeof r["family"] === "string"
        ? r["family"]
        : typeof r["name"] === "string"
          ? r["name"]
          : "";
    if (!family.trim()) continue;
    out.push({
      family: family.trim().slice(0, 200),
      given:
        typeof r["given"] === "string"
          ? r["given"].trim().slice(0, 200) || undefined
          : undefined,
      affiliation:
        typeof r["affiliation"] === "string"
          ? r["affiliation"].trim().slice(0, 300) || undefined
          : undefined,
    });
  }
  return out.slice(0, 50);
}

function initialsOf(given: string | undefined): string {
  if (!given) return "";
  const parts = given
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  if (parts.length === 0) return "";
  return parts.map((p) => `${p[0]!.toUpperCase()}.`).join(" ");
}

function apaAuthorOne(a: ResearchAuthor): string {
  if (!a.given) return a.family;
  const init = initialsOf(a.given);
  return init ? `${a.family}, ${init}`.trim() : a.family;
}

export function formatAuthorsApa(authors: ResearchAuthor[]): string {
  if (authors.length === 0) return "";
  const rendered = authors.map(apaAuthorOne);
  if (rendered.length === 1) return rendered[0]!;
  if (rendered.length <= 20) {
    return `${rendered.slice(0, -1).join(", ")}, & ${rendered[rendered.length - 1]}`;
  }
  return `${rendered.slice(0, 20).join(", ")}, et al.`;
}

export function formatAuthorsHarvard(authors: ResearchAuthor[]): string {
  if (authors.length === 0) return "";
  const rendered = authors.map(apaAuthorOne);
  if (rendered.length === 1) return rendered[0]!;
  if (rendered.length === 2) return `${rendered[0]} and ${rendered[1]}`;
  if (rendered.length === 3)
    return `${rendered[0]}, ${rendered[1]} and ${rendered[2]}`;
  return `${rendered[0]} et al.`;
}

function familyShort(family: string): string {
  return family.trim() || "Anon";
}

export function inlineBaseApa(authors: ResearchAuthor[]): string {
  if (authors.length === 0) return "Anon";
  if (authors.length === 1) return familyShort(authors[0]!.family);
  if (authors.length === 2)
    return `${familyShort(authors[0]!.family)} & ${familyShort(authors[1]!.family)}`;
  return `${familyShort(authors[0]!.family)} et al.`;
}

export function inlineBaseHarvard(authors: ResearchAuthor[]): string {
  if (authors.length === 0) return "Anon";
  if (authors.length === 1) return familyShort(authors[0]!.family);
  if (authors.length === 2)
    return `${familyShort(authors[0]!.family)} and ${familyShort(authors[1]!.family)}`;
  if (authors.length === 3)
    return `${familyShort(authors[0]!.family)}, ${familyShort(authors[1]!.family)} and ${familyShort(authors[2]!.family)}`;
  return `${familyShort(authors[0]!.family)} et al.`;
}

export function yearLabel(year: number | null): string {
  return year === null || !Number.isFinite(year) ? "n.d." : String(year);
}

export function buildInlineText(
  style: CitationStyle,
  authors: ResearchAuthor[],
  year: number | null,
  suffix = "",
): string {
  const base =
    style === "APA_7" ? inlineBaseApa(authors) : inlineBaseHarvard(authors);
  return `(${base}, ${yearLabel(year)}${suffix})`;
}

export type ReferenceInput = {
  authors: ResearchAuthor[];
  year: number | null;
  title: string;
  venue: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publisher: string | null;
  doi: string | null;
  pdfUrl: string | null;
};

function cleanTitle(title: string): string {
  const t = title.trim().replace(/\s+/g, " ");
  if (!t) return "Untitled.";
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function venuePart(input: ReferenceInput): string {
  const venue = input.venue?.trim() || input.publisher?.trim() || "";
  let out = venue;
  if (input.volume?.trim()) {
    out += out ? `, ${input.volume.trim()}` : input.volume.trim();
    if (input.issue?.trim()) out += `(${input.issue.trim()})`;
  }
  if (input.pages?.trim()) {
    out += out ? `, ${input.pages.trim()}` : input.pages.trim();
  }
  return out ? `${out.replace(/\s+/g, " ")}.` : "";
}

function doiUrl(doi: string | null, pdfUrl: string | null): string {
  if (doi) return `https://doi.org/${canonicalDoi(doi)}`;
  if (pdfUrl?.trim()) return pdfUrl.trim();
  return "";
}

export function buildReference(
  style: CitationStyle,
  input: ReferenceInput,
  suffix = "",
): string {
  const authors =
    style === "APA_7"
      ? formatAuthorsApa(input.authors)
      : formatAuthorsHarvard(input.authors);
  const year = `${yearLabel(input.year)}${suffix}`;
  const title = cleanTitle(input.title);
  const tail = venuePart(input);
  const url = doiUrl(input.doi, input.pdfUrl);
  if (style === "APA_7") {
    const head = authors ? `${authors} (${year}).` : `(${year}).`;
    const parts = [head, title, tail].filter(Boolean).join(" ");
    return url ? `${parts} ${url}`.trim() : parts.trim();
  }
  const head = authors ? `${authors} (${year})` : `(${year})`;
  const quotedTitle = `'${cleanTitle(input.title).replace(/\.$/, "")}',`;
  const parts = [head, quotedTitle, tail].filter(Boolean).join(" ");
  return url ? `${parts} Available at: ${url}.`.trim() : parts.trim();
}

export function formatCitation(
  style: CitationStyle,
  input: ReferenceInput,
  suffix = "",
): { inlineText: string; formattedText: string } {
  return {
    inlineText: buildInlineText(style, input.authors, input.year, suffix),
    formattedText: buildReference(style, input, suffix),
  };
}

export function computeSuffixGroups(
  items: { id: string; authors: ResearchAuthor[]; year: number | null; title: string; style: CitationStyle }[],
): Map<string, string> {
  const groups = new Map<string, { id: string; title: string }[]>();
  for (const item of items) {
    const base =
      item.style === "APA_7"
        ? inlineBaseApa(item.authors)
        : inlineBaseHarvard(item.authors);
    const key = `${base.toLowerCase()}|${yearLabel(item.year)}`;
    const list = groups.get(key) ?? [];
    list.push({ id: item.id, title: item.title });
    groups.set(key, list);
  }
  const suffixById = new Map<string, string>();
  for (const list of groups.values()) {
    if (list.length <= 1) {
      suffixById.set(list[0]!.id, "");
      continue;
    }
    const ordered = [...list].sort((a, b) =>
      normalizeTitleKey(a.title).localeCompare(normalizeTitleKey(b.title)),
    );
    const letters = "abcdefghijklmnopqrstuvwxyz";
    ordered.forEach((entry, i) => {
      suffixById.set(entry.id, letters[i % 26] ?? "");
    });
  }
  return suffixById;
}

export function orderBibliography<T extends { authors: ResearchAuthor[]; year: number | null; title: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const fa = (a.authors[0]?.family ?? "zzz").toLowerCase();
    const fb = (b.authors[0]?.family ?? "zzz").toLowerCase();
    if (fa !== fb) return fa.localeCompare(fb);
    const ya = a.year ?? 9999;
    const yb = b.year ?? 9999;
    if (ya !== yb) return ya - yb;
    return normalizeTitleKey(a.title).localeCompare(normalizeTitleKey(b.title));
  });
}

export function computeVerificationState(input: {
  doi: string | null;
  title: string;
  authors: ResearchAuthor[];
  year: number | null;
  pdfUrl: string | null;
  disagreement: boolean;
}): VerificationStateValue {
  if (input.disagreement) return "REQUIRES_REVIEW";
  if (!input.title.trim() || input.authors.length === 0 || input.year === null)
    return "INCOMPLETE_METADATA";
  if (input.pdfUrl?.trim()) return "FULL_TEXT_AVAILABLE";
  if (input.doi?.trim()) return "DOI_VERIFIED";
  return "METADATA_VERIFIED";
}

export function normalizeStyle(value: unknown): CitationStyle | null {
  if (value === "APA_7" || value === "APA7" || value === "APA") return "APA_7";
  if (
    value === "HARVARD" ||
    value === "HARVARD_CTR" ||
    value === "HARVARD_CITE_THE_RIGHT"
  )
    return "HARVARD";
  return null;
}

export function makeCitationKey(
  authors: ResearchAuthor[],
  year: number | null,
  sourceId: string,
  projectId: string,
): string {
  const family = (authors[0]?.family ?? "anon")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  const hash = createHash("sha1")
    .update(`${projectId}:${sourceId}`)
    .digest("hex")
    .slice(0, 6);
  return `${family || "anon"}${year ?? "nd"}${hash}`;
}

export function newAnchorId(): string {
  return randomUUID().replace(/-/g, "").slice(0, 16);
}

export function collectCitationAnchors(content: unknown): Set<string> {
  const out = new Set<string>();
  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    const marks = n["marks"];
    if (Array.isArray(marks)) {
      for (const m of marks) {
        if (!m || typeof m !== "object") continue;
        const mm = m as Record<string, unknown>;
        if (mm["type"] === "citation") {
          const attrs = mm["attrs"] as Record<string, unknown> | undefined;
          const anchor =
            attrs?.["anchorId"] ?? attrs?.["anchorid"] ?? attrs?.["anchor_id"];
          if (typeof anchor === "string" && anchor.trim())
            out.add(anchor.trim());
        }
      }
    }
    const children = n["content"];
    if (Array.isArray(children)) for (const c of children) walk(c);
  }
  walk(content);
  return out;
}

type CacheEntry = { expiresAt: number; data: unknown };
type RateState = { stamps: number[] };

const globalStore = globalThis as unknown as {
  __cevoResearchCache?: Map<string, CacheEntry>;
  __cevoResearchRate?: Map<string, RateState>;
};

function cacheMap(): Map<string, CacheEntry> {
  if (!globalStore.__cevoResearchCache)
    globalStore.__cevoResearchCache = new Map();
  return globalStore.__cevoResearchCache;
}

function rateMap(): Map<string, RateState> {
  if (!globalStore.__cevoResearchRate) globalStore.__cevoResearchRate = new Map();
  return globalStore.__cevoResearchRate;
}

export function readResearchCache<T>(key: string): T | null {
  const entry = cacheMap().get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheMap().delete(key);
    return null;
  }
  return entry.data as T;
}

export function writeResearchCache(key: string, data: unknown): void {
  cacheMap().set(key, { expiresAt: Date.now() + RESEARCH_CACHE_TTL_MS, data });
}

export function researchCacheKey(query: string, cursor: string | null): string {
  return `q=${query.trim().toLowerCase()}|c=${cursor ?? ""}`;
}

export function checkResearchCap(
  userId: string,
  kind: "search" | "save",
): { allowed: boolean; retryAfterSeconds: number } {
  const limit = kind === "search" ? 30 : 60;
  const windowMs = 60_000;
  const now = Date.now();
  const map = rateMap();
  const key = `${kind}:${userId}`;
  const state = map.get(key) ?? { stamps: [] };
  const fresh = state.stamps.filter((t) => now - t < windowMs);
  if (fresh.length >= limit) {
    const oldest = fresh[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000),
    );
    map.set(key, { stamps: fresh });
    return { allowed: false, retryAfterSeconds };
  }
  fresh.push(now);
  map.set(key, { stamps: fresh });
  return { allowed: true, retryAfterSeconds: 0 };
}

export function encodeCursor(page: number): string {
  return Buffer.from(JSON.stringify({ page }), "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | null): number {
  if (!cursor) return 1;
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as { page?: number };
    const page = Number(parsed.page);
    return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  } catch {
    return 1;
  }
}

async function fetchWithTimeout(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function openAlexAuthors(work: Record<string, unknown>): ResearchAuthor[] {
  const ships = work["authorships"];
  if (!Array.isArray(ships)) return [];
  const out: ResearchAuthor[] = [];
  for (const s of ships.slice(0, 50)) {
    if (!s || typeof s !== "object") continue;
    const ship = s as Record<string, unknown>;
    const author = ship["author"] as Record<string, unknown> | undefined;
    const display =
      typeof author?.["display_name"] === "string"
        ? author["display_name"]
        : typeof ship["author_name"] === "string"
          ? (ship["author_name"] as string)
          : "";
    if (!display.trim()) continue;
    const parts = display.trim().split(/\s+/);
    const family = parts.length > 1 ? parts[parts.length - 1]! : display.trim();
    const given =
      parts.length > 1 ? parts.slice(0, -1).join(" ") : undefined;
    const institutions = ship["institutions"];
    const affiliation =
      Array.isArray(institutions) && institutions[0]
        ? String(
            (institutions[0] as Record<string, unknown>)["display_name"] ?? "",
          )
        : undefined;
    out.push({ family, given, affiliation: affiliation || undefined });
  }
  return out;
}

function openAlexToHit(work: Record<string, unknown>): ResearchHit {
  const doiRaw =
    typeof work["doi"] === "string" ? work["doi"] : null;
  const doi = doiRaw ? canonicalDoi(doiRaw) : null;
  const openAlexId =
    typeof work["id"] === "string" ? work["id"] : null;
  const title =
    typeof work["title"] === "string" && work["title"].trim()
      ? (work["title"] as string).trim()
      : typeof work["display_name"] === "string"
        ? (work["display_name"] as string).trim()
        : "Untitled";
  const authors = openAlexAuthors(work);
  const year =
    typeof work["publication_year"] === "number" ? work["publication_year"] : null;
  const primary = work["primary_location"] as Record<string, unknown> | null;
  const source = primary?.["source"] as Record<string, unknown> | undefined;
  const venue =
    typeof source?.["display_name"] === "string"
      ? (source["display_name"] as string)
      : null;
  const publisher =
    typeof work["publisher"] === "string" ? (work["publisher"] as string) : null;
  const biblio = work["biblio"] as Record<string, unknown> | undefined;
  const abstract =
    typeof work["abstract"] === "string"
      ? work["abstract"]
      : typeof work["abstract_inverted_index"] === "object" &&
          work["abstract_inverted_index"]
        ? reconstructAbstract(
            work["abstract_inverted_index"] as Record<string, number[]>,
          )
        : null;
  const best = primary?.["landing_page_url"];
  const pdf = primary?.["pdf_url"];
  const oa = work["open_access"] as Record<string, unknown> | undefined;
  const isOpenAccess =
    oa?.["is_oa"] === true || typeof pdf === "string";
  return {
    doi,
    openAlexId,
    title,
    authors,
    year,
    venue,
    volume: typeof biblio?.["volume"] === "string" ? (biblio["volume"] as string) : null,
    issue: typeof biblio?.["issue"] === "string" ? (biblio["issue"] as string) : null,
    pages:
      typeof biblio?.["first_page"] === "string"
        ? `${biblio["first_page"]}${typeof biblio?.["last_page"] === "string" ? `-${biblio["last_page"]}` : ""}`
        : null,
    publisher,
    abstract,
    pdfUrl: typeof pdf === "string" ? pdf : typeof best === "string" ? best : null,
    isOpenAccess: Boolean(isOpenAccess),
    verificationState: computeVerificationState({
      doi,
      title,
      authors,
      year,
      pdfUrl: typeof pdf === "string" ? pdf : null,
      disagreement: false,
    }),
    providerOrigin: "openalex",
    raw: work,
  };
}

function reconstructAbstract(index: Record<string, number[]>): string | null {
  try {
    const entries: [string, number][] = [];
    for (const [word, positions] of Object.entries(index)) {
      for (const p of positions.slice(0, 200)) entries.push([word, p]);
    }
    if (entries.length === 0) return null;
    entries.sort((a, b) => a[1] - b[1]);
    return entries
      .map(([w]) => w)
      .join(" ")
      .slice(0, 4000);
  } catch {
    return null;
  }
}

function crossrefAuthors(item: Record<string, unknown>): ResearchAuthor[] {
  const list = item["author"];
  if (!Array.isArray(list)) return [];
  const out: ResearchAuthor[] = [];
  for (const a of list.slice(0, 50)) {
    if (!a || typeof a !== "object") continue;
    const r = a as Record<string, unknown>;
    const family =
      typeof r["family"] === "string" ? r["family"] : "";
    const given = typeof r["given"] === "string" ? r["given"] : undefined;
    const aff =
      Array.isArray(r["affiliation"]) && r["affiliation"][0]
        ? String(
            ((r["affiliation"][0] as Record<string, unknown>)["name"] ?? ""),
          )
        : undefined;
    if (!family.trim()) continue;
    out.push({ family: family.trim(), given: given?.trim() || undefined, affiliation: aff || undefined });
  }
  return out;
}

function crossrefToHit(item: Record<string, unknown>): ResearchHit {
  const doiRaw = typeof item["DOI"] === "string" ? item["DOI"] : null;
  const doi = doiRaw ? canonicalDoi(doiRaw) : null;
  const titleArr = item["title"];
  const title =
    Array.isArray(titleArr) && typeof titleArr[0] === "string" && titleArr[0].trim()
      ? (titleArr[0] as string).trim()
      : "Untitled";
  const authors = crossrefAuthors(item);
  const issued = item["issued"] as Record<string, unknown> | undefined;
  const parts = issued?.["date-parts"];
  const year =
    Array.isArray(parts) && Array.isArray(parts[0]) && typeof parts[0][0] === "number"
      ? (parts[0][0] as number)
      : typeof item["published-print"] === "object" || typeof item["published-online"] === "object"
        ? null
        : null;
  const container = item["container-title"];
  const venue =
    Array.isArray(container) && typeof container[0] === "string"
      ? (container[0] as string)
      : typeof item["publisher"] === "string"
        ? (item["publisher"] as string)
        : null;
  const linkArr = item["link"];
  let pdfUrl: string | null = null;
  if (Array.isArray(linkArr)) {
    for (const l of linkArr) {
      const lr = l as Record<string, unknown>;
      if (typeof lr["URL"] === "string") {
        pdfUrl = lr["URL"] as string;
        if (lr["content-type"] === "application/pdf") break;
      }
    }
  }
  if (!pdfUrl && typeof item["URL"] === "string") pdfUrl = item["URL"] as string;
  return {
    doi,
    openAlexId: null,
    title,
    authors,
    year,
    venue,
    volume: typeof item["volume"] === "string" ? (item["volume"] as string) : null,
    issue: typeof item["issue"] === "string" ? (item["issue"] as string) : null,
    pages: typeof item["page"] === "string" ? (item["page"] as string) : null,
    publisher: typeof item["publisher"] === "string" ? (item["publisher"] as string) : null,
    abstract: typeof item["abstract"] === "string" ? (item["abstract"] as string).slice(0, 4000) : null,
    pdfUrl,
    isOpenAccess: false,
    verificationState: computeVerificationState({
      doi,
      title,
      authors,
      year,
      pdfUrl: null,
      disagreement: false,
    }),
    providerOrigin: "crossref",
    raw: item,
  };
}

export async function searchOpenAlex(
  query: string,
  page: number,
  doi: string | null,
): Promise<{ hits: ResearchHit[]; hasMore: boolean; failed: boolean }> {
  const mailto = contactEmail();
  try {
    let url: string;
    if (doi) {
      url = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}?mailto=${encodeURIComponent(mailto)}`;
      const res = await fetchWithTimeout(
        url,
        { Accept: "application/json", "User-Agent": `Cevo/1.0 (mailto:${mailto})` },
        RESEARCH_PROVIDER_TIMEOUT_MS,
      );
      if (res.status === 404) {
        const fallback = await searchOpenAlexKeywords(doiFallbackKeywords(doi), 1);
        return { hits: fallback.hits, hasMore: false, failed: false };
      }
      if (!res.ok) return { hits: [], hasMore: false, failed: true };
      const data = (await res.json()) as Record<string, unknown>;
      if (!data["id"]) return { hits: [], hasMore: false, failed: false };
      return { hits: [openAlexToHit(data)], hasMore: false, failed: false };
    }
    url =
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}` +
      `&per-page=${RESEARCH_SEARCH_PAGE_SIZE}&page=${page}` +
      `&mailto=${encodeURIComponent(mailto)}&select=id,doi,title,display_name,publication_year,authorships,primary_location,open_access,biblio,publisher,abstract_inverted_index`;
    const res = await fetchWithTimeout(
      url,
      { Accept: "application/json", "User-Agent": `Cevo/1.0 (mailto:${mailto})` },
      RESEARCH_PROVIDER_TIMEOUT_MS,
    );
    if (!res.ok) return { hits: [], hasMore: false, failed: true };
    const data = (await res.json()) as {
      results?: Record<string, unknown>[];
      meta?: { count?: number; per_page?: number; page?: number };
    };
    const results = Array.isArray(data.results) ? data.results : [];
    const total = data.meta?.count ?? results.length;
    const perPage = data.meta?.per_page ?? RESEARCH_SEARCH_PAGE_SIZE;
    const currentPage = data.meta?.page ?? page;
    return {
      hits: results.map(openAlexToHit),
      hasMore: total > currentPage * perPage,
      failed: false,
    };
  } catch {
    return { hits: [], hasMore: false, failed: true };
  }
}

function doiFallbackKeywords(doi: string): string {
  const tail = doi.split("/").slice(1).join(" ");
  return tail.replace(/[^a-z0-9]+/gi, " ").trim().slice(0, 120) || doi;
}

async function searchOpenAlexKeywords(
  query: string,
  page: number,
): Promise<{ hits: ResearchHit[]; hasMore: boolean; failed: boolean }> {
  return searchOpenAlex(query, page, null);
}

export async function searchCrossref(
  query: string,
  page: number,
  doi: string | null,
): Promise<{ hits: ResearchHit[]; hasMore: boolean; failed: boolean }> {
  const mailto = contactEmail();
  try {
    let url: string;
    if (doi) {
      url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
    } else {
      const offset = (page - 1) * RESEARCH_SEARCH_PAGE_SIZE;
      url =
        `https://api.crossref.org/works?query=${encodeURIComponent(query)}` +
        `&rows=${RESEARCH_SEARCH_PAGE_SIZE}&offset=${offset}&select=DOI,title,author,issued,container-title,publisher,volume,issue,page,link,URL,abstract`;
    }
    const res = await fetchWithTimeout(
      url,
      { Accept: "application/json", "User-Agent": `Cevo/1.0 (mailto:${mailto})` },
      RESEARCH_PROVIDER_TIMEOUT_MS,
    );
    if (res.status === 404) return { hits: [], hasMore: false, failed: false };
    if (!res.ok) return { hits: [], hasMore: false, failed: true };
    const data = (await res.json()) as {
      message?: Record<string, unknown> | Record<string, unknown>[];
      message_type?: string;
    };
    if (doi) {
      const item = data.message as Record<string, unknown>;
      if (!item || typeof item !== "object" || !item["DOI"])
        return { hits: [], hasMore: false, failed: false };
      return { hits: [crossrefToHit(item)], hasMore: false, failed: false };
    }
    const message = data.message as {
      items?: Record<string, unknown>[];
      total_results?: number;
    };
    const items = Array.isArray(message?.items) ? message.items! : [];
    const total = message?.total_results ?? items.length;
    const offset = (page - 1) * RESEARCH_SEARCH_PAGE_SIZE;
    return {
      hits: items.map(crossrefToHit),
      hasMore: total > offset + items.length,
      failed: false,
    };
  } catch {
    return { hits: [], hasMore: false, failed: true };
  }
}

export type ProviderNotice = { provider: string; code: string; message: string };

export function mergeHits(
  openAlex: ResearchHit[],
  crossref: ResearchHit[],
  query: string,
  doi: string | null,
): ResearchHit[] {
  const byKey = new Map<string, ResearchHit>();
  const keyOf = (h: ResearchHit) =>
    h.doi
      ? `doi:${h.doi}`
      : h.openAlexId
        ? `oa:${h.openAlexId}`
        : `t:${normalizeTitleKey(h.title)}|${h.year ?? ""}|${(h.authors[0]?.family ?? "").toLowerCase()}`;
  for (const h of [...openAlex, ...crossref]) {
    const key = keyOf(h);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, h.providerOrigin === "openalex" ? h : h);
      continue;
    }
    const merged: ResearchHit = {
      ...existing,
      venue: existing.venue ?? h.venue,
      volume: existing.volume ?? h.volume,
      issue: existing.issue ?? h.issue,
      pages: existing.pages ?? h.pages,
      publisher: existing.publisher ?? h.publisher,
      abstract: existing.abstract ?? h.abstract,
      pdfUrl: existing.pdfUrl ?? h.pdfUrl,
      isOpenAccess: existing.isOpenAccess || h.isOpenAccess,
      providerOrigin: "merged",
      verificationState: reconcileVerification(existing, h),
      raw: { openalex: existing.raw, crossref: h.raw },
    };
    byKey.set(key, merged);
  }
  const all = [...byKey.values()];
  const qTitle = normalizeTitleKey(query);
  const scored = all.map((h) => {
    let rank = 2;
    if (doi && h.doi === doi) rank = 0;
    else if (normalizeTitleKey(h.title) === qTitle) rank = 1;
    return { h, rank, year: h.year ?? -1 };
  });
  scored.sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return b.year - a.year;
  });
  return scored.slice(0, RESEARCH_MERGED_MAX).map((s) => s.h);
}

function reconcileVerification(a: ResearchHit, b: ResearchHit): VerificationStateValue {
  const doiDisagree =
    !!a.doi && !!b.doi && a.doi !== b.doi ? true : false;
  const yearDisagree =
    a.year !== null && b.year !== null && a.year !== b.year;
  const firstDisagree =
    (a.authors[0]?.family ?? "").toLowerCase() !==
      (b.authors[0]?.family ?? "").toLowerCase() &&
    a.authors.length > 0 &&
    b.authors.length > 0;
  if (doiDisagree || yearDisagree || firstDisagree) return "REQUIRES_REVIEW";
  const doi = a.doi ?? b.doi;
  const pdf = a.pdfUrl ?? b.pdfUrl;
  if (!a.title.trim() || a.authors.length === 0) return "INCOMPLETE_METADATA";
  if (pdf) return "FULL_TEXT_AVAILABLE";
  if (doi) return "DOI_VERIFIED";
  return "METADATA_VERIFIED";
}

export function providerOriginLabel(hit: ResearchHit): string {
  if (hit.providerOrigin === "merged") return "OpenAlex + Crossref";
  if (hit.providerOrigin === "openalex") return "OpenAlex";
  return "Crossref";
}

export async function fetchSourceById(input: {
  doi?: string | null;
  openAlexId?: string | null;
}): Promise<ResearchHit | null> {
  const doi = input.doi ? canonicalDoi(input.doi) : null;
  if (doi) {
    const [oa, cr] = await Promise.all([
      searchOpenAlex("", 1, doi),
      searchCrossref("", 1, doi),
    ]);
    const merged = mergeHits(oa.hits, cr.hits, doi, doi);
    if (merged.length > 0) return merged[0]!;
    return null;
  }
  if (input.openAlexId) {
    const mailto = contactEmail();
    try {
      const id = input.openAlexId.trim();
      const url = id.startsWith("http")
        ? `${id}?mailto=${encodeURIComponent(mailto)}`
        : `https://api.openalex.org/works/${encodeURIComponent(id)}?mailto=${encodeURIComponent(mailto)}`;
      const res = await fetchWithTimeout(
        url,
        { Accept: "application/json", "User-Agent": `Cevo/1.0 (mailto:${mailto})` },
        RESEARCH_PROVIDER_TIMEOUT_MS,
      );
      if (!res.ok) return null;
      const data = (await res.json()) as Record<string, unknown>;
      if (!data["id"]) return null;
      return openAlexToHit(data);
    } catch {
      return null;
    }
  }
  return null;
}
