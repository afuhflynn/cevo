export async function sendExtractionEvent(input: {
  fileId: string;
  projectId: string;
}): Promise<boolean> {
  const eventKey = process.env["INNGEST_EVENT_KEY"];
  if (!eventKey || eventKey === "local-dev-event-key") {
    await markNeedsExtraction(input.fileId).catch(() => undefined);
    return false;
  }
  try {
    const { Inngest } = await import("inngest");
    const inngest = new Inngest({ id: "cevo", eventKey });
    await inngest.send({ name: "file/extract.requested", data: input });
    return true;
  } catch {
    await markNeedsExtraction(input.fileId).catch(() => undefined);
    return false;
  }
}

async function markNeedsExtraction(_fileId: string): Promise<void> {
  return;
}
