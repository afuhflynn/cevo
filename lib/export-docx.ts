import { EXPORT_PENDING_NOTE } from "./exports";
import type { ExportSectionInput, ExportCitationInput, ExportTemplateInput } from "./export-html";
import { tiptapToHtml } from "./export-html";

function mmToDxa(mm: number): number {
  return Math.round(mm * 56.7);
}

function ptToHalf(pt: number): number {
  return Math.round(pt * 2);
}

export async function buildDocxBuffer(input: {
  projectTitle: string;
  template: ExportTemplateInput;
  sections: ExportSectionInput[];
  references: ExportCitationInput[];
}): Promise<Buffer> {
  let docx: any;
  try {
    docx = await Function("m", "return import(m)")("docx");
  } catch {
    throw new Error("Word export needs the docx package. Run pnpm add docx then retry.");
  }
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;
  const { template, sections, references } = input;
  const sorted = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const bodySize = ptToHalf(template.fontSizeBodyPt);
  const children: InstanceType<typeof Paragraph>[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: input.projectTitle, bold: true, size: ptToHalf(template.heading1FontPt) })],
    }),
  );
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Table of contents", bold: true, size: ptToHalf(template.heading2FontPt) })],
    }),
  );
  for (const s of sorted) {
    children.push(new Paragraph({ children: [new TextRun({ text: s.title, size: bodySize })] }));
  }

  for (const s of sorted) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: s.title.toUpperCase(), bold: true, size: ptToHalf(template.heading1FontPt) })],
      }),
    );
    const conv = tiptapToHtml(s.content);
    if (!conv.plain.trim()) {
      children.push(new Paragraph({ children: [new TextRun({ text: EXPORT_PENDING_NOTE, italics: true, size: bodySize })] }));
      continue;
    }
    const paras = conv.plain.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean).slice(0, 500);
    for (const p of paras) {
      children.push(new Paragraph({ children: [new TextRun({ text: p.slice(0, 2000), size: bodySize })] }));
    }
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "REFERENCES", bold: true, size: ptToHalf(template.heading1FontPt) })],
    }),
  );
  const refs = [...references].sort((a, b) => a.citationKey.localeCompare(b.citationKey));
  if (refs.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: "No references.", size: bodySize })] }));
  }
  for (const r of refs.slice(0, 1000)) {
    children.push(new Paragraph({ children: [new TextRun({ text: (r.formattedText || r.inlineText).slice(0, 2000), size: bodySize })] }));
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: template.pageSize === "LETTER" ? { width: 12240, height: 15840 } : {},
            margin: {
              top: mmToDxa(template.marginTopMm),
              bottom: mmToDxa(template.marginBottomMm),
              left: mmToDxa(template.marginLeftMm),
              right: mmToDxa(template.marginRightMm),
            },
          },
        },
        children,
      },
    ],
  });
  const out = await Packer.toBuffer(doc);
  return Buffer.from(out);
}
