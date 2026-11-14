export const FILE_MAX_BYTES = 25 * 1024 * 1024;
export const FILE_QUOTA_BYTES = 200 * 1024 * 1024;
export const PUT_URL_TTL_SEC = 15 * 60;
export const PREVIEW_URL_TTL_SEC = 5 * 60;
export const CLIENT_TOKEN_WINDOW_MS = 24 * 60 * 60 * 1000;
export const EXTRACT_TIMEOUT_MS = 30 * 60 * 1000;
export const EXTRACT_TEXT_CAP = 100 * 1024;
export const EXTRACT_TRUNC_MARKER = "…[truncated]";
export const LIST_PAGE_SIZE = 20;

export const FILE_ALLOWLIST: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "text/csv": ["csv"],
  "text/plain": ["txt"],
};

export const FILE_CATEGORIES: [
  "GUIDELINE",
  "SUPERVISOR_NOTE",
  "FIGURE",
  "DATASET",
  "LITERATURE",
  "OTHER",
] = [
  "GUIDELINE",
  "SUPERVISOR_NOTE",
  "FIGURE",
  "DATASET",
  "LITERATURE",
  "OTHER",
];

export type FileCategory = (typeof FILE_CATEGORIES)[number];

export type ExtractionStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

const IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);
export const EXTRACTABLE_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "text/plain",
]);

export function isExtractableMime(mime: string): boolean {
  return EXTRACTABLE_MIMES.has(mime);
}

export function initialExtractionStatus(mime: string): ExtractionStatus {
  return IMAGE_MIMES.has(mime) ? "SKIPPED" : "PENDING";
}

export function validateFileType(
  mimeType: string,
  fileName: string,
): { ok: true } | { ok: false; message: string } {
  const exts = FILE_ALLOWLIST[mimeType];
  if (!exts) {
    return {
      ok: false,
      message: `Unsupported file type "${mimeType}". Allowed: PDF, PNG, JPG, WEBP, GIF, DOCX, CSV, TXT.`,
    };
  }
  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : "";
  if (!ext || !exts.includes(ext)) {
    return {
      ok: false,
      message: `File extension ".${ext || "?"}" does not match mime type "${mimeType}". Expected one of: ${exts.join(", ")}.`,
    };
  }
  return { ok: true };
}

export function validateFileSize(
  size: number,
): { ok: true } | { ok: false; message: string } {
  if (!Number.isInteger(size) || size <= 0) {
    return { ok: false, message: "File size must be a positive integer." };
  }
  if (size > FILE_MAX_BYTES) {
    return {
      ok: false,
      message: `File is too large. Maximum is 25MB, received ${(size / 1024 / 1024).toFixed(1)}MB.`,
    };
  }
  return { ok: true };
}

export function slugifyFileName(name: string): string {
  const base = name.trim().toLowerCase().slice(0, 120);
  const slugged =
    base.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "file";
  return slugged.slice(0, 80);
}

export function buildS3Key(
  projectId: string,
  fileId: string,
  fileName: string,
): string {
  return `projects/${projectId}/${fileId}/${slugifyFileName(fileName)}`;
}

const MAGIC_BYTES: Array<{ mime: string; sigs: number[][] }> = [
  { mime: "application/pdf", sigs: [[0x25, 0x50, 0x44, 0x46]] },
  {
    mime: "image/png",
    sigs: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  },
  { mime: "image/jpeg", sigs: [[0xff, 0xd8, 0xff]] },
  { mime: "image/gif", sigs: [[0x47, 0x49, 0x46, 0x38]] },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    sigs: [[0x50, 0x4b, 0x03, 0x04]],
  },
];

function matchesSig(head: Uint8Array, sig: number[]): boolean {
  if (head.length < sig.length) return false;
  return sig.every((b, i) => head[i] === b);
}

export function sniffMime(head: Uint8Array, declaredMime: string): boolean {
  if (declaredMime === "image/webp") {
    if (head.length < 12) return false;
    const riff = [0x52, 0x49, 0x46, 0x46].every((b, i) => head[i] === b);
    const webp = [0x57, 0x45, 0x42, 0x50].every((b, i) => head[8 + i] === b);
    return riff && webp;
  }
  if (declaredMime === "text/csv" || declaredMime === "text/plain") {
    return true;
  }
  const entry = MAGIC_BYTES.find((m) => m.mime === declaredMime);
  if (!entry) return false;
  return entry.sigs.some((sig) => matchesSig(head, sig));
}

export function sanitizeDownloadName(name: string): string {
  return name.replace(/["\\\r\n]/g, "_").slice(0, 120) || "file";
}

export function encodeCursor(createdAt: string, id: string): string {
  return Buffer.from(JSON.stringify({ c: createdAt, i: id })).toString(
    "base64url",
  );
}

export function decodeCursor(
  cursor: string,
): { createdAt: string; id: string } | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const { c, i } = parsed as { c?: unknown; i?: unknown };
    if (typeof c !== "string" || typeof i !== "string") return null;
    return { createdAt: c, id: i };
  } catch {
    return null;
  }
}

export function isTokenStale(createdAt: Date | string): boolean {
  const t =
    createdAt instanceof Date
      ? createdAt.getTime()
      : new Date(createdAt).getTime();
  return Date.now() - t > CLIENT_TOKEN_WINDOW_MS;
}

export function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}
