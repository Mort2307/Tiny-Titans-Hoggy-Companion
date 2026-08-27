import { useMemo, useState } from "react";
import type { ReptileRoomObject } from "../../services/reptileRoomService";
import type { Room3DAssetPreset } from "../../types/reptileRoom3D";

type RoomBuildPanelProps = {
  objects: ReptileRoomObject[];
  selectedId: string | null;
  onDelete: () => void;
  onDuplicate: () => void;
  onSpawn?: (preset: Room3DAssetPreset) => void;
};

type Preset = [string, string, number, number, number];
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
    ["rack", "Rack", 100, 55, 180],
  ] },
  { id: "vivariums", label: "Vivariums", icon: "🏠", items: [] },
  { id: "enrichment", label: "Enrichment & Decor", icon: "🌿", items: [] },
  { id: "equipment", label: "Heating & Equipment", icon: "🌡️", items: [] },
];

export function RoomBuildPanel({ objects, selectedId, onDelete, onDuplicate, onSpawn }: RoomBuildPanelProps) {
  const [openCategory, setOpenCategory] = useState<string | null>("vivariums");
  const [minimized, setMinimized] = useState(false);
  const selected = objects.find((item) => item.id === selectedId);
  const counts = useMemo(() => objects.reduce<Record<string, number>>((result, object) => {
    const category = object.assetType === "vivarium" ? "vivariums" : object.kind === "shelving" || object.kind === "storage-cabinet" || object.kind === "rack" ? "storage" : "work";
    result[category] = (result[category] ?? 0) + 1;
    return result;
  }, {}), [objects]);

  const buttonProps = { onPointerDown: (event: React.PointerEvent) => event.stopPropagation() };
  const spawn = (preset: Preset) => onSpawn?.({ kind: preset[0] as Room3DAssetPreset["kind"], label: preset[1], icon: "", width: preset[2], depth: preset[3], height: preset[4] });

  return (
    <aside aria-label="3D room build controls" style={{ width: 270, maxWidth: "100%", padding: 14, borderRadius: 14, background: "rgba(22,25,29,.96)", border: "1px solid rgba(255,255,255,.12)", boxSizing: "border-box", pointerEvents: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: minimized ? 0 : 4 }}>
        <div style={{ fontWeight: 800 }}>🏗️ Build Room</div>
        <button type="button" aria-label={minimized ? "Expand room builder" : "Minimize room builder"} title={minimized ? "Expand" : "Minimize"} onClick={() => setMinimized((value) => !value)} style={{ width: 30, height: 30, padding: 0, display: "grid", placeItems: "center", fontSize: 18, lineHeight: 1 }} {...buttonProps}>{minimized ? "+" : "−"}</button>
      </div>

      {!minimized && <>
        <div style={{ fontSize: 12, opacity: .7, marginBottom: 12 }}>Choose an asset category, then place true-scale objects into your digital twin. Spawned assets appear directly in front of your current view.</div>
        {categories.map((category) => {
          const open = openCategory === category.id;
          return (
            <div key={category.id} style={{ marginBottom: 6, border: "1px solid rgba(255,255,255,.08)", borderRadius: 9, overflow: "hidden" }}>
              <button type="button" aria-expanded={open} onClick={() => setOpenCategory(open ? null : category.id)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", border: 0, borderRadius: 0, textAlign: "left" }} {...buttonProps}>
                <span>{category.icon} {category.label}</span>
                <span style={{ opacity: .6 }}>{counts[category.id] ? `${counts[category.id]} · ` : ""}{open ? "⌃" : "⌄"}</span>
              </button>
              {open && <div style={{ padding: "7px", background: "rgba(255,255,255,.025)" }}>
                {category.id === "vivariums" && <button type="button" onClick={() => spawn(["vivarium", "Traditional Vivarium", 90, 40, 40])} style={{ width: "100%", minHeight: 42 }} {...buttonProps}>＋ Traditional Vivarium<br /><span style={{ opacity: .65, fontSize: 11 }}>90 × 40 × 40 cm</span></button>}
                {category.items.length > 0 ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{category.items.map((preset) => <button key={preset[0]} type="button" onClick={() => spawn(preset)} style={{ fontSize: 11, minHeight: 42 }} {...buttonProps}>{preset[1]}<br /><span style={{ opacity: .6 }}>{preset[2]}×{preset[3]}×{preset[4]} cm</span></button>)}</div> : category.id !== "vivariums" && <div style={{ padding: 8, fontSize: 11, opacity: .55 }}>Asset library coming next.</div>}
              </div>}
            </div>
          );
        })}

        {selected && <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontWeight: 700 }}>{selected.label}</div>
          <div style={{ fontSize: 12, opacity: .7, margin: "4px 0 10px" }}>{selected.width} × {selected.depth} × {selected.height} cm · X {Math.round(selected.x)} · Y {Math.round(selected.y)} · Z {Math.round(selected.z ?? 0)}</div>
          <div style={{ display: "flex", gap: 6 }}><button type="button" onClick={onDuplicate} {...buttonProps}>Duplicate</button><button type="button" onClick={onDelete} {...buttonProps}>Delete</button></div>
        </div>}
      </>}
    </aside>
  );
}
