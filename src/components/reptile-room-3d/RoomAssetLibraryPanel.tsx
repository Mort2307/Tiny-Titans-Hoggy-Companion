import { useMemo, useState } from "react";
import { REPTILE_ROOM_ASSET_CATEGORIES } from "../../data/reptileRoomAssetCatalog";
import type { Room3DAssetPreset } from "../../types/reptileRoom3D";

type Props = { onAddAsset: (preset: Room3DAssetPreset) => void };

export function RoomAssetLibraryPanel({ onAddAsset }: Props) {
  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState("vivariums");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return REPTILE_ROOM_ASSET_CATEGORIES;
    return REPTILE_ROOM_ASSET_CATEGORIES
      .map((category) => ({ ...category, items: category.items.filter((item) => `${item.label} ${item.assetId ?? ""} ${item.intelligenceRole ?? ""}`.toLowerCase().includes(needle)) }))
      .filter((category) => category.items.length > 0);
  }, [query]);
  const totalAssets = filtered.reduce((sum, category) => sum + category.items.length, 0);

  return <details className="rr3d-library-dropdown">
    <summary className="rr3d-library-dropdown-summary">
      <span className="rr3d-library-dropdown-title"><span className="rr3d-kicker">KEEPER TOOLKIT</span><strong>Assets & equipment</strong></span>
      <span className="rr3d-library-dropdown-meta"><span>{totalAssets}</span><span aria-hidden="true">⌄</span></span>
    </summary>
    <section className="rr3d-library-panel">
      <div className="rr3d-library-heading"><div><span className="rr3d-kicker">ASSET LIBRARY</span><h2>Keeper equipment</h2></div><span className="rr3d-library-count">{totalAssets}</span></div>
      <input className="rr3d-library-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search thermostats, lights, hides…" aria-label="Search room assets" />
      <div className="rr3d-library-categories">
        {filtered.map((category) => {
          const open = openCategory === category.id;
          return <div className="rr3d-library-category" key={category.id}>
            <button type="button" className="rr3d-library-category-button" aria-expanded={open} onClick={() => setOpenCategory(open ? "" : category.id)}><span>{category.icon} {category.label}</span><small>{category.items.length} · {open ? "Hide" : "Show"}</small></button>
            {open && <div className="rr3d-library-items">{category.items.map((preset) => <button type="button" className="rr3d-library-item" key={preset.assetId ?? preset.label} onClick={() => onAddAsset(preset)} title={category.description}>
              <span className="rr3d-library-icon">{preset.icon ?? "◈"}</span>
              <span className="rr3d-library-copy"><strong>{preset.label}</strong><small>{preset.width} × {preset.depth} × {preset.height} cm{preset.intelligenceRole ? ` · ${preset.intelligenceRole}` : ""}</small></span>
              <span className="rr3d-library-add">+</span>
            </button>)}</div>}
          </div>;
        })}
        {!filtered.length && <div className="rr3d-library-empty">No matching keeper assets.</div>}
      </div>
    </section>
  </details>;
}
