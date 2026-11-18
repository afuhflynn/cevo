import { describe, expect, it } from "vitest";
import {
  buildInlineText,
  buildReference,
  canonicalDoi,
  computeSuffixGroups,
  extractDoiCandidate,
  filterHitsByWorkType,
  isDoiQuery,
  makeCitationKey,
  normalizeWorkType,
  parseWorkTypeParam,
} from "./research";

describe("research doi helpers", () => {
  it("detects DOI in plain and URL forms", () => {
    expect(isDoiQuery("10.1234/abc-def")).toBe(true);
    expect(isDoiQuery("https://doi.org/10.1234/ABC-def.")).toBe(true);
    expect(isDoiQuery("machine learning in classrooms")).toBe(false);
  });
  it("canonicalises DOI", () => {
    expect(canonicalDoi("https://doi.org/10.1234/ABC-DEF.")).toBe("10.1234/abc-def");
    expect(canonicalDoi("DOI: 10.5678/xyz ")).toBe("10.5678/xyz");
  });
  it("extracts DOI candidate", () => {
    expect(extractDoiCandidate("see https://doi.org/10.1234/a1b extra")).toBe("10.1234/a1b");
  });
});

describe("research formatter", () => {
  const authors = [
    { family: "Smith", given: "John" },
    { family: "Doe", given: "Jane A" },
  ];
  it("renders deterministic APA and Harvard strings", () => {
    const apa = buildReference("APA_7", {
      authors,
      year: 2020,
      title: "Learning with machines",
      venue: "Journal of Testing",
      volume: "3",
      issue: "2",
      pages: "10-20",
      publisher: null,
      doi: "10.1234/abc",
      pdfUrl: null,
    });
    expect(apa).toBe(
      "Smith, J., & Doe, J. A. (2020). Learning with machines. Journal of Testing, 3(2), 10-20. https://doi.org/10.1234/abc",
    );
    const harvard = buildReference("HARVARD", {
      authors,
      year: 2020,
      title: "Learning with machines",
      venue: "Journal of Testing",
      volume: "3",
      issue: "2",
      pages: "10-20",
      publisher: null,
      doi: "10.1234/abc",
      pdfUrl: null,
    });
    expect(harvard).toBe(
      "Smith, J. and Doe, J. A. (2020) 'Learning with machines', Journal of Testing, 3(2), 10-20. Available at: https://doi.org/10.1234/abc.",
    );
    expect(buildReference("APA_7", {
      authors, year: 2020, title: "Learning with machines",
      venue: "Journal of Testing", volume: "3", issue: "2", pages: "10-20",
      publisher: null, doi: "10.1234/abc", pdfUrl: null,
    })).toBe(apa);
  });
  it("handles long author lists per style limits", () => {
    const many = Array.from({ length: 25 }, (_, i) => ({ family: `Fam${i}`, given: "G" }));
    const apa = buildReference("APA_7", {
      authors: many, year: 2021, title: "T", venue: null, volume: null,
      issue: null, pages: null, publisher: null, doi: null, pdfUrl: null,
    });
    expect(apa).toContain("et al.");
    expect(buildInlineText("APA_7", many, 2021)).toBe("(Fam0 et al., 2021)");
    expect(buildInlineText("HARVARD", many, 2021)).toBe("(Fam0 et al., 2021)");
    expect(buildInlineText("HARVARD", many.slice(0, 3), 2021)).toBe("(Fam0, Fam1 and Fam2, 2021)");
  });
  it("renders org author and missing year", () => {
    const inline = buildInlineText("APA_7", [{ family: "World Bank" }], null);
    expect(inline).toBe("(World Bank, n.d.)");
    const ref = buildReference("APA_7", {
      authors: [{ family: "World Bank" }], year: null, title: "Report",
      venue: null, volume: null, issue: null, pages: null,
      publisher: "World Bank", doi: null, pdfUrl: null,
    });
    expect(ref).toContain("(n.d.).");
  });
  it("assigns a b c suffixes ordered by title", () => {
    const suffix = computeSuffixGroups([
      { id: "b", authors: [{ family: "Smith", given: "J" }], year: 2020, title: "Zebra", style: "APA_7" },
      { id: "a", authors: [{ family: "Smith", given: "J" }], year: 2020, title: "Apple", style: "APA_7" },
    ]);
    expect(suffix.get("a")).toBe("a");
    expect(suffix.get("b")).toBe("b");
  });
  it("makes stable citation keys", () => {
    const k1 = makeCitationKey([{ family: "Smith" }], 2020, "s1", "p1");
    const k2 = makeCitationKey([{ family: "Smith" }], 2020, "s1", "p1");
    expect(k1).toBe(k2);
    expect(k1.startsWith("smith2020")).toBe(true);
  });
});

describe("research work types", () => {
  it("normalizes OpenAlex types into buckets", () => {
    expect(normalizeWorkType({ type: "article" }, "openalex")).toBe("journal");
    expect(normalizeWorkType({ type: "Review" }, "openalex")).toBe("journal");
    expect(normalizeWorkType({ type: "proceedings-article" }, "openalex")).toBe(
      "proceedings",
    );
    expect(normalizeWorkType({ type: "book" }, "openalex")).toBe("book");
    expect(normalizeWorkType({ type: "book-chapter" }, "openalex")).toBe(
      "book",
    );
    expect(normalizeWorkType({ type: "dataset" }, "openalex")).toBe("dataset");
    expect(normalizeWorkType({ type: "dissertation" }, "openalex")).toBe(
      "dissertation",
    );
    expect(normalizeWorkType({ type: "other" }, "openalex")).toBe("other");
    expect(normalizeWorkType({}, "openalex")).toBe("other");
  });
  it("normalizes Crossref types into buckets", () => {
    expect(normalizeWorkType({ type: "journal-article" }, "crossref")).toBe(
      "journal",
    );
    expect(
      normalizeWorkType({ type: "proceedings-article" }, "crossref"),
    ).toBe("proceedings");
    expect(normalizeWorkType({ type: "book-chapter" }, "crossref")).toBe(
      "book",
    );
    expect(normalizeWorkType({ type: "dataset" }, "crossref")).toBe("dataset");
    expect(normalizeWorkType({ type: "report" }, "crossref")).toBe("other");
  });
  it("prefers the OpenAlex side for merged payloads", () => {
    expect(
      normalizeWorkType(
        {
          openalex: { type: "article" },
          crossref: { type: "proceedings-article" },
        },
        "merged",
      ),
    ).toBe("journal");
    expect(normalizeWorkType({ crossref: { type: "book" } }, "merged")).toBe(
      "book",
    );
    expect(normalizeWorkType({}, "merged")).toBe("other");
  });
  it("parses the type query param", () => {
    expect(parseWorkTypeParam(null)).toBe("all");
    expect(parseWorkTypeParam("")).toBe("all");
    expect(parseWorkTypeParam("journal")).toBe("journal");
    expect(parseWorkTypeParam("Proceedings")).toBe("proceedings");
    expect(parseWorkTypeParam("bogus")).toBe("all");
  });
  it("filters hits by bucket", () => {
    const base = {
      doi: null,
      openAlexId: null,
      title: "T",
      authors: [],
      year: null,
      venue: null,
      volume: null,
      issue: null,
      pages: null,
      publisher: null,
      abstract: null,
      pdfUrl: null,
      isOpenAccess: false,
      verificationState: "METADATA_VERIFIED",
      providerOrigin: "openalex",
      raw: {},
    };
    const hits = [
      { ...base, workType: "journal" },
      { ...base, workType: "proceedings" },
      { ...base, workType: "book" },
    ] as unknown as Parameters<typeof filterHitsByWorkType>[0];
    expect(filterHitsByWorkType(hits, "all")).toHaveLength(3);
    expect(filterHitsByWorkType(hits, "journal").map((h) => h.workType)).toEqual(
      ["journal"],
    );
    expect(filterHitsByWorkType(hits, "other")).toHaveLength(0);
  });
});
