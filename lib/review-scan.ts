import { db } from "./prisma";
import {
  excerptOf,
  extractReviewParagraphs,
  formattingWarnings,
  missingSectionWarnings,
  pruneReviewRuns,
  REVIEW_MAX_CHARS,
  REVIEW_MAX_SECTIONS,
  REVIEW_MODEL_TIMEOUT_MS,
  resolveGroundTruth,
  runSemanticChecks,
  type StructuralWarning,
  uncitedWarnings,
} from "./review";
import { clientIp, logWorkspaceAudit } from "./workspace";

type SectionRow = {
  id: string;
  title: string;
  version: number;
  content: unknown;
  wordCount: number;
  orderIndex: number;
};

function citationMarksFromContent(content: unknown): {
  anchorId: string;
  sourceId: string | null;
}[] {
  const out: { anchorId: string; sourceId: string | null }[] = [];
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
          const source =
            attrs?.["sourceId"] ?? attrs?.["sourceid"] ?? attrs?.["source_id"];
          if (typeof anchor === "string" && anchor.trim()) {
            out.push({
              anchorId: anchor.trim(),
              sourceId:
                typeof source === "string" && source.trim()
                  ? source.trim()
                  : null,
            });
          }
        }
      }
    }
    const children = n["content"];
    if (Array.isArray(children)) for (const c of children) walk(c);
  }
  walk(content);
  return out;
}

export async function runReviewScan(input: {
  projectId: string;
  userId: string;
  templateVersionId: string | null;
  runId: string;
}): Promise<{
  warnings: StructuralWarning[];
  counts: {
    missing: number;
    uncited: number;
    drift: number;
    formatting: number;
  };
  skippedSemantic: boolean;
  skipReason: string | null;
  truncated: boolean;
  versionId: string | null;
  isFallback: boolean;
}> {
  const maxSections =
    Number.isFinite(REVIEW_MAX_SECTIONS) && REVIEW_MAX_SECTIONS > 0
      ? REVIEW_MAX_SECTIONS
      : 50;
  const maxChars =
    Number.isFinite(REVIEW_MAX_CHARS) && REVIEW_MAX_CHARS > 0
      ? REVIEW_MAX_CHARS
      : 200000;

  const sectionRows = (await db.orm.public.ProjectSection.select(
    "id",
    "title",
    "version",
    "content",
    "wordCount",
    "orderIndex",
  )
    .where((r) => r.projectId.eq(input.projectId))
    .orderBy((r) => r.orderIndex.asc())
    .limit(maxSections + 1)
    .all()) as unknown as SectionRow[];

  const truncated = sectionRows.length > maxSections;
  const sections = sectionRows.slice(0, maxSections);

  const ground = await resolveGroundTruth({
    projectId: input.projectId,
    userId: input.userId,
    templateVersionId: input.templateVersionId,
  });

  let paragraphs = extractReviewParagraphs(sections);
  // Char cap with truncation notice.
  let chars = paragraphs.reduce((sum, p) => sum + p.text.length, 0);
  let charTruncated = false;
  if (chars > maxChars) {
    let kept = 0;
    const next = [];
    for (const p of paragraphs) {
      if (kept + p.text.length > maxChars) {
        charTruncated = true;
        break;
      }
      next.push(p);
      kept += p.text.length;
    }
    paragraphs = next;
    chars = kept;
  }

  const missing = missingSectionWarnings({
    required: ground.requiredSections,
    present: sections.map((s) => ({
      title: s.title,
      wordCount: s.wordCount ?? 0,
    })),
  });

  const projectSources = (await db.orm.public.ProjectSource.select("sourceId")
    .where((r) => r.projectId.eq(input.projectId))
    .limit(500)
    .all()) as unknown as { sourceId: string }[];
  const validSourceIds = new Set(projectSources.map((s) => s.sourceId));

  const allMarks = sections.flatMap((s) => citationMarksFromContent(s.content));

  const uncited = uncitedWarnings({
    paragraphs,
    validSourceIds,
    citationMarks: allMarks,
  });

  const sectionIds = sections.map((s) => s.id);
  let citations: { style: string }[] = [];
  if (sectionIds.length > 0) {
    try {
      citations = (await db.orm.public.Citation.select("style")
        .where((r) => r.sectionId.in(sectionIds as [string, ...string[]]))
        .limit(200)
        .all()) as unknown as { style: string }[];
    } catch {
      citations = [];
    }
  }

  const formatting = formattingWarnings({
    paragraphs,
    sectionTitles: sections.map((s) => s.title),
    citationStyle: ground.citationStyle,
    requirePrelims: ground.requirePrelims,
    citationsInUse: [...new Set(citations.map((c) => c.style))],
  });

  // Semantic pass: drift + model claim signals.
  const semantic = await runSemanticChecks({
    paragraphs,
    objectives: ground.objectives,
    maxChars,
    timeoutMs:
      Number.isFinite(REVIEW_MODEL_TIMEOUT_MS) && REVIEW_MODEL_TIMEOUT_MS > 0
        ? REVIEW_MODEL_TIMEOUT_MS
        : 25000,
  });

  const warnings: StructuralWarning[] = [...missing, ...uncited, ...formatting];
  let skippedSemantic = false;
  let skipReason: string | null = null;

  if (semantic.ok) {
    const objectiveIds = new Set(ground.objectives.map((o) => o.id));
    const paraByKey = new Map(
      paragraphs.map((p) => [`${p.sectionTitle}::${p.blockIndex}`, p]),
    );
    const paraBySectionBlock = new Map(
      paragraphs.map((p) => [`${p.sectionId}::${p.blockIndex}`, p]),
    );
    for (const d of semantic.drift) {
      if (!objectiveIds.has(d.objectiveId)) continue;
      const key = `${d.sectionTitle}::${d.blockIndex}`;
      const para = paraByKey.get(key);
      const objective = ground.objectives.find((o) => o.id === d.objectiveId);
      if (!para || !objective) continue;
      warnings.push({
        checkType: "objective_drift",
        severity: "warn",
        message: `Possible drift from ${objective.id} ("${objective.text.slice(0, 120)}") in "${para.sectionTitle}": ${d.note}`,
        sectionId: para.sectionId,
        blockIndex: para.blockIndex,
        excerpt: excerptOf(para.text),
        sectionVersion: para.sectionVersion,
      });
    }
    for (const c of semantic.claims) {
      const key = `${c.sectionTitle}::${c.blockIndex}`;
      const para = paraByKey.get(key);
      if (!para) continue;
      // Verify the excerpt belongs to the paragraph; drop unknown excerpts.
      const normExcerpt = c.excerpt.replace(/\s+/g, " ").trim().slice(0, 120);
      const normPara = para.text.replace(/\s+/g, " ").trim();
      if (
        normExcerpt.length > 10 &&
        !normPara.includes(
          normExcerpt.slice(0, Math.min(60, normExcerpt.length)),
        )
      ) {
        continue;
      }
      if (para.hasCitation) continue;
      warnings.push({
        checkType: "uncited",
        severity: "warn",
        message: `Model flagged a claim needing a citation in "${para.sectionTitle}": ${c.reason}`,
        sectionId: para.sectionId,
        blockIndex: para.blockIndex,
        excerpt: excerptOf(para.text),
        sectionVersion: para.sectionVersion,
      });
    }
    void paraBySectionBlock;
  } else {
    skippedSemantic = true;
    skipReason = semantic.reason;
  }

  const counts = {
    missing: warnings.filter(
      (w) => w.checkType === "missing_section" && w.severity === "warn",
    ).length,
    uncited: warnings.filter(
      (w) => w.checkType === "uncited" && w.severity === "warn",
    ).length,
    drift: warnings.filter(
      (w) => w.checkType === "objective_drift" && w.severity === "warn",
    ).length,
    formatting: warnings.filter(
      (w) => w.checkType === "formatting" && w.severity === "warn",
    ).length,
  };

  await db.orm.public.ReviewRun.where({ id: input.runId }).update({
    status: "done",
    missingCount: counts.missing,
    uncitedCount: counts.uncited,
    driftCount: counts.drift,
    formattingCount: counts.formatting,
    skippedSemantic,
    skipReason: skipReason ?? undefined,
    truncated: truncated || charTruncated,
    templateVersionId: ground.versionId ?? undefined,
  });

  for (const w of warnings.slice(0, 300)) {
    await db.orm.public.ReviewWarning.create({
      runId: input.runId,
      checkType: w.checkType,
      severity: w.severity,
      message: w.message.slice(0, 2000),
      sectionId: w.sectionId ?? undefined,
      blockIndex: w.blockIndex ?? undefined,
      excerpt: w.excerpt?.slice(0, 500) ?? undefined,
      sectionVersion: w.sectionVersion ?? undefined,
    });
  }

  await pruneReviewRuns(input.projectId).catch(() => undefined);
  await logWorkspaceAudit({
    userId: input.userId,
    action: "review.run",
    targetType: "ReviewRun",
    targetId: input.runId,
    details: { projectId: input.projectId, ...counts, skippedSemantic },
    ipAddress: await clientIp(),
  }).catch(() => undefined);

  return {
    warnings,
    counts,
    skippedSemantic,
    skipReason,
    truncated: truncated || charTruncated,
    versionId: ground.versionId,
    isFallback: ground.isFallback,
  };
}
