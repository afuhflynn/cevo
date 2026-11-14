declare module "mammoth" {
  export function extractRawText(
    input: { buffer: Buffer } | { path: string },
  ): Promise<{
    value: string;
    messages: Array<{ type: string; message: string }>;
  }>;
  export function convertToHtml(
    input: { buffer: Buffer } | { path: string },
    options?: unknown,
  ): Promise<{
    value: string;
    messages: Array<{ type: string; message: string }>;
  }>;
}
