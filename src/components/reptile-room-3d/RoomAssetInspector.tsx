import type { ReactNode } from "react";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import type { RoomAssetConfig } from "../../types/reptileRoom3D";
import { getRoomAssetPreset } from "../../data/reptileRoomAssetCatalog";

type Props = { object: ReptileRoomObject; slots: ReptileRoomSlot[]; onPatch: (patch: { config?: RoomAssetConfig; label?: string }) => void };
const num = (value: number | undefined, fallback: number) => value ?? fallback;
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="rr3d-smart-field"><span>{label}</span>{children}</label>; }

export function RoomAssetInspector({ object, slots, onPatch }: Props) {
  const preset = getRoomAssetPreset(object.assetId);
  const config = object.config ?? preset?.config ?? {};
  const role = object.intelligenceRole ?? preset?.intelligenceRole ?? "general";
  const linkedSlotId = config.linkedSlotId ?? "";
  const patchConfig = (patch: Partial<RoomAssetConfig>) => onPatch({ config: { ...config, ...patch } });
  return <div className="rr3d-smart-inspector">
    <div className="rr3d-smart-title"><div><span className="rr3d-kicker">INTELLIGENT ASSET</span><strong>{object.label}</strong></div><span>{role}</span></div>
    <div className="rr3d-smart-meta">{preset?.description ?? "Configuration is stored with this room asset."}</div>
    {role !== "general" && role !== "enrichment" && <Field label="Link to vivarium"><select value={linkedSlotId} onChange={(event) => { const slotId = event.target.value || null; const slot = slots.find((item) => item.id === slotId); patchConfig({ linkedSlotId: slotId, linkedSnakeId: slot?.snakeId ?? null }); }}><option value="">Unlinked</option>{slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}</option>)}</select></Field>}
    {role === "thermostat" && <><div className="rr3d-smart-grid"><Field label="Target °C"><input type="number" step="0.1" value={num(config.targetTemperatureC, 30)} onChange={(event) => patchConfig({ targetTemperatureC: Number(event.target.value) })} /></Field><Field label="Current °C"><input type="number" step="0.1" value={num(config.currentTemperatureC, 30)} onChange={(event) => patchConfig({ currentTemperatureC: Number(event.target.value) })} /></Field></div><div className="rr3d-smart-grid"><Field label="Mode"><select value={config.mode ?? "heat"} onChange={(event) => patchConfig({ mode: event.target.value as RoomAssetConfig["mode"] })}><option value="heat">Heat</option><option value="cool">Cool</option><option value="off">Off</option></select></Field><Field label="Probe location"><input value={config.probeLocation ?? "Warm side"} onChange={(event) => patchConfig({ probeLocation: event.target.value })} /></Field></div></>}
    {role === "sensor" && <div className="rr3d-smart-grid"><Field label="Temperature °C"><input type="number" step="0.1" value={num(config.currentTemperatureC, 25)} onChange={(event) => patchConfig({ currentTemperatureC: Number(event.target.value) })} /></Field><Field label="Humidity %"><input type="number" step="1" min="0" max="100" value={num(config.humidity, 50)} onChange={(event) => patchConfig({ humidity: Number(event.target.value) })} /></Field></div>}
    {(role === "heating" || role === "lighting" || role === "power" || role === "timer") && <div className="rr3d-smart-grid"><Field label="Wattage"><input type="number" min="0" value={num(config.wattage, 0)} onChange={(event) => patchConfig({ wattage: Number(event.target.value) })} /></Field><Field label="Enabled"><input type="checkbox" checked={config.enabled !== false} onChange={(event) => patchConfig({ enabled: event.target.checked })} /></Field></div>}
    {(role === "lighting" || role === "timer") && <div className="rr3d-smart-grid"><Field label="Start"><input type="time" value={config.scheduleStart ?? "08:00"} onChange={(event) => patchConfig({ scheduleStart: event.target.value })} /></Field><Field label="End"><input type="time" value={config.scheduleEnd ?? "20:00"} onChange={(event) => patchConfig({ scheduleEnd: event.target.value })} /></Field></div>}
    {role === "power" && <div className="rr3d-smart-grid"><Field label="Outlets"><input type="number" min="1" max="12" value={num(config.outlets, 2)} onChange={(event) => patchConfig({ outlets: Number(event.target.value) })} /></Field><Field label="Max load W"><input type="number" min="0" value={num(config.maxLoadWatts, 3000)} onChange={(event) => patchConfig({ maxLoadWatts: Number(event.target.value) })} /></Field></div>}
    <Field label="Notes"><textarea value={config.notes ?? ""} onChange={(event) => patchConfig({ notes: event.target.value })} rows={2} placeholder="Keeper note…" /></Field>
  </div>;
}
