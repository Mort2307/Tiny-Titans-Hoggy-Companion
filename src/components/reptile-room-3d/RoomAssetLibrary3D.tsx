import { useState } from "react";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomSlot, type ReptileRoomWorkspace } from "../../services/reptileRoomService";
import type { Room3DAssetPreset } from "../../types/reptileRoom3D";
import { getCameraForwardSpawn } from "./RoomCamera3D";
import TinyTitansIcon from "../TinyTitansIcon";

const CATEGORIES: Array<{ id: string; label: string; icon: string; items: Room3DAssetPreset[] }> = [
  { id: "vivariums", label: "Vivariums & Enclosures", icon: "enclosure", items: [
    { kind: "vivarium", label: "Front-opening Glass", icon: "enclosure", width: 90, depth: 45, height: 45, config: { enclosureStyle: "front-opening" }, intelligenceRole: "enclosure" },
    { kind: "vivarium", label: "Sliding Glass", icon: "enclosure", width: 90, depth: 45, height: 45, config: { enclosureStyle: "sliding-glass" }, intelligenceRole: "enclosure" },
    { kind: "vivarium", label: "PVC Enclosure", icon: "enclosure", width: 90, depth: 45, height: 45, config: { enclosureStyle: "pvc" }, intelligenceRole: "enclosure" },
    { kind: "vivarium", label: "All-Glass", icon: "enclosure", width: 90, depth: 45, height: 45, config: { enclosureStyle: "glass" }, intelligenceRole: "enclosure" },
    { kind: "vivarium", label: "Arboreal Glass", icon: "move", width: 60, depth: 60, height: 100, config: { enclosureStyle: "arboreal" }, intelligenceRole: "enclosure" },
    { kind: "vivarium", label: "Quarantine Tub", icon: "enclosure", width: 70, depth: 40, height: 30, config: { enclosureStyle: "quarantine" }, intelligenceRole: "enclosure" },
    { kind: "vivarium", label: "Rack Tub", icon: "enclosure", width: 55, depth: 35, height: 20, config: { enclosureStyle: "rack-tub" }, intelligenceRole: "enclosure" },
  ] },
  { id: "furniture", label: "Furniture", icon: "enclosure", items: [
    { kind: "table", label: "Table", icon: "enclosure", width: 120, depth: 60, height: 75 },
  ] },
  { id: "storage", label: "Storage", icon: "marketplace", items: [
    { kind: "shelving", label: "Shelving", icon: "marketplace", width: 90, depth: 40, height: 160 },
    { kind: "storage-cabinet", label: "Storage Cabinet", icon: "marketplace", width: 90, depth: 50, height: 120 },
    { kind: "rack", label: "Rack", icon: "enclosure", width: 100, depth: 55, height: 180 },
  ] },
  { id: "keeper", label: "Keeper Stations", icon: "creator", items: [
    { kind: "equipment-station", label: "Equipment Station", icon: "power", width: 90, depth: 50, height: 80 },
  ] },
  { id: "enrichment", label: "Enrichment & Decor", icon: "husbandry", items: [] },
  { id: "heating", label: "Heating & Equipment", icon: "husbandry", items: [] },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type Props = {
  room: ReptileRoomWorkspace;
  onAddAsset?: (preset: Room3DAssetPreset, spawnXcm: number, spawnYcm: number) => void;
};

export function RoomAssetLibrary3D({ room, onAddAsset }: Props) {
  const { camera } = useThree();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openCategory, setOpenCategory] = useState("vivariums");
  const [minimized, setMinimized] = useState(false);
  const [creatingVivarium, setCreatingVivarium] = useState(false);
  const [message, setMessage] = useState("");

  const add = async (preset: Room3DAssetPreset) => {
    const point = getCameraForwardSpawn(camera, 120, room);
    const maxX = Math.max(0, (room.width ?? 0) - preset.width);
    const maxY = Math.max(0, (room.depth ?? 0) - preset.depth);
    const x = clamp(point.xCm - preset.width / 2, 0, maxX);
    const y = clamp(point.yCm - preset.depth / 2, 0, maxY);

    if (preset.kind !== "vivarium") {
      onAddAsset?.(preset, x, y);
      return;
    }

    if (!user) {
      setMessage("Sign in to create a vivarium.");
      return;
    }

    setCreatingVivarium(true);
    setMessage("");

    try {
      const loadedRooms = await loadReptileRooms(user.uid);
      const currentRoom = loadedRooms.find((candidate) => candidate.id === room.id) ?? room;
      const id = `viv-${crypto.randomUUID()}`;
      const slot: ReptileRoomSlot = {
        id,
        snakeId: null,
        label: preset.label,
        x,
        y,
        z: 0,
        w: preset.width,
        h: preset.depth,
        depth: preset.depth,
        height: preset.height,
        lifecycleStatus: "empty",
        condition: "good",
        availability: "available",
        storageLocation: "",
        storageNote: "",
        notes: "",
        maintenanceNote: "",
        photoUrl: "",
        stackGroupId: null,
        stackIndex: 0,
        parentSlotId: null,
        clearance: { front: 30, rear: 5, left: 5, right: 5, top: 10 },
        assetId: preset.assetId ?? "vivarium",
        intelligenceRole: "enclosure",
        config: { ...(preset.config ?? {}), enclosureStyle: preset.config?.enclosureStyle ?? "front-opening" },
      };

      const nextRoom: ReptileRoomWorkspace = {
        ...currentRoom,
        slots: [...currentRoom.slots, slot],
        roomVersion: 4,
        updatedAt: new Date().toISOString(),
      };
      const nextRooms = loadedRooms.some((candidate) => candidate.id === currentRoom.id)
        ? loadedRooms.map((candidate) => candidate.id === currentRoom.id ? nextRoom : candidate)
        : [nextRoom];

      await saveReptileRooms(user.uid, nextRooms);
      setMessage("Vivarium saved. Returning to My Animals.");
      navigate("/snakes");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create vivarium.");
    } finally {
      setCreatingVivarium(false);
    }
  };

  return (
    <Html fullscreen zIndexRange={[20, 30]}>
      <div style={{ position: "absolute", top: 14, left: 14, width: 300, maxWidth: "calc(100vw - 28px)", color: "#fff", pointerEvents: "none" }}>
        <div style={{ background: "rgba(18,21,24,.96)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 14, padding: 10, boxShadow: "0 12px 35px rgba(0,0,0,.35)", pointerEvents: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "3px 3px 8px 5px" }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}><TinyTitansIcon name="enclosure" size={17} /> Room Assets</div>
            <button type="button" aria-label={minimized ? "Expand room assets" : "Minimize room assets"} title={minimized ? "Expand" : "Minimize"} onClick={() => setMinimized((current) => !current)} style={{ width: 28, height: 28, display: "grid", placeItems: "center", padding: 0, border: "1px solid rgba(255,255,255,.14)", borderRadius: 7, background: "rgba(255,255,255,.06)", color: "#fff", cursor: "pointer", fontSize: 18, lineHeight: 1 }}><TinyTitansIcon name={minimized ? "add" : "close"} size={14} /></button>
          </div>
          {!minimized && <>
            <div style={{ fontSize: 11, opacity: .65, padding: "0 5px 8px" }}>{creatingVivarium ? "Creating vivarium and returning to My Animals..." : "Choose an asset. New vivariums are added directly to the current 3D room builder."}</div>
            {CATEGORIES.map((category) => {
              const open = openCategory === category.id;
              return (
                <div key={category.id} style={{ marginBottom: 5, border: "1px solid rgba(255,255,255,.08)", borderRadius: 9, overflow: "hidden" }}>
                  <button type="button" aria-expanded={open} onClick={() => setOpenCategory(open ? "" : category.id)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 10px", border: 0, borderRadius: 0, color: "inherit", background: "rgba(255,255,255,.035)", textAlign: "left", cursor: "pointer" }}>
                    <span><TinyTitansIcon name={category.icon} size={16} /> {category.label}</span><span style={{ opacity: .55 }}><TinyTitansIcon name={open ? "back" : "forward"} size={12} /></span>
                  </button>
                  {open && <div style={{ padding: 7 }}>
                    {category.items.length ? category.items.map((preset) => (
                      <button key={`${preset.kind}-${preset.label}`} type="button" disabled={creatingVivarium} onClick={() => void add(preset)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 9px", marginBottom: 5, color: "inherit", textAlign: "left", cursor: creatingVivarium ? "wait" : "pointer", opacity: creatingVivarium ? .6 : 1 }}>
                        <span><TinyTitansIcon name={preset.icon ?? "enclosure"} size={18} /></span>
                        <span><strong>{preset.label}</strong><small style={{ display: "block", opacity: .55 }}>{preset.width} × {preset.depth} × {preset.height} cm</small></span>
                      </button>
                    )) : <div style={{ padding: 8, fontSize: 11, opacity: .5 }}>Asset library slot ready for your future custom models.</div>}
                  </div>}
                </div>
              );
            })}
            {message && <div role="status" style={{ marginTop: 8, padding: "8px 9px", borderRadius: 8, background: "rgba(190,70,70,.12)", border: "1px solid rgba(190,70,70,.24)", fontSize: 11, lineHeight: 1.35 }}>{message}</div>}
          </>}
        </div>
      </div>
    </Html>
  );
}
