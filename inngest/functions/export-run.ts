import { inngest } from "@/lib/inngest";

export const runExport = inngest.createFunction(
  {
    id: "export-run",
    retries: 3,
  },
  { event: "export/run" },
  async ({ event, step }) => {
    const { exportId } = event.data as { exportId: string };
    const { db } = await import("@/lib/prisma");
    const { logExportAudit } = await import("@/lib/exports");

    const job = await step.run("load", async () => {
      return db.orm.public.ExportJob.where({ id: exportId }).first();
    });
    if (!job) return { skipped: "no-row" };
    const j = job as unknown as {
      id: string;
      projectId: string;
      format: string;
      status: string;
      attemptCount: number | null;
      templateVersionId: string | null;
    };
    if (j.status === "COMPLETED") return { skipped: "already-complete" };
    if (j.status !== "QUEUED" && j.status !== "PROCESSING") return { skipped: `terminal-${j.status}` };

    await step.run("mark-processing", async () => {
      await db.orm.public.ExportJob.where({ id: exportId }).update({
        status: "PROCESSING",
        errorMessage: null,
      } as never);
    });

    const startedAt = Date.now();
    try {
      const result = await step.run("render-and-store", async () => {
        const { buildExportHtml, defaultTemplate, countWordsPlain } = await import("@/lib/export-html");
        const { renderPdfBuffer } = await import("@/lib/export-pdf");
        const { buildDocxBuffer } = await import("@/lib/export-docx");
        const { putObjectBytes, headObjectSize } = await import("@/lib/storage");
        const {
          EXPORT_MAX_WORDS,
          buildExportS3Key,
          buildExportFileName,
          exportMime,
        } = await import("@/lib/exports");

        const fresh = (await db.orm.public.ExportJob.where({ id: exportId }).first()) as unknown as {
          projectId: string;
          format: string;
          templateVersionId: string | null;
        };
        const project = (await db.orm.public.Project.where({ id: fresh.projectId }).first()) as unknown as {
          id: string;
          title: string;
          templateVersionId: string | null;
          userId: string;
        } | null;
        if (!project) throw new Error("Project no longer exists.");

        const versionId = fresh.templateVersionId ?? project.templateVersionId ?? null;
        let template = defaultTemplate();
        let lockedVersionId: string | null = null;
        if (versionId) {
          const rule = (await db.orm.public.TemplateRule.where({ templateVersionId: versionId }).first()) as unknown as {
            pageSize: string;
            marginTopMm: number;
            marginBottomMm: number;
            marginLeftMm: number;
            marginRightMm: number;
            fontFamily: string;
            fontSizeBodyPt: number;
            lineSpacing: number;
            paragraphIndentMm: number;
            heading1FontPt: number;
            heading2FontPt: number;
            citationStyle: string;
            requirePrelims: unknown;
          } | null;
          if (rule) {
            lockedVersionId = versionId;
            template = {
              pageSize: rule.pageSize,
              marginTopMm: rule.marginTopMm,
              marginBottomMm: rule.marginBottomMm,
              marginLeftMm: rule.marginLeftMm,
              marginRightMm: rule.marginRightMm,
              fontFamily: rule.fontFamily,
              fontSizeBodyPt: rule.fontSizeBodyPt,
              lineSpacing: rule.lineSpacing,
              paragraphIndentMm: rule.paragraphIndentMm,
              heading1FontPt: rule.heading1FontPt,
              heading2FontPt: rule.heading2FontPt,
              citationStyle: rule.citationStyle,
              prelims: Array.isArray((rule.requirePrelims as Record<string, unknown>)?.["order"])
                ? ((rule.requirePrelims as Record<string, unknown>)["order"] as string[])
                : defaultTemplate().prelims,
            };
          }
        }
        if (!lockedVersionId) {
          const { loadPlatformDefault } = await import("@/lib/templates");
          const fallback = await loadPlatformDefault().catch(() => null);
          if (fallback) {
            const rule = (await db.orm.public.TemplateRule.where({
              templateVersionId: fallback.versionId,
            }).first()) as unknown as {
              pageSize: string;
              marginTopMm: number;
              marginBottomMm: number;
              marginLeftMm: number;
              marginRightMm: number;
              fontFamily: string;
              fontSizeBodyPt: number;
              lineSpacing: number;
              paragraphIndentMm: number;
              heading1FontPt: number;
              heading2FontPt: number;
              citationStyle: string;
            } | null;
            if (rule) {
              template = { ...template, ...rule, prelims: template.prelims };
              lockedVersionId = fallback.versionId;
            }
          }
        }
        if (!lockedVersionId) throw new Error("No locked template is available for this export.");

        const sectionRows = (await db.orm.public.ProjectSection.select(
          "id",
          "title",
          "orderIndex",
          "content",
          "isCompleted",
        )
          .where((r) => r.projectId.eq(project.id))
          .orderBy((r) => r.orderIndex.asc())
          .limit(500)
          .all()) as unknown as Array<{
          id: string;
          title: string;
          orderIndex: number;
          content: unknown;
          isCompleted: boolean | null;
        }>;

        const sectionIds = sectionRows.map((s) => s.id);
        let citations: Array<{
          citationKey: string;
          inlineText: string;
          formattedText: string | null;
          sectionId: string;
          hasSource: boolean;
        }> = [];
        if (sectionIds.length > 0) {
          const rows = (await db.orm.public.Citation.select(
            "citationKey",
            "inlineText",
            "formattedText",
            "sectionId",
            "sourceId",
          )
            .where((r) => r.sectionId.in(sectionIds))
            .limit(2000)
            .all()) as unknown as Array<{
            citationKey: string;
            inlineText: string;
            formattedText: string | null;
            sectionId: string;
            sourceId: string | null;
          }>;
          citations = rows.map((c) => ({
            citationKey: c.citationKey,
            inlineText: c.inlineText,
            formattedText: c.formattedText,
            sectionId: c.sectionId,
            hasSource: !!c.sourceId,
          }));
        }

        const wordProbe = sectionRows
          .map((s) => {
            try {
              const { tiptapToHtml } = { tiptapToHtml: null as never };
              void tiptapToHtml;
              return "";
            } catch {
              return "";
            }
          })
          .join(" ");
        void wordProbe;
        const { tiptapToHtml: toPlain } = await import("@/lib/export-html");
        let totalWords = 0;
        for (const s of sectionRows) {
          const conv = toPlain(s.content);
          totalWords += countWordsPlain(conv.plain);
        }
        if (totalWords > EXPORT_MAX_WORDS) throw new Error(`Document is oversize at ${totalWords} words. Limit is ${EXPORT_MAX_WORDS}.`);

        const { html } = buildExportHtml({
          projectTitle: project.title,
          template,
          sections: sectionRows,
          references: citations,
        });

        const format = fresh.format as "PDF" | "DOCX";
        let bytes: Buffer;
        if (format === "DOCX") {
          bytes = await buildDocxBuffer({
            projectTitle: project.title,
            template,
            sections: sectionRows,
            references: citations,
          });
        } else {
          bytes = await renderPdfBuffer(html, template);
        }
        if (Date.now() - startedAt > 10 * 60 * 1000) throw new Error("Export attempt timed out after 10 minutes.");

        const s3Key = buildExportS3Key({
          projectId: project.id,
          jobId: exportId,
          title: project.title,
          format,
        });
        await putObjectBytes(s3Key, bytes, exportMime(format));
        const size = (await headObjectSize(s3Key).catch(() => null)) ?? bytes.length;
        const fileName = buildExportFileName({ title: project.title, jobId: exportId, format });
        void fileName;
        return { s3Key, size };
      });

      await step.run("complete", async () => {
        await db.orm.public.ExportJob.where({ id: exportId }).update({
          status: "COMPLETED",
          s3Key: result.s3Key,
          fileSize: result.size,
          errorMessage: null,
          completedAt: new Date(),
        } as never);
      });
      await logExportAudit({
        userId: null,
        action: "export.complete",
        targetType: "ExportJob",
        targetId: exportId,
        details: { s3Key: result.s3Key, fileSize: result.size },
      });
      return { completed: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Export failed.";
      await db.orm.public.ExportJob.where({ id: exportId }).update({
        status: "FAILED",
        errorMessage: message.slice(0, 500),
      } as never);
      await logExportAudit({
        userId: null,
        action: "export.fail",
        targetType: "ExportJob",
        targetId: exportId,
        details: { error: message.slice(0, 500) },
      });
      throw err;
    }
  },
);

export const functions = [runExport];
