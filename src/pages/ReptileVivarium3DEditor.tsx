import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { loadReptileRooms, saveReptileRooms } from "../services/reptileRoomService";
import { loadSpatialHabitat, saveSpatialHabitat } from "../services/spatialHabitatPersistenceService";
import { roomToSpatialScene, sceneToRoom } from "../services/spatialHabitatService";
import { applyVivariumTwinToSpatialScene } from "../services/spatialVivariumTwinBridge";
import type { ReptileRoomSlot, ReptileRoomWorkspace } from "../services/reptileRoomService";
import { VivariumBuilder3D } from "../components/reptile-room-3d/VivariumBuilder3D";
import type { VivariumDigitalTwin } from "../types/vivariumTwin";

export default function ReptileVivarium3DEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [slot, setSlot] = useState<ReptileRoomSlot | null>(null);
  const [room, setRoom] = useState<ReptileRoomWorkspace | null>(null);
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (loading || profileLoading || !user || !id) return;
    let cancelled = false;
    const uid = user.uid;

    async function load() {
      try {
        const rooms = await loadReptileRooms(uid);
        const containingRoom = rooms.find((candidate) => [...candidate.slots, ...candidate.storedSlots].some((item) => item.id === id)) ?? null;
        const found = containingRoom ? [...containingRoom.slots, ...containingRoom.storedSlots].find((item) => item.id === id) ?? null : null;
        if (!cancelled) {
          if (!found || !containingRoom) setError("This vivarium could not be found in your Reptile Room.");
          else {
            setSlot(found);
            setRoom(containingRoom);
          }
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load this vivarium.");
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [id, loading, profileLoading, user]);

  if (loading || profileLoading || (!slot && !error)) {
    return <div className="page-container"><div className="tracker-card">Loading 3D vivarium editor...</div></div>;
  }

  if (error || !slot) {
    return (
      <div className="page-container">
        <div className="tracker-card">
          <h1>Vivarium unavailable</h1>
          <p>{error || "This vivarium could not be loaded."}</p>
          <button type="button" onClick={() => navigate("/reptile-room")}>Back to Reptile Room</button>
        </div>
      </div>
    );
  }

  const syncSpatialTwin = async (twin: VivariumDigitalTwin) => {
    if (!user || !room) {
      navigate("/reptile-room");
      return;
    }
    setSyncing(true);
    setError("");
    try {
      const storedScene = await loadSpatialHabitat(user.uid, room.id).catch(() => null);
      const scene = storedScene ?? roomToSpatialScene(room);
      const nextScene = applyVivariumTwinToSpatialScene(scene, slot.id, twin);
      await saveSpatialHabitat(user.uid, room.id, nextScene);
      await saveReptileRooms(user.uid, [sceneToRoom(nextScene, room)]);
      navigate("/reptile-room");
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "The spatial habitat could not be synchronized.");
    } finally {
      setSyncing(false);
    }
  };

  if (syncing) {
    return <div className="page-container"><div className="tracker-card">Synchronizing vivarium changes with the Spatial Habitat Builder…</div></div>;
  }

  return (
    <VivariumBuilder3D
      slot={slot}
      onClose={() => navigate("/reptile-room")}
      onSaved={(twin) => { void syncSpatialTwin(twin); }}
    />
  );
}