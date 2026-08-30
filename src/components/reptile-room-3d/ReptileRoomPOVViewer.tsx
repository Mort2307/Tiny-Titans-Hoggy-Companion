import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { loadReptileRooms, type ReptileRoomWorkspace } from "../../services/reptileRoomService";
import Room3D from "./Room3D";

type Props = {
  onEdit: () => void;
  onOpenVivariumBuilder?: (slotId: string) => void;
};

export default function ReptileRoomPOVViewer({ onEdit, onOpenVivariumBuilder }: Props) {
  const { user, loading, profileLoading } = useAuth();
  const [room, setRoom] = useState<ReptileRoomWorkspace | null>(null);
  const [error, setError] = useState("");
  const [roomLoadComplete, setRoomLoadComplete] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setRoomLoadComplete(false);
    setError("");
    try {
      const rooms = await loadReptileRooms(user.uid);
      setRoom(rooms[0] ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load your reptile room.");
      setRoom(null);
    } finally {
      setRoomLoadComplete(true);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !profileLoading && user) void load();
  }, [loading, profileLoading, user, load]);

  if (!user || loading || profileLoading || !roomLoadComplete) {
    return (
      <section className="my-snakes-room-viewer">
        <div className="my-snakes-room-viewer-status">Loading your reptile room...</div>
      </section>
    );
  }

  if (error) {
    return <section className="my-snakes-room-viewer"><div className="my-snakes-room-viewer-status">{error}</div></section>;
  }

  if (!room) {
    return (
      <section className="my-snakes-room-viewer">
        <div className="my-snakes-room-viewer-status">No reptile room has been created yet.</div>
        <button type="button" onClick={onEdit}>Build your room</button>
      </section>
    );
  }

  const vivariums = room.slots ?? [];

  return (
    <section className="my-snakes-room-viewer" aria-label="Reptile room viewer">
      <div className="my-snakes-room-viewer-header">
        <div><strong>{room.name}</strong><span>POV room viewer · drag to look around</span></div>
        <button type="button" onClick={onEdit}>Edit Room</button>
      </div>

      {vivariums.length > 0 && (
        <div className="my-snakes-vivarium-builder-strip" aria-label="Vivarium builders">
          <div>
            <strong>Vivarium builders</strong>
            <span>Open a specific enclosure's dedicated 3D builder to configure its equipment, substrate and husbandry.</span>
          </div>
          <div className="my-snakes-vivarium-builder-buttons">
            {vivariums.map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => onOpenVivariumBuilder?.(slot.id)}
                disabled={!onOpenVivariumBuilder}
              >
                <span>{slot.label || "Vivarium"}</span>
                <small>{slot.snakeId ? "Open 3D builder" : "Configure enclosure"}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="my-snakes-room-viewer-canvas">
        <Room3D room={room} objects={room.objects ?? []} slots={room.slots} viewerMode showGrid={false} showCeiling={false} />
      </div>
    </section>
  );
}
