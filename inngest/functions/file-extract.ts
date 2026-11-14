import { inngest } from "@/lib/inngest";

export const extractFile = inngest.createFunction(
  {
    id: "file-extract",
    retries: 3,
  },
  { event: "file/extract.requested" },
  async ({ event, step }) => {
    const { fileId } = event.data as { fileId: string; projectId: string };
    const { db } = await import("@/lib/prisma");
    const { getObjectBytes } = await import("@/lib/storage");
    const { extractTextFromBytes } = await import("@/lib/file-extraction");

    const row = await step.run("load", async () => {
      return db.orm.public.FileAsset.where({ id: fileId }).first();
    });
    if (!row) return { skipped: "no-row" };
    if (row.extractionStatus === "COMPLETED")
      return { skipped: "already-complete" };

    const started = await step.run("mark-processing", async () => {
      const fresh = await db.orm.public.FileAsset.where({ id: fileId }).first();
      if (!fresh || fresh.extractionStatus === "COMPLETED") return null;
      await db.orm.public.FileAsset.where({ id: fileId }).update({
        extractionStatus: "PROCESSING",
        extractionError: null,
      } as never);
      return fresh;
    });
    if (!started) return { skipped: "already-complete" };

    if (Date.now() - new Date(started.createdAt).getTime() > 30 * 60 * 1000) {
      await db.orm.public.FileAsset.where({ id: fileId }).update({
        extractionStatus: "FAILED",
        extractionError: "Extraction timed out after 30 minutes.",
      } as never);
      return { failed: "timeout" };
    }

    try {
      const text = await step.run("fetch-and-parse", async () => {
        const bytes = await getObjectBytes(started.s3Key);
        if (!bytes) throw new Error("Could not read file bytes from storage.");
        return extractTextFromBytes(started.mimeType, bytes);
      });
      await step.run("store", async () => {
        await db.orm.public.FileAsset.where({ id: fileId }).update({
          extractedText: text,
          isProcessed: true,
          extractionStatus: "COMPLETED",
          extractionError: null,
        } as never);
      });
      return { completed: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed.";
      await db.orm.public.FileAsset.where({ id: fileId }).update({
        extractionStatus: "FAILED",
        extractionError: message.slice(0, 500),
      } as never);
      throw err;
    }
  },
);

export const functions = [extractFile];
