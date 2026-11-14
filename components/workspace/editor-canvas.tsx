"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableRow } from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { CitationMark } from "./citation-mark";
import { EditorToolbar } from "./editor-toolbar";

type Props = {
  content: unknown;
  editable: boolean;
  onChange: (json: unknown) => void;
  onInsertCitation: () => void;
};

function toDoc(content: unknown) {
  if (content && typeof content === "object" && (content as { type?: string }).type === "doc") {
    return content as Parameters<typeof useEditor>[0] extends never ? never : never;
  }
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function EditorCanvas({ content, editable, onChange, onInsertCitation }: Props) {
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] }, codeBlock: {} }),
        Underline,
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Link.configure({ openOnClick: false, autolink: true }),
        Placeholder.configure({ placeholder: "Start writing this chapter…" }),
        CitationMark,
      ],
      content: (content as Record<string, unknown> | null) ?? undefined,
      editable,
      immediatelyRender: false,
      onUpdate: ({ editor: e }) => {
        onChange(e.getJSON());
      },
    },
    [],
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    const incoming = (content ?? { type: "doc", content: [{ type: "paragraph" }] }) as Record<string, unknown>;
    if (JSON.stringify(current) !== JSON.stringify(incoming)) {
      editor.commands.setContent(incoming as never, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  void toDoc;

  if (!editor) {
    return <div className="cevo-canvas-fallback">Loading editor…</div>;
  }

  return (
    <div className="cevo-canvas-wrap">
      <EditorToolbar editor={editor} onInsertCitation={onInsertCitation} disabled={!editable} />
      <BubbleMenu editor={editor}>
        <div className="cevo-bubble" role="toolbar" aria-label="Selection formatting">
          <button type="button" className="cevo-bubble-ai" title="Open the writing assistant" onClick={() => window.dispatchEvent(new CustomEvent("cevo:open-assistant"))}>✨ Ask AI</button>
          <span className="cevo-tool-sep" />
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive("bold") || undefined} aria-label="Bold"><strong>B</strong></button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} data-active={editor.isActive("italic") || undefined} aria-label="Italic"><em>I</em></button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} data-active={editor.isActive("underline") || undefined} aria-label="Underline"><u>U</u></button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} data-active={editor.isActive("strike") || undefined} aria-label="Strike">S</button>
          <span className="cevo-tool-sep" />
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-label="Heading">H</button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} aria-label="List">☰</button>
          <button type="button" onClick={() => { const url = window.prompt("Link URL"); if (url) editor.chain().focus().setLink({ href: url }).run(); }} aria-label="Link">🔗</button>
          <button type="button" onClick={onInsertCitation} aria-label="Cite">Cite</button>
        </div>
      </BubbleMenu>
      <div className="cevo-canvas-scroll">
        <EditorContent editor={editor} className="cevo-canvas" />
      </div>
    </div>
  );
}
