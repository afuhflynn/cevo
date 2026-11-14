import { extractRawText } from "mammoth";
import { PDFParse } from "pdf-parse";
import { EXTRACT_TEXT_CAP, EXTRACT_TRUNC_MARKER } from "./files";

export function capExtractedText(text: string): string {
  if (text.length <= EXTRACT_TEXT_CAP) return text;
  return `${text.slice(0, EXTRACT_TEXT_CAP)}${EXTRACT_TRUNC_MARKER}`;
}

export async function extractTextFromBytes(
  mimeType: string,
  bytes: Uint8Array,
): Promise<string> {
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: Buffer.from(bytes) });
    const out = await parser.getText();
    return capExtractedText((out.text ?? "").trim());
  }
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const out = await extractRawText({ buffer: Buffer.from(bytes) });
    return capExtractedText((out.value ?? "").trim());
  }
  if (mimeType === "text/csv") {
    const text = Buffer.from(bytes).toString("utf8");
    const lines = text.split(/\r?\n/);
    const head = lines.slice(0, 200);
    const body = head
      .map((line) =>
        line
          .split(",")
          .map((c) => c.trim())
          .join(" | "),
      )
      .join("\n");
    return capExtractedText(body.trim());
  }
  const text = Buffer.from(bytes).toString("utf8");
  return capExtractedText(text.trim());
}
