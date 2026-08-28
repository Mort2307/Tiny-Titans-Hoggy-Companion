import { useEffect, useMemo, useState } from "react";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import type { Snake } from "../../types/Snake";

type Item = ReptileRoomObject | ReptileRoomSlot;
type Props = { item: Item; isSlot: boolean; snakes?: Snake[]; photoUrl?: string; photoBusy?: boolean; onChange: (patch: Partial<ReptileRoomObject> | Partial<ReptileRoomSlot>) => void; onDelete: () => void; onDuplicate?: () => void; onUploadPhoto?: (file: File) => void; onMagLock?: () => void };
type Draft = { label: string; width: number; depth: number; height: number; x: number; y: number; z: number; rotation: number; notes: string };
const numberValue = (value: string, fallback: number) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const snakeName = (snake: Snake) => snake.name || "Unnamed Hoggy";
const isSlotItem = (item: Item): item is ReptileRoomSlot => "w" in item;
const makeDraft = (item: Item, isSlot: boolean): Draft => {
  if (isSlot && isSlotItem(item)) return { label: item.label, width: Math.max(1, item.w), depth: Math.max(1, item.depth ?? item.h ?? 1), height: Math.max(1, item.height ?? 40), x: item.x, y: item.y, z: item.z ?? 0, rotation: 0, notes: item.notes ?? "" };
  if (!isSlot && !isSlotItem(item)) return { label: item.label, width: Math.max(1, item.width), depth: Math.max(1, item.depth), height: Math.max(1, item.height), x: item.x, y: item.y, z: item.z ?? 0, rotation: item.rotation ?? 0, notes: item.notes ?? "" };
  return { label: item.label, width: 1, depth: 1, height: 1, x: item.x, y: item.y, z: item.z ?? 0, rotation: 0, notes: item.notes ?? "" };
};

export function RoomItemEditor({ item, isSlot, snakes = [], photoUrl, photoBusy = false, onChange, onDelete, onDuplicate, onUploadPhoto, onMagLock }: Props) {
  const [draft, setDraft] = useState<Draft>(() => makeDraft(item, isSlot));
  useEffect(() => setDraft(makeDraft(item, isSlot)), [item, isSlot]);
  const kindLabel = useMemo(() => isSlot ? "Vivarium" : (!isSlotItem(item) ? item.kind.replace(/-/g, " ").replace(/\b\w/g, (char: string) => char.toUpperCase()) : "Asset"), [item, isSlot]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const apply = () => {
    const common = { label: draft.label.trim() || item.label, x: Math.max(0, draft.x), y: Math.max(0, draft.y), z: Math.max(0, draft.z), notes: draft.notes };
    if (isSlot) onChange({ ...common, w: Math.max(1, draft.width), depth: Math.max(1, draft.depth), height: Math.max(1, draft.height) } as Partial<ReptileRoomSlot>);
    else onChange({ ...common, width: Math.max(1, draft.width), depth: Math.max(1, draft.depth), height: Math.max(1, draft.height), rotation: ((draft.rotation % 360) + 360) % 360 } as Partial<ReptileRoomObject>);
  };
  const reset = () => setDraft(makeDraft(item, isSlot));
  const selectedSnakeId = isSlot && isSlotItem(item) ? item.snakeId ?? "" : "";
  return <section className="rr3d-item-editor" aria-label={`Edit ${kindLabel}`}>
    <div className="rr3d-editor-head"><div><span className="rr3d-editor-kicker">SELECTED ITEM</span><h2>{kindLabel}</h2><p>{item.label}</p></div><button type="button" className="rr3d-editor-close" onClick={reset} aria-label="Reset editor">×</button></div>
    <div className="rr3d-editor-section"><h3>Identity</h3><label>Name<input value={draft.label} onChange={(event) => set("label", event.target.value)} /></label>{isSlot && <label>Occupant<select value={selectedSnakeId} onChange={(event) => { const snake = snakes.find((entry) => entry.id === event.target.value); onChange({ snakeId: event.target.value || null, label: snake ? `${snakeName(snake)}'s Vivarium` : draft.label } as Partial<ReptileRoomSlot>); }}>{<option value="">Empty vivarium</option>}{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snakeName(snake)}</option>)}</select></label>}</div>
    <div className="rr3d-editor-section"><h3>Dimensions <small>cm</small></h3><div className="rr3d-editor-grid"><label>Width<input type="number" min="1" step="0.1" value={draft.width} onChange={(event) => set("width", numberValue(event.target.value, draft.width))} /></label><label>Depth<input type="number" min="1" step="0.1" value={draft.depth} onChange={(event) => set("depth", numberValue(event.target.value, draft.depth))} /></label><label>Height<input type="number" min="1" step="0.1" value={draft.height} onChange={(event) => set("height", numberValue(event.target.value, draft.height))} /></label><label>Rotation<input type="number" min="0" max="359" step="15" value={draft.rotation} disabled={isSlot} onChange={(event) => set("rotation", numberValue(event.target.value, draft.rotation))} /></label></div><p className="rr3d-editor-hint">Real-world scale. Your 4 × 2 × 2 ft oak table is 121.9 × 61 × 61 cm.</p></div>
    <div className="rr3d-editor-section"><h3>Position <small>cm</small></h3><div className="rr3d-editor-grid"><label>X<input type="number" step="0.1" value={draft.x} onChange={(event) => set("x", numberValue(event.target.value, draft.x))} /></label><label>Y<input type="number" step="0.1" value={draft.y} onChange={(event) => set("y", numberValue(event.target.value, draft.y))} /></label><label>Z<input type="number" step="0.1" value={draft.z} onChange={(event) => set("z", numberValue(event.target.value, draft.z))} /></label></div></div>
    {isSlot && <div className="rr3d-editor-section"><h3>Vivarium image</h3>{photoUrl ? <img className="rr3d-editor-photo" src={photoUrl} alt={`${item.label} chosen vivarium`} /> : <div className="rr3d-editor-empty-photo">No chosen vivarium image yet</div>}<label className="rr3d-editor-upload">{photoBusy ? "Uploading…" : "Choose image"}<input type="file" accept="image/*" disabled={photoBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file && onUploadPhoto) onUploadPhoto(file); event.currentTarget.value = ""; }} /></label>{onMagLock && <button type="button" className="rr3d-editor-secondary rr3d-editor-full" onClick={onMagLock}>{isSlotItem(item) && item.stackGroupId ? "🔒 Release mag-lock" : "🧲 Mag-lock vivarium"}</button>}</div>}
    <div className="rr3d-editor-section"><h3>Notes</h3><textarea rows={3} value={draft.notes} onChange={(event) => set("notes", event.target.value)} placeholder="Optional room notes…" /></div>
    <div className="rr3d-editor-actions"><button type="button" className="rr3d-editor-secondary" onClick={reset}>Reset</button><button type="button" className="rr3d-editor-primary" onClick={apply}>Apply changes</button></div>
    <div className="rr3d-editor-actions"><button type="button" className="rr3d-editor-secondary" onClick={onDuplicate}>Duplicate</button><button type="button" className="rr3d-editor-danger" onClick={onDelete}>🗑 Delete {isSlot ? "Vivarium" : "Asset"}</button></div>
  </section>;
}
