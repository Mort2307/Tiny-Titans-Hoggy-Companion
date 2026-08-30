import { useCallback, useEffect, useState } from "react";
import { Vector3 } from "three";
import { useAuth } from "../../context/useAuth";
import { loadReptileRooms, type ReptileRoomWorkspace } from "../../services/reptileRoomService";
import Room3D from "./Room3D";

type Props = {
  onEdit: () => void;
  onOpenVivariumBuilder?: (slotId: string) => void;
};

type RoomCameraWindow = Window & { __tinyTitansRoom3DCamera?: import("three").Camera };

const CAMERA_STEP_METRES = 0.75;
const CAMERA_MARGIN_METRES = 0.35;

function moveCameraRelative(room: ReptileRoomWorkspace, direction: "forward" | "back" | "left" | "right") {
  const camera = (window as RoomCameraWindow).__tinyTitansRoom3DCamera;
  if (!camera) return;

  const forward = camera.getWorldDirection(new Vector3());
  forward.y = 0;
  if (forward.lengthSq() < 0.000001) forward.set(0, 0, -1);
  forward.normalize();

  const up = new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(forward, up).normalize();
  const movement = direction === "forward"
    ? forward
    : direction === "back"
      ? forward.clone().multiplyScalar(-1)
      : direction === "right"
        ? right
        : right.clone().multiplyScalar(-1);

  const next = camera.position.clone().add(movement.multiplyScalar(CAMERA_STEP_METRES));
  const roomWidth = Math.max(1, room.width ?? 360) / 100;
  const roomDepth = Math.max(1, room.depth ?? 300) / 100;
  const margin = Math.min(CAMERA_MARGIN_METRES, roomWidth / 4, roomDepth / 4);
  next.x = Math.min(roomWidth / 2 - margin, Math.max(-roomWidth / 2 + margin, next.x));
  next.z = Math.min(roomDepth / 2 - margin, Math.max(-roomDepth / 2 + margin, next.z));
  camera.position.copy(next);
}

function CameraDirectionPad({ room }: { room: ReptileRoomWorkspace }) {
  const buttonStyle: React.CSSProperties = {
    width: 42,
    height: 38,
    padding: 0,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,.16)",
    borderRadius: 10,
    background: "rgba(9,13,15,.82)",
    color: "#f4f7f8",
    font: "inherit",
    fontSize: 18,
    fontWeight: 900,
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    boxShadow: "0 8px 20px rgba(0,0,0,.28)",
    touchAction: "manipulation",
  };

  const stop = (event: React.PointerEvent<HTMLButtonElement>) => event.stopPropagation();
  const go = (direction: "forward" | "back" | "left" | "right") => moveCameraRelative(room, direction);

  return (
    <div className="my-snakes-camera-direction-pad" aria-label="Camera movement controls">
      <div className="my-snakes-camera-direction-title">CAMERA</div>
      <div className="my-snakes-camera-direction-grid">
        <span aria-hidden="true" />
        <button type="button" style={buttonStyle} aria-label="Move forward in the direction you are facing" title="Forward" onPointerDown={stop} onClick={() => go("forward")}>↑</button>
        <span aria-hidden="true" />
        <button type="button" style={buttonStyle} aria-label="Move left relative to your current view" title="Left" onPointerDown={stop} onClick={() => go("left")}>←</button>
        <button type="button" style={buttonStyle} aria-label="Move backward from the direction you are facing" title="Back" onPointerDown={stop} onClick={() => go("back")}>↓</button>
        <button type="button" style={buttonStyle} aria-label="Move right relative to your current view" title="Right" onPointerDown={stop} onClick={() => go("right")}>→</button>
      </div>
    </div>
  );
}

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
              <button key={slot.id} type="button" onClick={() => onOpenVivariumBuilder?.(slot.id)} disabled={!onOpenVivariumBuilder}>
                <span>{slot.label || "Vivarium"}</span>
                <small>{slot.snakeId ? "Open 3D builder" : "Configure enclosure"}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="my-snakes-room-viewer-canvas">
        <Room3D room={room} objects={room.objects ?? []} slots={room.slots} viewerMode showGrid={false} showCeiling={false} />
        <CameraDirectionPad room={room} />
      </div>
    </section>
  );
}
