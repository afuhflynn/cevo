import type { ExportTemplateInput } from "./export-html";

export async function renderPdfBuffer(html: string, template: ExportTemplateInput): Promise<Buffer> {
  try {
    const chromium: any = await Function("m", "return import(m)")("@sparticuz/chromium");
    const puppeteer: any = await Function("m", "return import(m)")("puppeteer-core");
    const realChromium = chromium.default ?? chromium;
    const realPuppeteer = puppeteer.default ?? puppeteer;
    const executablePath = await realChromium.executablePath();
    const browser = await realPuppeteer.launch({
      args: [...realChromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
      executablePath,
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });
      await page.emulateMediaType("print");
      const pdf = await page.pdf({
        format: template.pageSize === "LETTER" ? "Letter" : "A4",
        printBackground: true,
        margin: {
          top: `${template.marginTopMm}mm`,
          bottom: `${template.marginBottomMm}mm`,
          left: `${template.marginLeftMm}mm`,
          right: `${template.marginRightMm}mm`,
        },
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate:
          '<div style="width:100%;text-align:center;font-size:10pt;"><span class="pageNumber"></span></div>',
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close().catch(() => undefined);
    }
  } catch {
    return minimalPdfBuffer("Export preview. Full Chromium render unavailable in this runtime.");
  }
}

function minimalPdfBuffer(note: string): Buffer {
  const safe = note.replace(/[()\\]/g, " ");
  const content = `BT /F1 12 Tf 72 720 Td (${safe.slice(0, 120)}) Tj ET`;
  const parts: string[] = [];
  parts.push("%PDF-1.4\n");
  const offsets: number[] = [];
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pos = parts[0].length;
  objs.forEach((body, i) => {
    offsets[i] = pos;
    const chunk = `${i + 1} 0 obj\n${body}\nendobj\n`;
    parts.push(chunk);
    pos += chunk.length;
  });
  const xrefPos = pos;
  parts.push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`);
  for (const off of offsets) {
    parts.push(`${String(off).padStart(10, "0")} 00000 n \n`);
  }
  parts.push(
    `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`,
  );
  return Buffer.from(parts.join(""), "utf8");
}
