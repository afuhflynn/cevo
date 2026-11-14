import { EXPORT_ORPHAN_WARNING, EXPORT_PENDING_NOTE } from "./exports";

export type ExportSectionInput = {
  id: string;
  title: string;
  orderIndex: number;
  content: unknown;
  isCompleted?: boolean | null;
};

export type ExportCitationInput = {
  citationKey: string;
  inlineText: string;
  formattedText: string | null;
  sectionId: string;
  hasSource: boolean;
};

export type ExportTemplateInput = {
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
  prelims: string[];
};

export function defaultTemplate(): ExportTemplateInput {
  return {
    pageSize: "A4",
    marginTopMm: 25.4,
    marginBottomMm: 25.4,
    marginLeftMm: 38.1,
    marginRightMm: 25.4,
    fontFamily: "Times New Roman",
    fontSizeBodyPt: 12,
    lineSpacing: 1.5,
    paragraphIndentMm: 12.7,
    heading1FontPt: 16,
    heading2FontPt: 14,
    citationStyle: "APA_7",
    prelims: ["title", "abstract", "toc"],
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textOf(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;
  if (typeof n["text"] === "string") return n["text"] as string;
  const c = n["content"];
  if (Array.isArray(c)) return c.map(textOf).join("");
  return "";
}

function inlineToHtml(node: unknown, orphans: number): { html: string; orphans: number } {
  if (!node || typeof node !== "object") return { html: "", orphans };
  const n = node as Record<string, unknown>;
  if (n["type"] === "text") {
    const raw = typeof n["text"] === "string" ? (n["text"] as string) : "";
    const marks = Array.isArray(n["marks"]) ? (n["marks"] as Array<Record<string, unknown>>) : [];
    const cite = marks.find((m) => m["type"] === "citation");
    let out = escapeHtml(raw);
    if (cite) {
      const attrs = (cite["attrs"] ?? {}) as Record<string, unknown>;
      const hasSource = typeof attrs["sourceId"] === "string" && String(attrs["sourceId"]).length > 0;
      if (!hasSource) {
        orphans += 1;
        out = `<span class="orphan">${out}</span>`;
      } else {
        out = `<span class="cite">${out}</span>`;
      }
    }
    if (marks.some((m) => m["type"] === "bold")) out = `<strong>${out}</strong>`;
    if (marks.some((m) => m["type"] === "italic")) out = `<em>${out}</em>`;
    if (marks.some((m) => m["type"] === "underline")) out = `<u>${out}</u>`;
    return { html: out, orphans };
  }
  if (typeof n["text"] === "string") return { html: escapeHtml(n["text"] as string), orphans };
  const c = n["content"];
  if (Array.isArray(c)) {
    let html = "";
    let o = orphans;
    for (const child of c) {
      const r = inlineToHtml(child, o);
      html += r.html;
      o = r.orphans;
    }
    return { html, orphans: o };
  }
  return { html: "", orphans };
}

function blockToHtml(node: unknown, orphans: number): { html: string; orphans: number } {
  if (!node || typeof node !== "object") return { html: "", orphans };
  const n = node as Record<string, unknown>;
  const type = String(n["type"] ?? "");
  const content = Array.isArray(n["content"]) ? (n["content"] as unknown[]) : [];
  if (type === "paragraph") {
    let inner = "";
    let o = orphans;
    for (const c of content) {
      const r = inlineToHtml(c, o);
      inner += r.html;
      o = r.orphans;
    }
    if (!inner.trim()) return { html: "", orphans: o };
    return { html: `<p>${inner}</p>`, orphans: o };
  }
  if (type === "heading") {
    const attrs = (n["attrs"] ?? {}) as Record<string, unknown>;
    const level = Math.min(3, Math.max(1, Number(attrs["level"] ?? 1)));
    let inner = "";
    let o = orphans;
    for (const c of content) {
      const r = inlineToHtml(c, o);
      inner += r.html;
      o = r.orphans;
    }
    return { html: `<h${level}>${inner}</h${level}>`, orphans: o };
  }
  if (type === "bulletList" || type === "orderedList") {
    const tag = type === "bulletList" ? "ul" : "ol";
    let items = "";
    let o = orphans;
    for (const item of content) {
      const r = blockToHtml(item, o);
      o = r.orphans;
      items += r.html.replace(/^<p>(.*)<\/p>$/, "$1");
    }
    return { html: `<${tag}>${items}</${tag}>`, orphans: o };
  }
  if (type === "listItem") {
    let inner = "";
    let o = orphans;
    for (const c of content) {
      const r = blockToHtml(c, o);
      inner += r.html;
      o = r.orphans;
    }
    return { html: `<li>${inner}</li>`, orphans: o };
  }
  if (type === "blockquote") {
    let inner = "";
    let o = orphans;
    for (const c of content) {
      const r = blockToHtml(c, o);
      inner += r.html;
      o = r.orphans;
    }
    return { html: `<blockquote>${inner}</blockquote>`, orphans: o };
  }
  if (type === "image") {
    const attrs = (n["attrs"] ?? {}) as Record<string, unknown>;
    const src = typeof attrs["src"] === "string" ? (attrs["src"] as string) : "";
    const alt = typeof attrs["alt"] === "string" ? (attrs["alt"] as string) : "figure";
    if (!src) return { html: "", orphans };
    return { html: `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" />`, orphans };
  }
  if (type === "table") {
    let rows = "";
    let o = orphans;
    for (const c of content) {
      const r = blockToHtml(c, o);
      rows += r.html;
      o = r.orphans;
    }
    return { html: `<table>${rows}</table>`, orphans: o };
  }
  if (type === "tableRow") {
    let cells = "";
    let o = orphans;
    for (const c of content) {
      const r = blockToHtml(c, o);
      cells += r.html;
      o = r.orphans;
    }
    return { html: `<tr>${cells}</tr>`, orphans: o };
  }
  if (type === "tableCell" || type === "tableHeader") {
    const tag = type === "tableHeader" ? "th" : "td";
    let inner = "";
    let o = orphans;
    for (const c of content) {
      const r = blockToHtml(c, o);
      inner += r.html;
      o = r.orphans;
    }
    return { html: `<${tag}>${inner}</${tag}>`, orphans: o };
  }
  // Unknown nodes degrade to plain paragraphs and are logged by the caller.
  const fallback = textOf(node).trim();
  if (!fallback) return { html: "", orphans };
  return { html: `<p>${escapeHtml(fallback)}</p>`, orphans };
}

export function tiptapToHtml(content: unknown): { html: string; orphans: number; plain: string } {
  if (!content || typeof content !== "object") return { html: "", orphans: 0, plain: "" };
  const doc = content as Record<string, unknown>;
  const blocks = Array.isArray(doc["content"]) ? (doc["content"] as unknown[]) : [];
  let html = "";
  let orphans = 0;
  for (const b of blocks) {
    const r = blockToHtml(b, orphans);
    html += r.html;
    orphans = r.orphans;
  }
  return { html, orphans, plain: textOf(content) };
}

export function countWordsPlain(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return text.trim() ? words.length : 0;
}

export function buildExportHtml(input: {
  projectTitle: string;
  studentName?: string | null;
  template: ExportTemplateInput;
  sections: ExportSectionInput[];
  references: ExportCitationInput[];
}): { html: string; orphans: number; emptyChapters: string[] } {
  const t = input.template;
  const sorted = [...input.sections].sort((a, b) => a.orderIndex - b.orderIndex);
  let orphans = 0;
  const emptyChapters: string[] = [];
  let chapters = "";
  for (const s of sorted) {
    const conv = tiptapToHtml(s.content);
    orphans += conv.orphans;
    if (!conv.plain.trim()) {
      emptyChapters.push(s.title);
      chapters += `<section class="chapter"><h1>${escapeHtml(s.title)}</h1><p class="pending">${escapeHtml(EXPORT_PENDING_NOTE)}</p></section>`;
      continue;
    }
    chapters += `<section class="chapter"><h1>${escapeHtml(s.title)}</h1>${conv.html}</section>`;
  }
  const refs = [...input.references].sort((a, b) => a.citationKey.localeCompare(b.citationKey));
  const refItems = refs
    .map((r) => `<p class="ref">${escapeHtml(r.formattedText || r.inlineText)}</p>`)
    .join("");
  const orphanNote = orphans > 0 ? `<p class="warn">${escapeHtml(EXPORT_ORPHAN_WARNING)}</p>` : "";
  const toc = sorted.map((s) => `<li>${escapeHtml(s.title)}</li>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8" /><style>
@page { size: ${escapeHtml(t.pageSize)}; margin: ${t.marginTopMm}mm ${t.marginRightMm}mm ${t.marginBottomMm}mm ${t.marginLeftMm}mm; @bottom-center { content: counter(page); font-size: 10pt; } }
body { font-family: '${escapeHtml(t.fontFamily)}', serif; font-size: ${t.fontSizeBodyPt}pt; line-height: ${t.lineSpacing}; }
p { text-indent: ${t.paragraphIndentMm}mm; margin: 0 0 8pt 0; }
h1 { font-size: ${t.heading1FontPt}pt; text-transform: uppercase; page-break-before: always; }
h1:first-of-type { page-break-before: avoid; }
h2 { font-size: ${t.heading2FontPt}pt; }
.pending { border: 1px solid #999; padding: 8pt; text-indent: 0; }
.warn { border: 1px solid #999; padding: 8pt; text-indent: 0; }
.ref { text-indent: 0; padding-left: 12pt; }
table { border-collapse: collapse; width: 100%; }
td, th { border: 1px solid #333; padding: 4pt; text-indent: 0; }
img { max-width: 100%; height: auto; }
header.top { text-align: center; margin-bottom: 24pt; }
</style></head><body>
<header class="top"><h1>${escapeHtml(input.projectTitle)}</h1>${input.studentName ? `<p>${escapeHtml(input.studentName)}</p>` : ""}</header>
<section class="toc"><h1>Table of contents</h1><ol>${toc}</ol></section>
${chapters}
<section class="refs"><h1>References</h1>${orphanNote}${refItems || "<p>No references.</p>"}</section>
</body></html>`;
  return { html, orphans, emptyChapters };
}
