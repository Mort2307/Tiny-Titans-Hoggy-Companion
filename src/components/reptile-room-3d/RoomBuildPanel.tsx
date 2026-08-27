import type { ReptileFurnitureKind, ReptileRoomObject } from "../../services/reptileRoomService";

type RoomBuildPanelProps = {
  objects: ReptileRoomObject[];
  selectedId: string | null;
  onAddVivarium: () => void;
  onAddFurniture: (kind: ReptileFurnitureKind, label: string, width: number, depth: number, height: number) => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

const furniturePresets: Array<[ReptileFurnitureKind, string, number, number, number]> = [
  ["shelving", "Shelving Unit", 90, 40, 180],
  ["workbench", "Workbench", 120, 60, 90],
  ["storage-cabinet", "Storage Cabinet", 80, 40, 90],
  ["equipment-station", "Equipment Station", 90, 50, 80],
  ["table", "Table", 100, 60, 75],
  ["chair", "Chair", 45, 45, 85],
];

export function RoomBuildPanel({ objects, selectedId, onAddVivarium, onAddFurniture, onDelete, onDuplicate }: RoomBuildPanelProps) {
  const selected = objects.find((item) => item.id === selectedId);

  return (
    <aside aria-label="3D room build controls" style={{ width: 270, maxWidth: "100%", padding: 14, borderRadius: 14, background: "rgba(22,25,29,.96)", border: "1px solid rgba(255,255,255,.12)", boxSizing: "border-box" }}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>🏗️ Build Room</div>
      <div style={{ fontSize: 12, opacity: .7, marginBottom: 12 }}>Place true-scale objects into the digital twin. Changes are local until persistence is added.</div>

      <button type="button" onClick={onAddVivarium} style={{ width: "100%", marginBottom: 8 }}>＋ Vivarium · 90 × 40 × 40 cm</button>

      <div style={{ fontSize: 12, fontWeight: 700, opacity: .75, margin: "12px 0 7px" }}>Furniture</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {furniturePresets.map(([kind, label, width, depth, height]) => (
          <button key={kind} type="button" onClick={() => onAddFurniture(kind, label, width, depth, height)} style={{ fontSize: 12, minHeight: 42 }}>
            {label}<br /><span style={{ opacity: .65 }}>{width}×{depth}×{height}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.1)" }}>
          <div style={{ fontWeight: 700 }}>{selected.label}</div>
          <div style={{ fontSize: 12, opacity: .7, margin: "4px 0 10px" }}>
            {selected.width} × {selected.depth} × {selected.height} cm · X {Math.round(selected.x)} · Z {Math.round(selected.z)}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={onDuplicate}>Duplicate</button>
            <button type="button" onClick={onDelete}>Delete</button>
          </div>
        </div>
      )}
    </aside>
  );
}
