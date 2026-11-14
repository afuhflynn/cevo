import type { FileCategory } from "./files";

export type PendingUpload = {
  fileId: string;
  projectId: string;
  userId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  s3Key: string;
  category: FileCategory;
  checksumSha256: string | null;
  clientToken: string;
  createdAt: number;
};

const pending = new Map<string, PendingUpload>();
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function savePendingUpload(p: PendingUpload): void {
  prunePending();
  pending.set(p.fileId, p);
}

export function takePendingUpload(fileId: string): PendingUpload | null {
  const p = pending.get(fileId) ?? null;
  if (!p) return null;
  if (Date.now() - p.createdAt > TOKEN_TTL_MS) {
    pending.delete(fileId);
    return null;
  }
  return p;
}

export function dropPendingUpload(fileId: string): void {
  pending.delete(fileId);
}

function prunePending(): void {
  if (pending.size < 500) return;
  const now = Date.now();
  for (const [k, v] of pending) {
    if (now - v.createdAt > TOKEN_TTL_MS) pending.delete(k);
  }
}

type StampState = { stamps: number[] };
const rateMaps = new Map<string, StampState>();

function checkCap(
  key: string,
  limit: number,
): { allowed: boolean; retryAfterSeconds: number } {
  const windowMs = 60_000;
  const now = Date.now();
  const state = rateMaps.get(key) ?? { stamps: [] };
  const fresh = state.stamps.filter((t) => now - t < windowMs);
  if (fresh.length >= limit) {
    const oldest = fresh[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowMs - (now - oldest)) / 1000),
    );
    rateMaps.set(key, { stamps: fresh });
    return { allowed: false, retryAfterSeconds };
  }
  fresh.push(now);
  rateMaps.set(key, { stamps: fresh });
  return { allowed: true, retryAfterSeconds: 0 };
}

export function checkFilesCap(
  userId: string,
  kind: "request" | "complete" | "preview",
): { allowed: boolean; retryAfterSeconds: number } {
  const limit = kind === "preview" ? 60 : 20;
  return checkCap(`files:${kind}:${userId}`, limit);
}
