import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { loadReptileRooms, type ReptileRoomWorkspace } from "../../services/reptileRoomService";
import Room3D from "./Room3D";

export default function ReptileRoomPOVViewer({ onEdit }: { onEdit: () => void }) {
  const { user, loading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState<ReptileRoomWorkspace | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rooms = await loadReptileRooms(user.uid);
      setRoom(rooms[0] ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your reptile room.");
    }
  }, [user]);

  useEffect(() => { if (!loading && !profileLoading) void load(); }, [loading, profileLoading, load]);

  if (!user || loading || profileLoading) return <section className="my-snakes-room-viewer"><div className="my-snakes-room-viewer-status">Loading your reptile room...</div></section>;
  if (error) return <section className="my-snakes-room-viewer"><div className="my-snakes-room-viewer-status">{error}</div></section>;
  if (!room) return <section className="my-snakes-room-viewer"><div className="my-snakes-room-viewer-status">No reptile room has been created yet.</div><button type="button" onClick={onEdit}>Build your room</button></section>;

  const vivariums = room.slots ?? [];

  return <section className="my-snakes-room-viewer" aria-label="Reptile room viewer">
    <div className="my-snakes-room-viewer-header"><div><strong>{room.name}</strong><span>POV room viewer · drag to look around</span></div><button type="button" onClick={onEdit}>Edit Room</button></div>
    {vivariums.length > 0 && (
      <div className="my-snakes-vivarium-builder-strip" aria-label="Vivarium builders">
        <div>
          <strong>Vivarium builders</strong>
          <span>Open an enclosure's dedicated 3D builder to configure its equipment, substrate and husbandry.</span>
        </div>
        <div className="my-snakes-vivarium-builder-buttons">
          {vivariums.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => navigate(`/reptile-room/vivarium/${encodeURIComponent(slot.id)}`)}
            >
              <span>{slot.label || "Vivarium"}</span>
              <small>{slot.snakeId ? "Open builder" : "Configure enclosure"}</small>
            </button>
          ))}
        </div>
      </div>
    )}
    <div className="my-snakes-room-viewer-canvas"><Room3D room={room} objects={room.objects ?? []} slots={room.slots} viewerMode showGrid={false} showCeiling={false} /></div>
  </section>;
}
