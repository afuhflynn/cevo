export default function Loading() {
  return (
    <div className="cevo-workspace-grid" aria-busy="true">
      <div className="cevo-rail-left"><p className="cevo-muted">Loading chapters…</p></div>
      <div className="cevo-rail-center"><p className="cevo-muted">Loading canvas…</p></div>
      <div className="cevo-rail-right"><p className="cevo-muted">Loading inspector…</p></div>
    </div>
  );
}
