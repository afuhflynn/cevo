import { describe, expect, it } from "vitest";
import { capExtractedText } from "./file-extraction";
import {
  buildS3Key,
  decodeCursor,
  encodeCursor,
  isExtractableMime,
  initialExtractionStatus,
  sanitizeDownloadName,
  slugifyFileName,
  sniffMime,
  validateFileSize,
  validateFileType,
} from "./files";

describe("file type validation", () => {
  it("accepts the exact allowlist", () => {
    expect(validateFileType("application/pdf", "thesis.pdf").ok).toBe(true);
    expect(validateFileType("image/jpeg", "fig.JPG").ok).toBe(true);
    expect(
      validateFileType(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "draft.docx",
      ).ok,
    ).toBe(true);
    expect(validateFileType("text/csv", "data.csv").ok).toBe(true);
    expect(validateFileType("text/plain", "notes.txt").ok).toBe(true);
  });
  it("rejects HEIC, SVG, and mismatched extensions", () => {
    expect(validateFileType("image/heic", "photo.heic").ok).toBe(false);
    expect(validateFileType("image/svg+xml", "fig.svg").ok).toBe(false);
    expect(validateFileType("application/pdf", "thesis.docx").ok).toBe(false);
    expect(validateFileType("application/pdf", "noext").ok).toBe(false);
  });
  it("enforces the 25MB cap", () => {
    expect(validateFileSize(25 * 1024 * 1024).ok).toBe(true);
    expect(validateFileSize(25 * 1024 * 1024 + 1).ok).toBe(false);
    expect(validateFileSize(0).ok).toBe(false);
  });
});

describe("file key building", () => {
  it("builds server-owned keys with slugged names", () => {
    const key = buildS3Key("proj1", "file1", "My Supervisor Notes v2.PDF");
    expect(key).toBe("projects/proj1/file1/my_supervisor_notes_v2_pdf");
    expect(buildS3Key("p", "f", "!!!")).toBe("projects/p/f/file");
  });
  it("sanitizes download names", () => {
    expect(sanitizeDownloadName('a"b\r\nc')).toBe("a_b__c");
  });
});

describe("magic byte sniffing", () => {
  it("recognises PDF and PNG heads", () => {
    expect(sniffMime(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), "application/pdf")).toBe(true);
    expect(
      sniffMime(
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        "image/png",
      ),
    ).toBe(true);
    expect(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), "application/pdf")).toBe(
      false,
    );
  });
  it("passes text through", () => {
    expect(sniffMime(new Uint8Array([1, 2, 3]), "text/plain")).toBe(true);
    expect(sniffMime(new Uint8Array([1, 2, 3]), "text/csv")).toBe(true);
  });
});

describe("extraction status", () => {
  it("skips images, pends documents", () => {
    expect(initialExtractionStatus("image/png")).toBe("SKIPPED");
    expect(initialExtractionStatus("application/pdf")).toBe("PENDING");
    expect(isExtractableMime("image/jpeg")).toBe(false);
    expect(isExtractableMime("text/csv")).toBe(true);
  });
  it("caps extracted text at 100KB with a marker", () => {
    expect(capExtractedText("short")).toBe("short");
    const long = "x".repeat(100 * 1024 + 10);
    const capped = capExtractedText(long);
    expect(capped.endsWith("…[truncated]")).toBe(true);
    expect(capped.length).toBe(100 * 1024 + "…[truncated]".length);
  });
});

describe("cursor codec", () => {
  it("round-trips createdAt plus id", () => {
    const cursor = encodeCursor("2026-11-14T10:00:00.000Z", "abc123");
    expect(decodeCursor(cursor)).toEqual({ createdAt: "2026-11-14T10:00:00.000Z", id: "abc123" });
    expect(decodeCursor("!!!not-base64!!!")).toBeNull();
  });
});
