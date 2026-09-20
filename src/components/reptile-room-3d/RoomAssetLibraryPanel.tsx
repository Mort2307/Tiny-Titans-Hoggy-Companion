import { useMemo, useState } from "react";
import { REPTILE_ROOM_ASSET_CATEGORIES } from "../../data/reptileRoomAssetCatalog";
import type { Room3DAssetPreset } from "../../types/reptileRoom3D";
import TinyTitansIcon, { type TinyTitansIconName } from "../TinyTitansIcon";
import "../../styles/room-asset-library-dropdown.css";

type Props = { onAddAsset: (preset: Room3DAssetPreset) => void };\n\nfunction iconForAsset(kind?: string, role?: string): TinyTitansIconName {\n  if (role === "lighting") return "uvb";\n  if (role === "heating") return "heat";\n  if (role === "sensor") return "temperature";\n  if (role === "water" || kind === "water-bowl") return "water";\n  if (kind === "plant") return "plant";\n  if (kind === "hide" || kind === "cork") return "hide";\n  if (kind === "branch") return "substrate";\n  if (kind === "scale") return "weight";\n  if (kind === "vivarium") return "enclosure";\n  return "creator";\n}\n

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
      <span className="rr3d-library-dropdown-title"><span className="rr3d-kicker">KEEPER TOOLKIT</span><strong>Assets & equipment</strong><small>Click here to browse</small></span>
      <span className="rr3d-library-dropdown-meta"><span>{totalAssets}</span><TinyTitansIcon name="habitatBuilder" size={20} motion="hover" /></span>
    </summary>
    <section className="rr3d-library-panel">
      <div className="rr3d-library-heading"><div><span className="rr3d-kicker">ASSET LIBRARY</span><h2>Keeper equipment</h2></div><span className="rr3d-library-count">{totalAssets}</span></div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}><TinyTitansIcon name="search" size={18} /><span className="rr3d-kicker">FILTER</span></div><input className="rr3d-library-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search thermostats, lights, hides…" aria-label="Search room assets" />
      <div className="rr3d-library-categories">
        {filtered.map((category) => {
          const open = openCategory === category.id;
          return <div className="rr3d-library-category" key={category.id}>
            <button type="button" className="rr3d-library-category-button" aria-expanded={open} onClick={() => setOpenCategory(open ? "" : category.id)}><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><TinyTitansIcon name={iconForAsset(undefined, category.id)} size={19} motion="hover" /> {category.label}</span><small>{category.items.length} · {open ? "Hide" : "Show"}</small></button>
            {open && <div className="rr3d-library-items">{category.items.map((preset) => <button type="button" className="rr3d-library-item" key={preset.assetId ?? preset.label} onClick={() => onAddAsset(preset)} title={category.description}>
              <span className="rr3d-library-icon"><TinyTitansIcon name={iconForAsset(preset.kind, preset.intelligenceRole)} size={21} motion="hover" /></span>
              <span className="rr3d-library-copy"><strong>{preset.label}</strong><small>{preset.width} × {preset.depth} × {preset.height} cm{preset.intelligenceRole ? ` · ${preset.intelligenceRole}` : ""}</small></span>
              <span className="rr3d-library-add"><TinyTitansIcon name="add" size={17} motion="hover" /></span>
            </button>)}</div>}
          </div>;
        })}
        {!filtered.length && <div className="rr3d-library-empty">No matching keeper assets.</div>}
      </div>
    </section>
  </details>;
}
