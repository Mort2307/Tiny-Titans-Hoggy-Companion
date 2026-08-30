import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { loadReptileRooms, type ReptileRoomWorkspace } from "../../services/reptileRoomService";
import Room3D from "./Room3D";

type Props = {
  onEdit: () => void;
  onOpenVivariumBuilder?: (slotId: string) => void;
};

function readCachedRoom(userId: string): ReptileRoomWorkspace | null {
  try {
    const raw = window.localStorage.getItem(`tinyTitans.reptileRooms.v2:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const candidate = parsed.find((item): item is ReptileRoomWorkspace => Boolean(item && typeof item === "object" && typeof (item as ReptileRoomWorkspace).id === "string" && typeof (item as ReptileRoomWorkspace).name === "string"));
    return candidate ?? null;
  } catch {
    return null;
  }
}

export default function ReptileRoomPOVViewer({ onEdit, onOpenVivariumBuilder }: Props) {
  const { user, loading, profileLoading } = useAuth();
  const [room, setRoom] = useState<ReptileRoomWorkspace | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setError("");
    const cached = readCachedRoom(user.uid);
    if (cached) setRoom(cached);

    try {
      const rooms = await loadReptileRooms(user.uid);
      if (rooms.length > 0) {
        setRoom(rooms[0]);
        return;
      }
      if (!cached) setRoom(null);
    } catch (caught) {
      if (cached) {
        setRoom(cached);
        return;
      }
      setError(caught instanceof Error ? caught.message : "Unable to load your reptile room.");
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !profileLoading) void load();
  }, [loading, profileLoading, load]);

  if (!user || loading || profileLoading) {
    return <section className="my-snakes-room-viewer"><div className="my-snakes-room-viewer-status">Loading your reptile room...</div></section>;
  }

  if (error) {
    return <section className="my-snakes-room-viewer"><div className="my-snakes-room-viewer-status">{error}</div></section>;
  }

  if (!room) {
    return <section className="my-snakes-room-viewer"><div className="my-snakes-room-viewer-status">No reptile room has been created yet.</div><button type="button" onClick={onEdit}>Build your room</button></section>;
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
