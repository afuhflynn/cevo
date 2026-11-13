"use client";

import { useState } from "react";
import type { WorkspaceTreeNode } from "@/lib/workspace-shared";

type Props = {
  tree: WorkspaceTreeNode[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, done: boolean) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  disabled?: boolean;
};

function Row({ node, depth, activeId, onSelect, onAdd, onRename, onDelete, onToggle, onMove, disabled }: Props & { node: WorkspaceTreeNode; depth: number }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(node.title);
  const [collapsed, setCollapsed] = useState(false);
  const hasKids = node.children.length > 0;
  return (
    <li>
      <div className={`cevo-tree-row${activeId === node.id ? " is-active" : ""}`} style={{ paddingLeft: 8 + depth * 14 }}>
        {hasKids ? (
          <button type="button" className="cevo-tree-chevron" onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? `Expand ${node.title}` : `Collapse ${node.title}`}>
            {collapsed ? "›" : "⌄"}
          </button>
        ) : (
          <span className="cevo-tree-dash">—</span>
        )}
        <input
          type="checkbox"
          checked={node.isCompleted}
          disabled={disabled}
          onChange={(e) => onToggle(node.id, e.target.checked)}
          aria-label={`Mark ${node.title} complete`}
        />
        {editing ? (
          <input
            value={value}
            disabled={disabled}
            maxLength={200}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              setEditing(false);
              if (value.trim() && value.trim() !== node.title) onRename(node.id, value.trim().slice(0, 200));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") { setValue(node.title); setEditing(false); }
            }}
            aria-label="Chapter title"
            className="cevo-tree-input"
          />
        ) : (
          <button type="button" className="cevo-tree-title" onClick={() => onSelect(node.id)} title={node.title}>
            <span className="cevo-tree-name">{node.title}</span>
            <span className="cevo-tree-count">{node.wordCount}w</span>
          </button>
        )}
        <span className="cevo-tree-actions">
          <button type="button" title="Rename" disabled={disabled} onClick={() => { setValue(node.title); setEditing(true); }} aria-label={`Rename ${node.title}`}>✎</button>
          {depth === 0 && <button type="button" title="Add subchapter" disabled={disabled} onClick={() => onAdd(node.id)} aria-label={`Add subchapter to ${node.title}`}>＋</button>}
          <button type="button" title="Move up" disabled={disabled} onClick={() => onMove(node.id, -1)} aria-label="Move up">↑</button>
          <button type="button" title="Move down" disabled={disabled} onClick={() => onMove(node.id, 1)} aria-label="Move down">↓</button>
          <button type="button" title="Delete" disabled={disabled} onClick={() => onDelete(node.id)} aria-label={`Delete ${node.title}`}>🗑</button>
        </span>
      </div>
      {hasKids && !collapsed && (
        <ul>
          {node.children.map((c) => (
            <Row key={c.id} node={c} depth={depth + 1} tree={[]} activeId={activeId} onSelect={onSelect} onAdd={onAdd} onRename={onRename} onDelete={onDelete} onToggle={onToggle} onMove={onMove} disabled={disabled} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function DocumentTree(props: Props) {
  return (
    <div className="cevo-tree">
      <div className="cevo-tree-head">
        <span>Chapters</span>
        <button type="button" onClick={() => props.onAdd(null)} disabled={props.disabled} className="cevo-tree-add">＋ Add chapter</button>
      </div>
      {props.tree.length === 0 ? (
        <div className="cevo-tree-empty">
          <p>No chapters yet.</p>
          <p className="cevo-muted">Create your first chapter to begin drafting.</p>
        </div>
      ) : (
        <ul>
          {props.tree.map((n) => (
            <Row key={n.id} node={n} depth={0} {...props} />
          ))}
        </ul>
      )}
    </div>
  );
}
