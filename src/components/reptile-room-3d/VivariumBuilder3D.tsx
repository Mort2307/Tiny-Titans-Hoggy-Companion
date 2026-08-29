import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { loadReptileRooms, type ReptileRoomSlot } from "../services/reptileRoomService";
import { VivariumBuilder3D } from "../components/reptile-room-3d/VivariumBuilder3D";

export default function ReptileRoom3DEditor() {
  const { roomId = "", vivariumId = "" } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [slot, setSlot] = useState<ReptileRoomSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user || !roomId || !vivariumId) return;
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError("");
      try {
        const rooms = await loadReptileRooms(user.uid);
        const room = rooms.find((item) => item.id === roomId);
        const found = room?.objects?.find((item) => item.id === vivariumId);
        if (!found || found.type !== "vivarium") throw new Error("Vivarium not found in this room.");
        const next: ReptileRoomSlot = {
          ...found,
          id: found.id,
          label: found.label ?? "Vivarium",
          w: found.w,
          h: found.h,
          depth: found.depth,
          height: found.height,
        };
        if (!cancelled) setSlot(next);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load vivarium.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [authLoading, user, roomId, vivariumId]);

  if (authLoading || loading) return <div className="page-loading">Loading vivarium builder…</div>;
  if (error || !slot) return <div className="page-error">{error || "Vivarium not found."}</div>;

  return (
    <VivariumBuilder3D
      slot={slot}
      onClose={() => navigate(`/reptile-room/${roomId}`)}
      onSaved={() => undefined}
    />
  );
}
