import { useState } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import type { Room3DAssetPreset } from "../../types/reptileRoom3D";
import { getCameraForwardSpawn } from "./RoomCamera3D";

const CATEGORIES: Array<{ id: string; label: string; icon: string; items: Room3DAssetPreset[] }> = [
  { id: "vivariums", label: "Vivariums", icon: "🏠", items: [
    { kind: "vivarium", label: "Traditional Vivarium", icon: "🦎", width: 90, depth: 40, height: 40 },
  ] },
  { id: "furniture", label: "Furniture", icon: "🪑", items: [
    { kind: "table", label: "Table", icon: "▱", width: 120, depth: 60, height: 75 },
  ] },
  { id: "storage", label: "Storage", icon: "📦", items: [
    { kind: "shelving", label: "Shelving", icon: "▥", width: 90, depth: 40, height: 160 },
    { kind: "storage-cabinet", label: "Storage Cabinet", icon: "🗄️", width: 90, depth: 50, height: 120 },
    { kind: "rack", label: "Rack", icon: "▤", width: 100, depth: 55, height: 180 },
  ] },
  { id: "keeper", label: "Keeper Stations", icon: "🛠️", items: [
    { kind: "equipment-station", label: "Equipment Station", icon: "⚡", width: 90, depth: 50, height: 80 },
  ] },
  { id: "enrichment", label: "Enrichment & Decor", icon: "🌿", items: [] },
  { id: "heating", label: "Heating & Equipment", icon: "🌡️", items: [] },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Props = { room: ReptileRoomWorkspace; onAddAsset?: (preset: Room3DAssetPreset, spawnXcm: number, spawnYcm: number) => void };

export function RoomAssetLibrary3D({ room, onAddAsset }: Props) {
  const { camera } = useThree();
  const [openCategory, setOpenCategory] = useState("vivariums");

  const add = (preset: Room3DAssetPreset) => {
    const point = getCameraForwardSpawn(camera, 120, room);
    const maxX = Math.max(0, (room.width ?? 0) - preset.width);
    const maxY = Math.max(0, (room.depth ?? 0) - preset.depth);
    const x = clamp(point.xCm - preset.width / 2, 0, maxX);
    const y = clamp(point.yCm - preset.depth / 2, 0, maxY);
    onAddAsset?.(preset, x, y);
  };

  return (
    <Html fullscreen zIndexRange={[20, 30]}>
      <div style={{ position: "absolute", top: 14, left: 14, width: 300, maxWidth: "calc(100vw - 28px)", color: "#fff", pointerEvents: "none" }}>
        <div style={{ background: "rgba(18,21,24,.96)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 14, padding: 10, boxShadow: "0 12px 35px rgba(0,0,0,.35)", pointerEvents: "auto" }}>
          <div style={{ fontWeight: 800, fontSize: 15, padding: "3px 5px 8px" }}>🏗️ Room Assets</div>
          <div style={{ fontSize: 11, opacity: .65, padding: "0 5px 8px" }}>Tap an asset and it appears directly in front of you.</div>
          {CATEGORIES.map((category) => {
            const open = openCategory === category.id;
            return (
              <div key={category.id} style={{ marginBottom: 5, border: "1px solid rgba(255,255,255,.08)", borderRadius: 9, overflow: "hidden" }}>
                <button type="button" aria-expanded={open} onClick={() => setOpenCategory(open ? "" : category.id)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 10px", border: 0, borderRadius: 0, color: "inherit", background: "rgba(255,255,255,.035)", textAlign: "left" }}>
                  <span>{category.icon} {category.label}</span><span style={{ opacity: .55 }}>{open ? "⌃" : "⌄"}</span>
                </button>
                {open && <div style={{ padding: 7 }}>
                  {category.items.length ? category.items.map((preset) => <button key={preset.kind} type="button" onClick={() => add(preset)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 9px", marginBottom: 5, color: "inherit", textAlign: "left" }}><span style={{ fontSize: 18 }}>{preset.icon}</span><span><strong>{preset.label}</strong><small style={{ display: "block", opacity: .55 }}>{preset.width} × {preset.depth} × {preset.height} cm</small></span></button>) : <div style={{ padding: 8, fontSize: 11, opacity: .5 }}>Asset library slot ready for your future custom models.</div>}
                </div>}
              </div>
            );
          })}
        </div>
      </div>
    </Html>
  );
}
