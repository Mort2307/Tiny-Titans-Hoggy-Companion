import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import type { Room3DProps, Room3DSelection } from "../../types/reptileRoom3D";
import { ContactShadows } from "@react-three/drei";
import { MeasurementGrid3D } from "./MeasurementGrid3D";
import { RoomCamera3D } from "./RoomCamera3D";
import { RoomNavigation3D } from "./RoomNavigation3D";
import type { RoomNavigationNode } from "./RoomNavigation3D";
import { RoomObject3D } from "./RoomObject3D";
import { RoomShell3D } from "./RoomShell3D";
import { getRoomDimensions3D } from "./room3DScale";

type Props = Omit<Room3DProps,"className"> & {
  objects: ReptileRoomObject[];
  slots: ReptileRoomSlot[];
  selectedId: string | null;
  selectedType: "slot" | "object" | null;
  navigationNode: RoomNavigationNode;
  onTeleport: (node: RoomNavigationNode) => void;
  onSelect: (selection: Room3DSelection) => void;
};

function RoomScene({ room, showGrid = true, showCeiling = false, viewerMode = false, objects, slots, selectedId, selectedType, photoForSlot, telemetryForSlot, onSelect, navigationNode, onTeleport }: RoomSceneProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  return <><color attach="background" args={["#0d1114"]} /><fog attach="fog" args={["#0d1114", Math.max(width, depth) * 0.75, Math.max(width, depth) * 2.6]} /><ambientLight intensity={0.34} /><hemisphereLight intensity={0.62} groundColor="#17191b" color="#f6eee1" /><directionalLight position={[width * 0.22, height * 1.25, depth * 0.18]} intensity={1.18} castShadow shadow-mapSize-width={1536} shadow-mapSize-height={1536} shadow-bias={-0.0002} /><pointLight position={[-width * 0.18, height * 0.8, -depth * 0.18]} intensity={0.32} distance={Math.max(width, depth) * 1.8} color="#f6d7a8" /><pointLight position={[width * 0.2, height * 0.62, depth * 0.2]} intensity={0.22} distance={Math.max(width, depth) * 1.6} color="#cfe9f1" /><RoomShell3D room={room} showCeiling={showCeiling} />{slots.map((slot) => <RoomObject3D key={`slot-${slot.id}`} room={room} object={slot} isSlot photoUrl={photoForSlot?.(slot) ?? slot.photoUrl} telemetry={telemetryForSlot?.(slot)} selected={!viewerMode && selectedType === "slot" && selectedId === slot.id} onSelect={(id) => onSelect({ type: "slot", id })} />)}{objects.map((object) => <RoomObject3D key={object.id} room={room} object={object} selected={!viewerMode && selectedType === "object" && selectedId === object.id} onSelect={(id) => onSelect({ type: "object", id })} />)}{showGrid && !viewerMode && <MeasurementGrid3D room={room} />}{!viewerMode && <RoomNavigation3D room={room} activeNodeId={navigationNode.id} onTeleport={onTeleport} />}{!viewerMode && <ContactShadows position={[0, 0.01, 0]} scale={Math.max(width, depth) * 1.1} opacity={0.28} blur={2.2} far={height * 1.8} />}<RoomCamera3D room={room} target={navigationNode} /></>;
}
