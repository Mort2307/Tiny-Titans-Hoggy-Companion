import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { loadReptileRooms } from "../services/reptileRoomService";
import type { ReptileRoomSlot } from "../services/reptileRoomService";
import { VivariumBuilder3D } from "../components/reptile-room-3d/VivariumBuilder3D";

export default function ReptileVivarium3DEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading, profileLoading } = useAuth();
  const [slot, setSlot] = useState<ReptileRoomSlot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || profileLoading || !user || !id) return;
    let cancelled = false;
    const uid = user.uid;

    async function load() {
      try {
        const rooms = await loadReptileRooms(uid);
        const allSlots = rooms.flatMap((room) => [...room.slots, ...room.storedSlots]);
        const found = allSlots.find((item) => item.id === id) ?? null;
        if (!cancelled) {
          if (!found) setError("This vivarium could not be found in your Reptile Room.");
          else setSlot(found);
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

  return (
    <VivariumBuilder3D
      slot={slot}
      onClose={() => navigate("/reptile-room")}
      onSaved={() => navigate("/reptile-room")}
    />
  );
}
