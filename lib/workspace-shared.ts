export type WorkspaceTreeNode = {
  id: string;
  parentId: string | null;
  orderIndex: number;
  title: string;
  isCompleted: boolean;
  wordCount: number;
  children: WorkspaceTreeNode[];
  descendantCount: number;
};

export function slugifyTitle(title: string): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || "untitled-chapter";
}

export function countWordsFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0] === "") return 0;
  return words.length;
}

function textFromTiptapNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (typeof n["text"] === "string") return n["text"] as string;
  const content = n["content"];
  if (Array.isArray(content)) {
    return content.map(textFromTiptapNode).join(" ");
  }
  return "";
}

export function countWordsFromTiptap(content: unknown): number {
  if (!content) return 0;
  const text = textFromTiptapNode(content);
  return countWordsFromText(text);
}

export function extractHeadings(content: unknown): { level: number; text: string }[] {
  const out: { level: number; text: string }[] = [];
  function walk(node: unknown) {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n["type"] === "heading" && typeof n["attrs"] === "object" && n["attrs"] !== null) {
      const level = Number((n["attrs"] as Record<string, unknown>)["level"] ?? 1);
      const text = textFromTiptapNode(n).trim();
      if (text) out.push({ level: Math.min(3, Math.max(1, level)), text });
    }
    const children = n["content"];
    if (Array.isArray(children)) {
      for (const c of children) walk(c);
    }
  }
  walk(content);
  return out.slice(0, 100);
}

export function buildTree(
  rows: { id: string; parentId: string | null; orderIndex: number; title: string; isCompleted: boolean; wordCount: number }[],
): WorkspaceTreeNode[] {
  const byId = new Map<string, WorkspaceTreeNode>();
  for (const r of rows) {
    byId.set(r.id, {
      id: r.id,
      parentId: r.parentId,
      orderIndex: r.orderIndex,
      title: r.title,
      isCompleted: r.isCompleted,
      wordCount: r.wordCount,
      children: [],
      descendantCount: 0,
    });
  }
  const roots: WorkspaceTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  function sortAndCount(node: WorkspaceTreeNode): number {
    node.children.sort((a, b) => a.orderIndex - b.orderIndex);
    let count = 0;
    for (const child of node.children) {
      count += 1 + sortAndCount(child);
    }
    node.descendantCount = count;
    return count;
  }
  roots.sort((a, b) => a.orderIndex - b.orderIndex);
  for (const r of roots) sortAndCount(r);
  return roots;
}
