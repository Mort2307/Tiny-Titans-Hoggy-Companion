import { useEffect, useMemo, useState } from "react";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import type { Snake } from "../../types/Snake";

type Item = ReptileRoomObject | ReptileRoomSlot;
type Props = {
  item: Item;
  isSlot: boolean;
  snakes?: Snake[];
  photoUrl?: string;
  photoBusy?: boolean;
  onChange: (patch: Partial<ReptileRoomObject> | Partial<ReptileRoomSlot>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onUploadPhoto?: (file: File) => void;
  onMagLock?: () => void;
};

const numberValue = (value: string, fallback: number) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const snakeName = (snake: Snake) => snake.name || "Unnamed Hoggy";

export function RoomItemEditor({ item, isSlot, snakes = [], photoUrl, photoBusy = false, onChange, onDelete, onDuplicate, onUploadPhoto, onMagLock }: Props) {
  const [draft, setDraft] = useState({ label: item.label, width: isSlot ? item.w : item.width, depth: isSlot ? (item.depth ?? item.h) : item.depth, height: isSlot ? (item.height ?? 40) : item.height, x: item.x, y: item.y, z: item.z ?? 0, rotation: "rotation" in item ? item.rotation : 0, notes: item.notes ?? "" });
  useEffect(() => { setDraft({ label: item.label, width: isSlot ? item.w : item.width, depth: isSlot ? (item.depth ?? item.h) : item.depth, height: isSlot ? (item.height ?? 40) : item.height, x: item.x, y: item.y, z: item.z ?? 0, rotation: "rotation" in item ? item.rotation : 0, notes: item.notes ?? "" }); }, [item, isSlot]);
  const kindLabel = useMemo(() => isSlot ? "Vivarium" : item.kind.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()), [item, isSlot]);
  const patch = (key: keyof typeof draft, value: string) => {
    const next = key === "label" || key === "notes" ? value : numberValue(value, draft[key] as number);
    setDraft((current) => ({ ...current, [key]: next }));
    if (key === "label" || key === "notes") onChange({ [key]: next } as Partial<ReptileRoomObject>);
    else if (isSlot && key === "width") onChange({ w: next } as Partial<ReptileRoomSlot>);
    else if (isSlot && key === "depth") onChange({ depth: next } as Partial<ReptileRoomSlot>);
    else if (isSlot && key === "height") onChange({ height: next } as Partial<ReptileRoomSlot>);
    else onChange({ [key]: next } as Partial<ReptileRoomObject>);
  };
  return <section className="rr3d-item-editor" aria-label={`Edit ${kindLabel}`}>
    <div className="rr3d-editor-head"><div><span className="rr3d-editor-kicker">SELECTED ITEM</span><h2>{kindLabel}</h2><p>{item.label}</p></div><button type="button" className="rr3d-editor-close" onClick={() => onChange({})} aria-label="Close editor">×</button></div>
    <div className="rr3d-editor-tabs"><span className="active">Transform</span><span>Details</span></div>
    <div className="rr3d-editor-section"><h3>Identity</h3><label>Name<input value={draft.label} onChange={(event) => patch("label", event.target.value)} /></label>{isSlot && <label>Occupant<select value={item.snakeId ?? ""} onChange={(event) => onChange({ snakeId: event.target.value || null, label: event.target.value ? `${snakeName(snakes.find((snake) => snake.id === event.target.value) ?? snakes[0] ?? { name: "Hoggy" })}'s Vivarium` : draft.label } as Partial<ReptileRoomSlot>)}><option value="">Empty vivarium</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snakeName(snake)}</option>)}</select></label>}</div>
    <div className="rr3d-editor-section"><h3>Dimensions <small>cm</small></h3><div className="rr3d-editor-grid"><label>Width<input type="number" min="1" step="1" value={draft.width} onChange={(event) => patch("width", event.target.value)} /></label><label>Depth<input type="number" min="1" step="1" value={draft.depth} onChange={(event) => patch("depth", event.target.value)} /></label><label>Height<input type="number" min="1" step="1" value={draft.height} onChange={(event) => patch("height", event.target.value)} /></label><label>Rotation<input type="number" min="0" max="359" step="15" value={draft.rotation} onChange={(event) => patch("rotation", event.target.value)} /></label></div><p className="rr3d-editor-hint">Dimensions are real-world scale. This is the control to use for your 4 × 2 × 2 ft table: 121.9 × 61 × 61 cm.</p></div>
    <div className="rr3d-editor-section"><h3>Position <small>cm</small></h3><div className="rr3d-editor-grid"><label>X<input type="number" step="1" value={draft.x} onChange={(event) => patch("x", event.target.value)} /></label><label>Y<input type="number" step="1" value={draft.y} onChange={(event) => patch("y", event.target.value)} /></label><label>Z<input type="number" step="1" value={draft.z} onChange={(event) => patch("z", event.target.value)} /></label></div></div>
    {isSlot && <div className="rr3d-editor-section"><h3>Vivarium image</h3>{photoUrl ? <img className="rr3d-editor-photo" src={photoUrl} alt={`${item.label} chosen vivarium`} /> : <div className="rr3d-editor-empty-photo">No chosen vivarium image yet</div>}<label className="rr3d-editor-upload">{photoBusy ? "Uploading…" : "Choose image"}<input type="file" accept="image/*" disabled={photoBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file && onUploadPhoto) onUploadPhoto(file); event.currentTarget.value = ""; }} /></label>{onMagLock && <button type="button" className="rr3d-editor-secondary" onClick={onMagLock}>{item.stackGroupId ? "🔒 Release mag-lock" : "🧲 Mag-lock vivarium"}</button>}</div>}
    <div className="rr3d-editor-section"><h3>Notes</h3><textarea rows={3} value={draft.notes} onChange={(event) => patch("notes", event.target.value)} placeholder="Optional room notes…" /></div>
    <div className="rr3d-editor-actions">{onDuplicate && <button type="button" className="rr3d-editor-secondary" onClick={onDuplicate}>Duplicate</button>}<button type="button" className="rr3d-editor-danger" onClick={onDelete}>🗑 Delete {isSlot ? "Vivarium" : "Asset"}</button></div>
  </section>;
}
