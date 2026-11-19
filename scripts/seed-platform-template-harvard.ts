import "dotenv/config";
import { db } from "@/lib/prisma";

const TITLE = "Cevo Platform Default (Harvard)";

/**
 * Idempotent by title: adds the Harvard citation-style variant of the
 * platform default. Same structure, margins and prelims as the APA 7
 * default; only the title, description, changelog and citationStyle differ.
 * NOTE: MLA is deliberately NOT seeded — `citationStyle` is enum-locked to
 * APA_7/HARVARD and the deterministic formatter only renders those two.
 */
async function main() {
  const existing = (await db.orm.public.ProjectTemplate.where({
    title: TITLE,
  }).first()) as unknown as { id: string } | null;
  if (existing) {
    console.log("harvard variant already seeded");
    return;
  }
  const template = await db.orm.public.ProjectTemplate.create({
    title: TITLE,
    description:
      "Fallback formatting rules used when no institutional template matches.",
    qualification: "BACHELORS" as never,
    projectType: "RESEARCH_ACADEMIC" as never,
    isOfficial: true,
    isActive: true,
  });
  const version = await db.orm.public.TemplateVersion.create({
    templateId: (template as unknown as { id: string }).id,
    version: 1,
    isPublished: true,
    changelog: "Initial platform default (Harvard citations)",
    publishedAt: new Date(),
  });
  const vid = (version as unknown as { id: string }).id;
  await db.orm.public.TemplateRule.create({
    templateVersionId: vid,
    pageSize: "A4",
    marginTopMm: 25.4,
    marginBottomMm: 25.4,
    marginLeftMm: 38.1,
    marginRightMm: 25.4,
    fontFamily: "Times New Roman",
    fontSizeBodyPt: 12,
    lineSpacing: 1.5,
    paragraphIndentMm: 12.7,
    heading1FontPt: 16,
    heading1Style: "BOLD_UPPERCASE",
    heading2FontPt: 14,
    heading2Style: "BOLD_TITLECASE",
    citationStyle: "HARVARD",
    requirePrelims: {
      titlePage: true,
      abstract: true,
      tableOfContents: true,
    } as unknown as never,
  });
  const sections = [
    { title: "Title Page", type: "PRELIM" },
    { title: "Abstract", type: "PRELIM" },
    { title: "Table of Contents", type: "PRELIM" },
    { title: "Introduction", type: "CHAPTER" },
    { title: "Literature Review", type: "CHAPTER" },
    { title: "Methodology", type: "CHAPTER" },
    { title: "Results and Discussion", type: "CHAPTER" },
    { title: "Conclusion and Recommendations", type: "CHAPTER" },
    { title: "References", type: "POSTLIM" },
  ];
  for (let i = 0; i < sections.length; i += 1) {
    await db.orm.public.TemplateSection.create({
      templateVersionId: vid,
      orderIndex: i,
      title: sections[i]!.title,
      sectionType: sections[i]!.type,
    });
  }
  console.log(
    JSON.stringify({
      templateId: (template as unknown as { id: string }).id,
      versionId: vid,
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
