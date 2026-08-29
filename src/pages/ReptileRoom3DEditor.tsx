import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { loadReptileRooms, type ReptileRoomSlot } from "../services/reptileRoomService";
import { VivariumBuilder3D } from "../components/reptile-room-3d/VivariumBuilder3D";

export default function ReptileRoom3DEditor() {
  const { id: vivariumId = "" } = useParams();
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
        const found = rooms.flatMap((room) => [...room.slots, ...room.storedSlots]).find((item) => item.id === vivariumId) ?? null;
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
  }, [authLoading, user, vivariumId]);

  if (authLoading || loading) return <div className="page-loading">Loading vivarium builder...</div>;
  if (error || !slot) return <div className="page-error">{error || "Vivarium not found."}</div>;

  return (
    <VivariumBuilder3D
      slot={slot}
      onClose={() => navigate("/reptile-room")}
      onSaved={() => undefined}
    />
  );
}
