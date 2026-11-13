"use client";

import type { Editor } from "@tiptap/react";

type Props = {
  editor: Editor;
  disabled?: boolean;
  onInsertCitation: () => void;
};

function Btn({ label, title, active, onClick, disabled }: { label: string; title: string; active?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active ? true : undefined}
      data-active={active ? true : undefined}
      disabled={disabled}
      onClick={onClick}
      className="cevo-tool-btn"
    >
      {label}
    </button>
  );
}

export function EditorToolbar({ editor, disabled, onInsertCitation }: Props) {
  return (
    <div className="cevo-toolbar" role="toolbar" aria-label="Formatting toolbar">
      <Btn label="↶" title="Undo" disabled={disabled} onClick={() => editor.chain().focus().undo().run()} />
      <Btn label="↷" title="Redo" disabled={disabled} onClick={() => editor.chain().focus().redo().run()} />
      <span className="cevo-tool-sep" />
      <Btn label="H1" title="Heading 1" active={editor.isActive("heading", { level: 1 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
      <Btn label="H2" title="Heading 2" active={editor.isActive("heading", { level: 2 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <Btn label="H3" title="Heading 3" active={editor.isActive("heading", { level: 3 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
      <Btn label="¶" title="Paragraph" active={editor.isActive("paragraph")} disabled={disabled} onClick={() => editor.chain().focus().setParagraph().run()} />
      <span className="cevo-tool-sep" />
      <Btn label="B" title="Bold" active={editor.isActive("bold")} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Btn label="I" title="Italic" active={editor.isActive("italic")} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Btn label="U" title="Underline" active={editor.isActive("underline")} disabled={disabled} onClick={() => editor.chain().focus().toggleUnderline().run()} />
      <Btn label="S" title="Strike" active={editor.isActive("strike")} disabled={disabled} onClick={() => editor.chain().focus().toggleStrike().run()} />
      <span className="cevo-tool-sep" />
      <Btn label="≡L" title="Align left" active={editor.isActive({ textAlign: "left" })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("left").run()} />
      <Btn label="≡C" title="Align center" active={editor.isActive({ textAlign: "center" })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("center").run()} />
      <Btn label="≡R" title="Align right" active={editor.isActive({ textAlign: "right" })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("right").run()} />
      <Btn label="≡J" title="Justify" active={editor.isActive({ textAlign: "justify" })} disabled={disabled} onClick={() => editor.chain().focus().setTextAlign("justify").run()} />
      <span className="cevo-tool-sep" />
      <Btn label="• List" title="Bullet list" active={editor.isActive("bulletList")} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <Btn label="1. List" title="Ordered list" active={editor.isActive("orderedList")} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <Btn label="☑" title="Task list" active={editor.isActive("taskList")} disabled={disabled} onClick={() => editor.chain().focus().toggleTaskList().run()} />
      <span className="cevo-tool-sep" />
      <Btn label="❝" title="Blockquote" active={editor.isActive("blockquote")} disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <Btn label="<>" title="Inline code" active={editor.isActive("code")} disabled={disabled} onClick={() => editor.chain().focus().toggleCode().run()} />
      <Btn label="{ }" title="Code block" active={editor.isActive("codeBlock")} disabled={disabled} onClick={() => editor.chain().focus().toggleCodeBlock().run()} />
      <span className="cevo-tool-sep" />
      <Btn label="Link" title="Link" active={editor.isActive("link")} disabled={disabled} onClick={() => { const url = window.prompt("Link URL"); if (url) editor.chain().focus().setLink({ href: url }).run(); else editor.chain().focus().unsetLink().run(); }} />
      <Btn label="Table" title="Insert table (max 10 by 50)" disabled={disabled} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
      <Btn label="Cite" title="Insert citation" disabled={disabled} onClick={onInsertCitation} />
    </div>
  );
}
