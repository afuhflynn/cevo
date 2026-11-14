import { Mark, mergeAttributes } from "@tiptap/core";

export type CitationAttrs = {
  sourceId?: string | null;
  freeText?: string | null;
  anchorId?: string | null;
};

declare module "@tiptap/core" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Commands<ReturnType> {
    // citation mark commands registered at runtime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    citation: any;
  }
}

export const CitationMark = Mark.create({
  name: "citation",
  inclusive: false,
  addAttributes() {
    return {
      sourceId: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-source-id"), renderHTML: (attrs: Record<string, unknown>) => (attrs["sourceId"] ? { "data-source-id": attrs["sourceId"] as string } : {}) },
      freeText: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-free-text"), renderHTML: (attrs: Record<string, unknown>) => (attrs["freeText"] ? { "data-free-text": attrs["freeText"] as string } : {}) },
      anchorId: { default: null, parseHTML: (el: HTMLElement) => el.getAttribute("data-anchor-id"), renderHTML: (attrs: Record<string, unknown>) => (attrs["anchorId"] ? { "data-anchor-id": attrs["anchorId"] as string } : {}) },
    };
  },
  parseHTML() {
    return [{ tag: "cite[data-citation]" }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    const free = (HTMLAttributes["freeText"] as string | null) ?? "";
    const label = free ? free.slice(0, 40) : "Source";
    return ["cite", mergeAttributes(HTMLAttributes, { "data-citation": "true", class: "cevo-citation" }), `(${label})`];
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addCommands(): any {
    return {
      setCitation:
        (attrs: CitationAttrs) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: any) =>
          commands.setMark(this.name, attrs as unknown as Record<string, unknown>),
      unsetCitation:
        () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ commands }: any) =>
          commands.unsetMark(this.name),
    };
  },
});
