import TinyTitansIcon from "../TinyTitansIcon";
import { RoomAssetInspector } from "../reptile-room-3d/RoomAssetInspector";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import type { Snake } from "../../types/Snake";
import type { Room3DTransformPatch } from "../../types/reptileRoom3D";
import { stableSlotRotation, toStableNumber } from "../../lib/stableReptileRoomBuilder";

export type StableReptileRoomInspectorProps = { selectedObject: ReptileRoomObject | null; selectedSlot: ReptileRoomSlot | null; slots: ReptileRoomSlot[]; snakes: Snake[]; snakesById: Map<string, Snake>; inspectorTab: "edit" | "occupant"; setInspectorTab: (value: "edit" | "occupant") => void; updateSelected: (patch: Room3DTransformPatch) => void; deleteSelected: () => void; duplicateSelected: () => void; uploadPhoto: (file: File) => Promise<void>; removePhoto: () => Promise<void>; photoBusy: boolean };

export function StableReptileRoomInspector(props: StableReptileRoomInspectorProps) {
  const { selectedObject, selectedSlot } = props;
  const entity = selectedObject ?? selectedSlot;
  if (!entity) return <div className="stable-rr3d-inspector-empty"><span>INSPECTOR</span><h2>Select an asset</h2><p>Choose a vivarium or Keeper Toolkit asset to edit its dimensions, placement, rotation and intelligent configuration.</p></div>;
  const width = selectedObject ? selectedObject.width : selectedSlot?.w ?? 1;
  const depth = selectedObject ? selectedObject.depth : selectedSlot?.depth ?? selectedSlot?.h ?? 1;
  const height = selectedObject ? selectedObject.height : selectedSlot?.height ?? 1;
  const rotation = selectedObject ? selectedObject.rotation : stableSlotRotation(selectedSlot!);
  const photoUrl = selectedObject?.config?.photoUrl ?? selectedSlot?.photoUrl ?? "";
  return <div className="stable-rr3d-inspector-content">
    <div className="stable-rr3d-inspector-title"><div><span>SELECTED</span><h2>{entity.label}</h2></div><button type="button" onClick={props.deleteSelected}>Delete</button></div>
    {selectedSlot && <label className="stable-rr3d-smart-field"><span>Vivarium name</span><input type="text" value={selectedSlot.label} onChange={(event) => props.updateSelected({ label: event.target.value })} placeholder="Vivarium name" /></label>}
    <div className="stable-rr3d-editor-grid">{(["width", "depth", "height"] as const).map((field) => <label key={field}>{field[0].toUpperCase() + field.slice(1)} cm<input type="number" min="1" value={field === "width" ? width : field === "depth" ? depth : height} onChange={(event) => props.updateSelected(field === "width" ? { width: Math.max(1, toStableNumber(event.target.value, 1)) } : field === "depth" ? { depth: Math.max(1, toStableNumber(event.target.value, 1)) } : { height: Math.max(1, toStableNumber(event.target.value, 1)) })} /></label>)}</div>
    <div className="stable-rr3d-editor-grid"><label>X cm<input type="number" value={Math.round(entity.x)} onChange={(event) => props.updateSelected({ x: Math.max(0, toStableNumber(event.target.value)) })} /></label><label>Y cm<input type="number" value={Math.round(entity.y)} onChange={(event) => props.updateSelected({ y: Math.max(0, toStableNumber(event.target.value)) })} /></label><label>Z cm<input type="number" value={Math.round(entity.z ?? 0)} onChange={(event) => props.updateSelected({ z: Math.max(0, toStableNumber(event.target.value)) })} /></label></div>
    <div className="stable-rr3d-rotation"><span>Rotation</span><button type="button" onClick={() => props.updateSelected({ rotation: rotation - 15 })}><TinyTitansIcon name="rotate" size={17} /></button><strong>{Math.round(rotation)}°</strong><button type="button" onClick={() => props.updateSelected({ rotation: rotation + 15 })}><TinyTitansIcon name="rotate" size={17} /></button><button type="button" onClick={() => props.updateSelected({ rotation: 0 })}>Reset</button></div>
    {selectedObject && <div className="stable-rr3d-inspector-actions"><button type="button" onClick={props.duplicateSelected}>Duplicate</button></div>}
    {selectedSlot && <div className="stable-rr3d-tabs"><button type="button" aria-pressed={props.inspectorTab === "edit"} onClick={() => props.setInspectorTab("edit")}>Position</button><button type="button" aria-pressed={props.inspectorTab === "occupant"} onClick={() => props.setInspectorTab("occupant")}>Occupant</button>{props.inspectorTab === "occupant" && <label className="stable-rr3d-smart-field">Snake<select value={selectedSlot.snakeId ?? ""} onChange={(event) => { const snakeId = event.target.value || null; const snake = snakeId ? props.snakesById.get(snakeId) : undefined; props.updateSelected({ snakeId, label: snake ? `${snake.name}'s Vivarium` : "Empty Vivarium", lifecycleStatus: snake ? "occupied" : "empty", availability: snake ? "occupied" : "available" }); }}>{<option value="">Empty vivarium</option>}{props.snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label>}</div>}
    <div className="stable-rr3d-photo"><div><strong>Reference photo</strong><small>Choose from your device gallery. The image is stored with this asset.</small></div>{photoUrl && <img src={photoUrl} alt={`${entity.label} reference`} />}{photoUrl && <button type="button" className="stable-rr3d-photo-remove" onClick={() => void props.removePhoto()} disabled={props.photoBusy}>Remove photo</button>}<label className="stable-rr3d-photo-button">{props.photoBusy ? "Working…" : photoUrl ? "Replace photo" : "Choose photo"}<input type="file" accept="image/*" disabled={props.photoBusy} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void props.uploadPhoto(file); }} /></label></div>
    {selectedObject && <RoomAssetInspector object={selectedObject} slots={props.slots} onPatch={(patch) => props.updateSelected({ ...(patch.label !== undefined ? { label: patch.label } : {}), ...(patch.config ? { config: patch.config } : {}) })} />}
  </div>;
}
