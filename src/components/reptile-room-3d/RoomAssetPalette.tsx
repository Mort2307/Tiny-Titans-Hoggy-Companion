import type { Room3DAssetPreset } from "../../types/reptileRoom3D";

type Props = { onSpawn: (preset: Room3DAssetPreset) => void };
const presets: Room3DAssetPreset[] = [
  { kind: "table", label: "Oak Table · 4×2×2 ft", icon: "🪵", width: 121.9, depth: 61, height: 61 },
  { kind: "shelving", label: "Teak Corner Unit", icon: "🗄️", width: 90, depth: 45, height: 180 },
  { kind: "table", label: "Keeper Table", icon: "▣", width: 100, depth: 60, height: 75 },
  { kind: "workbench", label: "Workbench", icon: "🛠️", width: 120, depth: 60, height: 90 },
  { kind: "shelving", label: "Shelving Unit", icon: "▤", width: 90, depth: 40, height: 180 },
  { kind: "storage-cabinet", label: "Storage Cabinet", icon: "▥", width: 80, depth: 40, height: 90 },
  { kind: "rack", label: "Reptile Rack", icon: "▤", width: 100, depth: 55, height: 180 },
  { kind: "chair", label: "Chair", icon: "🪑", width: 45, depth: 45, height: 85 },
  { kind: "vivarium", label: "Vivarium", icon: "🏠", width: 90, depth: 40, height: 40 },
];

export function RoomAssetPalette({ onSpawn }: Props) {
  return <div className="rr3d-asset-palette" aria-label="Room assets">
    <div className="rr3d-palette-title"><span>BUILD</span><strong>Room Assets</strong><small>Click to add · click the object to edit</small></div>
    <div className="rr3d-palette-scroll">{presets.map((preset) => <button key={`${preset.kind}-${preset.label}`} type="button" title={`${preset.label} · ${preset.width} × ${preset.depth} × ${preset.height} cm`} onPointerDown={(event) => event.stopPropagation()} onClick={() => onSpawn(preset)}><b>{preset.icon}</b><span>{preset.label}</span></button>)}</div>
  </div>;
}
