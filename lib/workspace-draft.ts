"use client";

export type DraftMirror = {
  content: unknown;
  version: number;
  updatedAt: string;
};

const PREFIX = "cevo:draft:";
const EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

export function draftKey(sectionId: string): string {
  return `${PREFIX}${sectionId}`;
}

export function readDraft(sectionId: string): DraftMirror | null {
  try {
    const raw = localStorage.getItem(draftKey(sectionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftMirror & { savedAt?: number };
    const savedAt = (parsed as { savedAt?: number }).savedAt ?? Date.parse(parsed.updatedAt);
    if (Number.isFinite(savedAt) && Date.now() - savedAt > EXPIRY_MS) {
      localStorage.removeItem(draftKey(sectionId));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft(sectionId: string, draft: DraftMirror): void {
  try {
    localStorage.setItem(
      draftKey(sectionId),
      JSON.stringify({ ...draft, savedAt: Date.now() }),
    );
  } catch {
    /* storage full or unavailable */
  }
}

export function clearDraft(sectionId: string): void {
  try {
    localStorage.removeItem(draftKey(sectionId));
  } catch {
    /* noop */
  }
}

export type QueuedOp = {
  sectionId: string;
  content: unknown;
  version: number;
  queuedAt: number;
};

const QUEUE_KEY = "cevo:offline-queue";
const QUEUE_CAP = 50;

export function readQueue(): QueuedOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedOp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function enqueueOp(op: QueuedOp): QueuedOp[] {
  const queue = readQueue().filter((q) => q.sectionId !== op.sectionId);
  queue.push(op);
  const trimmed = queue.slice(-QUEUE_CAP);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  } catch {
    /* noop */
  }
  return trimmed;
}

export function removeOpsFor(sectionId: string): void {
  const queue = readQueue().filter((q) => q.sectionId !== sectionId);
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* noop */
  }
}
