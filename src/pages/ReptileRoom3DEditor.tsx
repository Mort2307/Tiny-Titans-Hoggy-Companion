import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { loadReptileRooms, saveReptileRooms, type ReptileRoomSlot } from "../services/reptileRoomService";
import { VivariumBuilder3D } from "../components/reptile-room-3d/VivariumBuilder3D";

const STYLE_VALUES = new Set(["front-opening", "sliding-glass", "pvc", "glass", "arboreal", "quarantine", "rack-tub"]);

export default function ReptileRoom3DEditor() {
  const { id: vivariumId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [slot, setSlot] = useState<ReptileRoomSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user || !vivariumId) return;
    let cancelled = false;
    const uid = user.uid;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const rooms = await loadReptileRooms(uid);
        const room = rooms[0] ?? null;
        if (!room) throw new Error("Create a Reptile Room before adding a vivarium.");

        if (vivariumId === "new") {
          const rawStyle = searchParams.get("style") ?? "front-opening";
          const style = STYLE_VALUES.has(rawStyle) ? rawStyle : "front-opening";
          const now = new Date().toISOString();
          const nextSlot: ReptileRoomSlot = {
            id: `viv-${crypto.randomUUID()}`,
            snakeId: null,
            label: style === "pvc" ? "PVC Enclosure" : style === "glass" ? "All-Glass Enclosure" : style === "arboreal" ? "Arboreal Glass Enclosure" : style === "quarantine" ? "Quarantine Tub" : style === "rack-tub" ? "Rack Tub" : style === "sliding-glass" ? "Sliding Glass Vivarium" : "Front-opening Vivarium",
            x: Math.max(0, (room.width ?? 300) / 2 - 45),
            y: Math.max(0, (room.depth ?? 250) / 2 - 22.5),
            z: 0,
            w: 90,
            h: 45,
            depth: 45,
            height: style === "arboreal" ? 100 : style === "quarantine" ? 30 : style === "rack-tub" ? 20 : 45,
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
            assetId: "vivarium",
            intelligenceRole: "enclosure",
            config: { enclosureStyle: style },
          };
          const nextRoom = { ...room, slots: [...room.slots, nextSlot], roomVersion: 4, updatedAt: now };
          await saveReptileRooms(uid, rooms.map((candidate) => candidate.id === room.id ? nextRoom : candidate));
          if (!cancelled) setSlot(nextSlot);
          return;
        }

        const found = rooms.flatMap((candidate) => [...candidate.slots, ...candidate.storedSlots]).find((item) => item.id === vivariumId) ?? null;
        if (!found) throw new Error("Vivarium not found in your Reptile Room.");
        if (!cancelled) setSlot(found);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load vivarium.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [authLoading, user, vivariumId, searchParams]);

  if (authLoading || loading) return <div className="page-loading">Opening dedicated 3D vivarium builder...</div>;
  if (error || !slot) return <div className="page-error">{error || "Vivarium not found."}</div>;

  return (
    <VivariumBuilder3D
      slot={slot}
      onClose={() => navigate("/reptile-room")}
      onSaved={() => undefined}
    />
  );
}
