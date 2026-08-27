import { useMemo, useState } from "react";
import type { ReptileFurnitureKind, ReptileRoomObject } from "../../services/reptileRoomService";

type RoomBuildPanelProps = {
  objects: ReptileRoomObject[];
  selectedId: string | null;
  onAddVivarium: () => void;
  onAddFurniture: (kind: ReptileFurnitureKind, label: string, width: number, depth: number, height: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

type Preset = [ReptileFurnitureKind, string, number, number, number];
type Category = { id: string; label: string; icon: string; items: Preset[] };

const categories: Category[] = [
  { id: "work", label: "Work & Keeper", icon: "🛠️", items: [
    ["workbench", "Workbench", 120, 60, 90],
    ["equipment-station", "Equipment Station", 90, 50, 80],
    ["table", "Table", 100, 60, 75],
    ["chair", "Chair", 45, 45, 85],
  ] },
  { id: "storage", label: "Storage", icon: "📦", items: [
    ["shelving", "Shelving Unit", 90, 40, 180],
    ["storage-cabinet", "Storage Cabinet", 80, 40, 90],
  ] },
  { id: "vivariums", label: "Vivariums", icon: "🏠", items: [] },
  { id: "enrichment", label: "Enrichment & Decor", icon: "🌿", items: [] },
  { id: "equipment", label: "Heating & Equipment", icon: "🌡️", items: [] },
];

export function RoomBuildPanel({ objects, selectedId, onAddVivarium, onAddFurniture, onDelete, onDuplicate }: RoomBuildPanelProps) {
  const [openCategory, setOpenCategory] = useState<string | null>("vivariums");
  const selected = objects.find((item) => item.id === selectedId);
  const counts = useMemo(() => objects.reduce<Record<string, number>>((result, object) => {
    const category = object.assetType === "vivarium" ? "vivariums" : object.kind === "shelving" || object.kind === "storage-cabinet" ? "storage" : "work";
    result[category] = (result[category] ?? 0) + 1;
    return result;
  }, {}), [objects]);

  return (
    <aside aria-label="3D room build controls" style={{ width: 270, maxWidth: "100%", padding: 14, borderRadius: 14, background: "rgba(22,25,29,.96)", border: "1px solid rgba(255,255,255,.12)", boxSizing: "border-box" }}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>🏗️ Build Room</div>
      <div style={{ fontSize: 12, opacity: .7, marginBottom: 12 }}>Choose an asset category, then place true-scale objects into your digital twin.</div>

      {categories.map((category) => {
        const open = openCategory === category.id;
        return (
          <div key={category.id} style={{ marginBottom: 6, border: "1px solid rgba(255,255,255,.08)", borderRadius: 9, overflow: "hidden" }}>
            <button type="button" aria-expanded={open} onClick={() => setOpenCategory(open ? null : category.id)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", border: 0, borderRadius: 0, textAlign: "left" }}>
              <span>{category.icon} {category.label}</span>
              <span style={{ opacity: .6 }}>{counts[category.id] ? `${counts[category.id]} · ` : ""}{open ? "⌃" : "⌄"}</span>
            </button>
            {open && (
              <div style={{ padding: "7px", background: "rgba(255,255,255,.025)" }}>
                {category.id === "vivariums" && <button type="button" onClick={onAddVivarium} style={{ width: "100%", minHeight: 42 }}>＋ Traditional Vivarium<br /><span style={{ opacity: .65, fontSize: 11 }}>90 × 40 × 40 cm</span></button>}
                {category.items.length > 0 ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{category.items.map(([kind, label, width, depth, height]) => <button key={kind} type="button" onClick={() => onAddFurniture(kind, label, width, depth, height)} style={{ fontSize: 11, minHeight: 42 }}>{label}<br /><span style={{ opacity: .6 }}>{width}×{depth}×{height}</span></button>)}</div> : category.id !== "vivariums" && <div style={{ padding: 8, fontSize: 11, opacity: .55 }}>Asset library coming next.</div>}
              </div>
            )}
          </div>
        );
      })}

      {selected && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontWeight: 700 }}>{selected.label}</div>
          <div style={{ fontSize: 12, opacity: .7, margin: "4px 0 10px" }}>{selected.width} × {selected.depth} × {selected.height} cm · X {Math.round(selected.x)} · Z {Math.round(selected.z)}</div>
          <div style={{ display: "flex", gap: 6 }}><button type="button" onClick={onDuplicate}>Duplicate</button><button type="button" onClick={onDelete}>Delete</button></div>
        </div>
      )}
    </aside>
  );
}
