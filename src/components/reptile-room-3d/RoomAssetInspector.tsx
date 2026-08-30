import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import { deleteReptileRoomAssetPhoto, uploadReptileRoomAssetPhoto } from "../../services/reptileRoomAssetPhotoService";
import { loadReptileRooms } from "../../services/reptileRoomService";
import type { RoomAssetConfig } from "../../types/reptileRoom3D";
import { useAuth } from "../../context/useAuth";
import { getRoomAssetPreset } from "../../data/reptileRoomAssetCatalog";
import "../../styles/reptile-room-3d-fullscreen.css";
import "../../styles/reptile-room-asset-photo.css";

type Props = { object: ReptileRoomObject; slots: ReptileRoomSlot[]; onPatch: (patch: { config?: RoomAssetConfig; label?: string }) => void };
const num = (value: number | undefined, fallback: number) => value ?? fallback;
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="rr3d-smart-field"><span>{label}</span>{children}</label>; }

export function RoomAssetInspector({ object, slots: providedSlots, onPatch }: Props) {
  const { user } = useAuth();
  const [roomId, setRoomId] = useState("");
  const [roomSlots, setRoomSlots] = useState<ReptileRoomSlot[]>(providedSlots);
  const [loadingRoom, setLoadingRoom] = useState(providedSlots.length === 0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhoto, setRemovingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preset = getRoomAssetPreset(object.assetId);
  const config = object.config ?? preset?.config ?? {};
  const role = object.intelligenceRole ?? preset?.intelligenceRole ?? "general";
  const linkedSlotId = config.linkedSlotId ?? "";
  const photoUrl = config.photoUrl ?? "";

  useEffect(() => {
    setRoomSlots(providedSlots);
    if (!user || providedSlots.length > 0) { setLoadingRoom(false); return; }
    let active = true;
    setLoadingRoom(true);
    void loadReptileRooms(user.uid).then((rooms) => {
      if (!active) return;
      const room = rooms[0];
      setRoomId(room?.id ?? "");
      setRoomSlots(room?.slots ?? []);
    }).catch(() => { if (active) setRoomSlots([]); }).finally(() => { if (active) setLoadingRoom(false); });
    return () => { active = false; };
  }, [providedSlots, user]);

  useEffect(() => {
    if (!user || roomId || providedSlots.length > 0) return;
    let active = true;
    void loadReptileRooms(user.uid).then((rooms) => { if (active && rooms[0]) { setRoomId(rooms[0].id); setRoomSlots(rooms[0].slots ?? []); } }).catch(() => undefined);
    return () => { active = false; };
  }, [providedSlots.length, roomId, user]);

  const patchConfig = (patch: Partial<RoomAssetConfig>) => onPatch({ config: { ...config, ...patch } });
  const handlePhotoChange = async (file?: File) => {
    if (!file || !user || !roomId || uploadingPhoto || removingPhoto) return;
    setUploadingPhoto(true);
    try { patchConfig({ photoUrl: await uploadReptileRoomAssetPhoto(user.uid, roomId, object.id, file) }); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to upload the asset photo."); }
    finally { setUploadingPhoto(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };
  const handlePhotoRemove = async () => {
    if (!user || !roomId || !photoUrl || uploadingPhoto || removingPhoto) return;
    setRemovingPhoto(true);
    try { await deleteReptileRoomAssetPhoto(user.uid, roomId, object.id); patchConfig({ photoUrl: undefined }); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Unable to remove the asset photo."); }
    finally { setRemovingPhoto(false); }
  };

  return <div className="rr3d-smart-inspector">
    <div className="rr3d-smart-title"><div><span className="rr3d-kicker">INTELLIGENT ASSET</span><strong>{object.label}</strong></div><span>{role}</span></div>
    <div className="rr3d-smart-meta">{preset?.description ?? "Configuration is stored with this room asset."}</div>
    <div className="rr3d-smart-photo-field"><span className="rr3d-kicker">REFERENCE PHOTO</span><div className="rr3d-photo-actions"><button type="button" className="rr3d-photo-picker" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto || removingPhoto || !roomId}>{uploadingPhoto ? "Uploading photo…" : photoUrl ? "Change photo" : "Choose photo"}</button>{photoUrl && <button type="button" className="rr3d-photo-remove" onClick={() => void handlePhotoRemove()} disabled={uploadingPhoto || removingPhoto || !roomId}>{removingPhoto ? "Removing…" : "Remove photo"}</button>}</div><input ref={fileInputRef} type="file" accept="image/*" hidden onChange={(event) => void handlePhotoChange(event.target.files?.[0])} />{photoUrl && <img src={photoUrl} alt={`${object.label} reference`} className="rr3d-photo-preview" />}</div>
    {role !== "general" && role !== "enrichment" && <Field label="Link to vivarium"><select value={linkedSlotId} disabled={loadingRoom} onChange={(event) => { const slotId = event.target.value || null; const slot = roomSlots.find((item) => item.id === slotId); patchConfig({ linkedSlotId: slotId, linkedSnakeId: slot?.snakeId ?? null }); }}><option value="">{loadingRoom ? "Loading vivariums…" : "Unlinked"}</option>{roomSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label}{slot.snakeId ? " · linked snake" : ""}</option>)}</select></Field>}
    {role === "thermostat" && <><div className="rr3d-smart-grid"><Field label="Target °C"><input type="number" step="0.1" value={num(config.targetTemperatureC, 30)} onChange={(event) => patchConfig({ targetTemperatureC: Number(event.target.value) })} /></Field><Field label="Current °C"><input type="number" step="0.1" value={num(config.currentTemperatureC, 30)} onChange={(event) => patchConfig({ currentTemperatureC: Number(event.target.value) })} /></Field></div><div className="rr3d-smart-grid"><Field label="Mode"><select value={config.mode ?? "heat"} onChange={(event) => patchConfig({ mode: event.target.value as RoomAssetConfig["mode"] })}><option value="heat">Heat</option><option value="cool">Cool</option><option value="off">Off</option></select></Field><Field label="Probe location"><input value={config.probeLocation ?? "Warm side"} onChange={(event) => patchConfig({ probeLocation: event.target.value })} /></Field></div></>}
    {role === "sensor" && <div className="rr3d-smart-grid"><Field label="Temperature °C"><input type="number" step="0.1" value={num(config.currentTemperatureC, 25)} onChange={(event) => patchConfig({ currentTemperatureC: Number(event.target.value) })} /></Field><Field label="Humidity %"><input type="number" step="1" min="0" max="100" value={num(config.humidity, 50)} onChange={(event) => patchConfig({ humidity: Number(event.target.value) })} /></Field></div>}
    {(role === "heating" || role === "lighting" || role === "power" || role === "timer") && <div className="rr3d-smart-grid"><Field label="Wattage"><input type="number" min="0" value={num(config.wattage, 0)} onChange={(event) => patchConfig({ wattage: Number(event.target.value) })} /></Field><Field label="Enabled"><input type="checkbox" checked={config.enabled !== false} onChange={(event) => patchConfig({ enabled: event.target.checked })} /></Field></div>}
    {(role === "lighting" || role === "timer") && <div className="rr3d-smart-grid"><Field label="Start"><input type="time" value={config.scheduleStart ?? "08:00"} onChange={(event) => patchConfig({ scheduleStart: event.target.value })} /></Field><Field label="End"><input type="time" value={config.scheduleEnd ?? "20:00"} onChange={(event) => patchConfig({ scheduleEnd: event.target.value })} /></Field></div>}
    {role === "power" && <div className="rr3d-smart-grid"><Field label="Outlets"><input type="number" min="1" max="12" value={num(config.outlets, 2)} onChange={(event) => patchConfig({ outlets: Number(event.target.value) })} /></Field><Field label="Max load W"><input type="number" min="0" value={num(config.maxLoadWatts, 3000)} onChange={(event) => patchConfig({ maxLoadWatts: Number(event.target.value) })} /></Field></div>}
    <Field label="Notes"><textarea value={config.notes ?? ""} onChange={(event) => patchConfig({ notes: event.target.value })} rows={2} placeholder="Keeper note…" /></Field>
  </div>;
}
