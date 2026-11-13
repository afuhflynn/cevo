# Rationale: 0007 document workspace

## Context

Students finishing the project briefing hold an approved outline with a provisioned chapter tree, but they have no place to write the report itself. The workspace is the surface they will spend most of their time in, so it must feel steady and familiar: a tree on the left for navigation, a calm page in the center for writing, and a slim rail on the right for orientation. Four reference screens guided the shape: a docs style three rail layout with a top toolbar, a docs style left tree plus right outline pattern, a plain settings nav used only for nav styling cues, and a floating bubble menu that appears over selected text.

Several forces shape the choice. The schema already provides ProjectSection with a JSON content column, a parent link for one level of nesting, ordering, word counts, versioning, and a DocumentVersion table for snapshots, so the design should build on that foundation rather than invent new storage. The verified research feature arrives in a later slice, so citations must exist as placeholders now without blocking that later work. The Tiptap component library is source copied code rather than a package, its only open template is the simple editor, its fancier template needs paid cloud services, and its docs warn that React 19 support is still in progress while this project runs React 19 with Next.js 16. The theme setup uses OKLCH tokens with a class based dark variant, so any borrowed styling must be remapped to those tokens instead of keeping its neutral defaults. Autosave is load bearing for trust: students must believe every keystroke is safe even when the network drops.


## Options considered

### Option 1: Copy simple editor source and restyle to theme tokens

Copy the MIT simple editor template into the project codebase, remap its style variables to the project OKLCH tokens, ship a slim fixed toolbar plus a small bubble menu, stub image upload until the storage slice, and extend later with owned custom commands and marks.

**Pros**:
- Full ownership of every file, so custom citation marks and future AI menu items need no upstream permission
- Closest fit to the approved stack with the least new infrastructure

**Cons**:
- React 19 support is officially still in progress, so version pinning plus focused regression testing is required
- Style remapping is manual work that must be checked in both themes

### Option 2: Install Tiptap packages only and hand build all UI

Use the headless editor packages with zero borrowed UI and build every toolbar, menu, and node view from scratch on project primitives.

**Pros**:
- Zero borrowed styling to remap and zero version caveats from the component kit

**Cons**:
- Rebuilds a tested toolbar, bubble menu, link popover, and search panel by hand, which is slow and risks a weaker result

### Option 3: Adopt the fancier template with slash menu now

Start from the richer template with slash menu, floating toolbar, and AI menu for a more modern feel from day one.

**Pros**:
- Most polished out of the gate for discovery and insertion flows

**Cons**:
- Needs paid cloud services with tokens and an upload endpoint, which this project does not run, and it pulls collaboration machinery the scope defers


## Rationale

The schema already stores section content as JSON with versioning and snapshots, so the design extends that foundation instead of adding storage. The simple editor is the only template free of paid services, and source ownership gives the project the exact extension point it needs for custom citation marks and later assistant actions. The fancier template would force cloud accounts and live sync machinery that the scope explicitly defers. The React 19 caveat is real but bounded: pin, test, and record, rather than rebuild an entire toolbar to dodge it.

