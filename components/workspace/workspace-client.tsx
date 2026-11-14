"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { countWordsFromTiptap, extractHeadings, type WorkspaceTreeNode } from "@/lib/workspace-shared";
import { clearDraft, enqueueOp, readDraft, readQueue, removeOpsFor, writeDraft } from "@/lib/workspace-draft";
import { AssistantTab } from "./assistant-tab";
import { DocumentTree } from "./document-tree";
import { EditorCanvas } from "./editor-canvas";
import { ConflictBanner, InspectorRail, type SaveState } from "./workspace-panels";

type SectionPayload = {
  id: string;
  title: string;
  content: unknown;
  version: number;
  wordCount: number;
  isCompleted: boolean;
  parentId: string | null;
  orderIndex: number;
  updatedAt: string;
};

function findNode(tree: WorkspaceTreeNode[], id: string): WorkspaceTreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    const child = n.children.find((c) => c.id === id);
    if (child) return child;
    for (const c of n.children) {
      const deep = findNode([c], id);
      if (deep) return deep;
    }
  }
  return null;
}

export function WorkspaceClient({ projectId, initialReadOnly }: { projectId: string; initialReadOnly?: boolean }) {
  const [tree, setTree] = useState<WorkspaceTreeNode[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [section, setSection] = useState<SectionPayload | null>(null);
  const [draft, setDraft] = useState<unknown>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [conflict, setConflict] = useState<{ currentVersion: number; updatedAt: string } | null>(null);
  const [loadingTree, setLoadingTree] = useState(true);
  const [loadingSection, setLoadingSection] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [readOnly, setReadOnly] = useState(!!initialReadOnly);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightTab, setRightTab] = useState<"inspector" | "assistant">("inspector");
  const versionRef = useRef(1);
  const sectionIdRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTree = useCallback(async () => {
    setLoadingTree(true);
    setTreeError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/workspace/tree`, { cache: "no-store" });
      if (res.status === 403) { setTreeError("You do not have access to this project."); return; }
      if (!res.ok) throw new Error("tree failed");
      const data = await res.json();
      setTree(data.sections ?? []);
      if (data.readOnly) setReadOnly(true);
      if (!activeId) {
        const first = (data.sections as WorkspaceTreeNode[])[0];
        const firstLeaf = first?.children?.[0] ?? first;
        if (firstLeaf) setActiveId(firstLeaf.id);
      }
    } catch {
      setTreeError("Could not load chapters.");
    } finally {
      setLoadingTree(false);
    }
  }, [projectId, activeId]);

  useEffect(() => { loadTree(); }, [loadTree]);

  const loadSection = useCallback(async (id: string) => {
    setLoadingSection(true);
    setConflict(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${id}`, { cache: "no-store" });
      if (res.status === 403) { setTreeError("You do not have access to this project."); return; }
      if (!res.ok) throw new Error("section failed");
      const data = await res.json();
      const s = data.section as SectionPayload;
      setSection(s);
      versionRef.current = s.version;
      sectionIdRef.current = s.id;
      if (data.readOnly) setReadOnly(true);
      const mirror = readDraft(s.id);
      if (mirror && JSON.stringify(mirror.content) !== JSON.stringify(s.content)) {
        setDraft(mirror.content);
      } else {
        setDraft(s.content);
      }
      setSaveState("saved");
    } catch {
      const mirror = activeId ? readDraft(activeId) : null;
      if (mirror) {
        setDraft(mirror.content);
        setSaveState("offline");
      }
    } finally {
      setLoadingSection(false);
    }
  }, [projectId, activeId]);

  useEffect(() => {
    if (activeId) loadSection(activeId);
  }, [activeId, loadSection]);

  const liveWords = useMemo(() => countWordsFromTiptap(draft), [draft]);
  const headings = useMemo(() => extractHeadings(draft), [draft]);

  const persist = useCallback(async (sectionId: string, content: unknown, version: number, force = false) => {
    if (!navigator.onLine && !force) {
      enqueueOp({ sectionId, content, version, queuedAt: Date.now() });
      setSaveState("offline");
      return;
    }
    setSaveState("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/sections/${sectionId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, version }),
      });
      if (res.status === 409) {
        const data = await res.json();
        setConflict({ currentVersion: data.currentVersion, updatedAt: data.updatedAt });
        setSaveState("error");
        return;
      }
      if (!res.ok) throw new Error("save failed");
      const data = await res.json();
      versionRef.current = data.section.version;
      setSection((s) => (s ? { ...s, version: data.section.version, wordCount: data.section.wordCount } : s));
      clearDraft(sectionId);
      removeOpsFor(sectionId);
      setConflict(null);
      setSaveState("saved");
      loadTree();
    } catch {
      if (!navigator.onLine) {
        enqueueOp({ sectionId, content, version, queuedAt: Date.now() });
        setSaveState("offline");
      } else {
        setSaveState("error");
      }
    }
  }, [projectId, loadTree]);

  const onChange = useCallback((json: unknown) => {
    if (!sectionIdRef.current || readOnly) return;
    const sid = sectionIdRef.current;
    setDraft(json);
    writeDraft(sid, { content: json, version: versionRef.current, updatedAt: new Date().toISOString() });
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveState("saving");
    timerRef.current = setTimeout(() => {
      persist(sid, json, versionRef.current);
    }, 800);
  }, [persist, readOnly]);

  const replayQueue = useCallback(async () => {
    const queue = readQueue();
    for (const op of queue) {
      await persist(op.sectionId, op.content, versionRef.current, true);
    }
  }, [persist]);

  useEffect(() => {
    const onOnline = () => replayQueue();
    window.addEventListener("online", onOnline);
    const onFocus = () => {
      if (sectionIdRef.current) {
        const mirror = readDraft(sectionIdRef.current);
        if (mirror) setDraft(mirror.content);
      }
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
    };
  }, [replayQueue]);

  useEffect(() => {
    const openAssistant = () => {
      setRightOpen(true);
      setRightTab("assistant");
    };
    window.addEventListener("cevo:open-assistant", openAssistant);
    return () => window.removeEventListener("cevo:open-assistant", openAssistant);
  }, []);

  const getScopeText = useCallback(() => {
    const selection = window.getSelection()?.toString().trim() ?? "";
    if (selection.length > 0) return { scope: "selection" as const, text: selection.slice(0, 12000) };
    const texts: string[] = [];
    function walk(node: unknown) {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      if (typeof n["text"] === "string") {
        texts.push(n["text"] as string);
        return;
      }
      const content = n["content"];
      if (Array.isArray(content)) {
        const before = texts.length;
        for (const c of content) walk(c);
        if ((n["type"] === "paragraph" || n["type"] === "heading") && texts.length > before) {
          texts.push("\n\n");
        }
      }
    }
    walk(draft);
    const text = texts.join("").replace(/\n{3,}/g, "\n\n").trim().slice(0, 12000);
    return { scope: "chapter" as const, text };
  }, [draft]);

  const handleAssistantApplied = useCallback((content: unknown, version: number, wordCount: number) => {
    versionRef.current = version;
    setSection((s) => (s ? { ...s, content, version, wordCount } : s));
    setDraft(content);
    if (sectionIdRef.current) {
      writeDraft(sectionIdRef.current, { content, version, updatedAt: new Date().toISOString() });
    }
    setConflict(null);
    setSaveState("saved");
    loadTree();
  }, [loadTree]);

  const insertCitation = useCallback(() => {
    const text = window.prompt("Citation note or source id (max 500 chars)", "");
    if (text === null) return;
    const value = text.slice(0, 500);
    if (!value.trim()) return;
    setDraft((prev: unknown) => {
      const doc = (prev ?? { type: "doc", content: [{ type: "paragraph" }] }) as Record<string, unknown>;
      const content = Array.isArray(doc["content"]) ? [...(doc["content"] as unknown[])] : [];
      content.push({ type: "paragraph", content: [{ type: "text", marks: [{ type: "citation", attrs: { freeText: value } }], text: `(${value.slice(0, 40)})` }] });
      const next = { ...doc, content };
      if (sectionIdRef.current) {
        writeDraft(sectionIdRef.current, { content: next, version: versionRef.current, updatedAt: new Date().toISOString() });
      }
      return next;
    });
    if (sectionIdRef.current && draft) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        persist(sectionIdRef.current!, draft, versionRef.current);
      }, 800);
    }
  }, [draft, persist]);

  async function treeOp(path: string, method: string, body?: unknown) {
    const res = await fetch(path, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data.error as string) || "Request failed");
    }
    return res.json();
  }

  const handleAdd = async (parentId: string | null) => {
    try {
      const data = await treeOp(`/api/projects/${projectId}/sections`, "POST", { title: "Untitled chapter", parentId });
      await loadTree();
      setActiveId(data.section.id);
    } catch { alert("Could not create chapter."); }
  };

  const handleRename = async (id: string, title: string) => {
    try {
      await treeOp(`/api/projects/${projectId}/sections/${id}`, "PATCH", { title });
      loadTree();
    } catch { alert("Rename failed."); }
  };

  const handleDelete = async (id: string) => {
    const node = findNode(tree, id);
    const count = node ? node.descendantCount : 0;
    const ok = window.confirm(count > 0 ? `Delete this chapter and its ${count} subchapter${count === 1 ? "" : "s"}?` : "Delete this chapter?");
    if (!ok) return;
    try {
      await treeOp(`/api/projects/${projectId}/sections/${id}`, "DELETE");
      if (activeId === id) setActiveId(null);
      loadTree();
    } catch { alert("Delete failed."); }
  };

  const handleToggle = async (id: string, done: boolean) => {
    try {
      await treeOp(`/api/projects/${projectId}/sections/${id}`, "PATCH", { isCompleted: done });
      loadTree();
    } catch { /* noop */ }
  };

  const handleMove = async (id: string, dir: -1 | 1) => {
    const flat: { id: string; parentId: string | null; orderIndex: number }[] = [];
    function collect(nodes: WorkspaceTreeNode[]) {
      for (const n of [...nodes].sort((a, b) => a.orderIndex - b.orderIndex)) {
        flat.push({ id: n.id, parentId: n.parentId, orderIndex: n.orderIndex });
        collect(n.children);
      }
    }
    collect(tree);
    const current = flat.find((f) => f.id === id);
    if (!current) return;
    const siblings = flat.filter((f) => f.parentId === current.parentId).sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = siblings.findIndex((s) => s.id === id);
    const next = idx + dir;
    if (next < 0 || next >= siblings.length) return;
    try {
      await treeOp(`/api/projects/${projectId}/sections/${id}`, "PATCH", { orderIndex: next });
      loadTree();
    } catch { alert("Reorder failed."); }
  };

  return (
    <div className="cevo-workspace">
      <div className="cevo-workspace-bar">
        <button type="button" onClick={() => setLeftOpen((v) => !v)} aria-label="Toggle chapters">☰ Chapters</button>
        <button type="button" onClick={() => setRightOpen((v) => !v)} aria-label="Toggle inspector">Inspector</button>
        <InspectorMini saveState={saveState} words={section?.wordCount ?? liveWords} />
        <button type="button" onClick={() => activeId && loadSection(activeId)}>Retry</button>
      </div>
      {conflict && (
        <ConflictBanner
          onKeepMine={async () => {
            if (!sectionIdRef.current || !draft) return;
            const res = await fetch(`/api/projects/${projectId}/sections/${sectionIdRef.current}`, { cache: "no-store" });
            const data = await res.json();
            versionRef.current = data.section.version;
            await persist(sectionIdRef.current, draft, data.section.version, true);
          }}
          onLoadTheirs={async () => {
            if (!sectionIdRef.current) return;
            const res = await fetch(`/api/projects/${projectId}/sections/${sectionIdRef.current}`, { cache: "no-store" });
            const data = await res.json();
            setSection(data.section);
            setDraft(data.section.content);
            versionRef.current = data.section.version;
            clearDraft(sectionIdRef.current);
            setConflict(null);
            setSaveState("saved");
          }}
        />
      )}
      <div className="cevo-workspace-grid">
        {leftOpen && (
          <nav className="cevo-rail-left" aria-label="Chapters">
            {loadingTree ? (
              <p className="cevo-muted">Loading chapters…</p>
            ) : treeError ? (
              <p>{treeError} <button type="button" onClick={loadTree}>Retry</button></p>
            ) : (
              <DocumentTree tree={tree} activeId={activeId} onSelect={setActiveId} onAdd={handleAdd} onRename={handleRename} onDelete={handleDelete} onToggle={handleToggle} onMove={handleMove} disabled={readOnly} />
            )}
          </nav>
        )}
        <main className="cevo-rail-center">
          {loadingSection ? (
            <p className="cevo-muted">Loading chapter…</p>
          ) : !activeId ? (
            <div className="cevo-empty">
              <h2>No chapter open</h2>
              <p>Select a chapter on the left, or create one to begin writing.</p>
              {!readOnly && <button type="button" onClick={() => handleAdd(null)}>Create chapter</button>}
            </div>
          ) : draft ? (
            <EditorCanvas content={draft} editable={!readOnly} onChange={onChange} onInsertCitation={insertCitation} />
          ) : (
            <p className="cevo-muted">Preparing canvas…</p>
          )}
        </main>
        {rightOpen && (
          <div className="cevo-rail-right">
            <div className="cevo-rail-tabs" role="tablist" aria-label="Inspector tabs">
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === "inspector"}
                onClick={() => setRightTab("inspector")}
              >
                Inspector
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rightTab === "assistant"}
                onClick={() => setRightTab("assistant")}
              >
                Assistant
              </button>
            </div>
            {rightTab === "inspector" ? (
              <InspectorRail headings={headings} liveWords={liveWords} storedWords={section?.wordCount ?? 0} saveState={saveState} onJump={() => { document.querySelector(".cevo-canvas-scroll")?.scrollBy({ top: 200, behavior: "smooth" }); }} />
            ) : (
              <AssistantTab
                projectId={projectId}
                sectionId={activeId}
                sectionVersion={section?.version ?? versionRef.current}
                getScopeText={getScopeText}
                onApplied={handleAssistantApplied}
                readOnly={readOnly}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InspectorMini({ saveState, words }: { saveState: SaveState; words: number }) {
  return (
    <span className="cevo-mini" aria-live="polite">
      {saveState === "saved" ? `Saved · ${words}w` : saveState === "saving" ? "Saving…" : saveState === "offline" ? "Offline" : "Error"}
    </span>
  );
}
