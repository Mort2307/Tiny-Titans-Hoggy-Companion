import { Canvas } from "@react-three/fiber";
import type { ReptileRoomObject, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import type { Room3DProps } from "../../types/reptileRoom3D";
import { MeasurementGrid3D } from "./MeasurementGrid3D";
import { RoomCamera3D } from "./RoomCamera3D";
import { RoomObject3D } from "./RoomObject3D";
import { RoomShell3D } from "./RoomShell3D";
import { getRoomDimensions3D } from "./room3DScale";

type RoomSceneProps = Omit<Room3DProps, "className"> & {
  objects: ReptileRoomObject[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function RoomScene({ room, showGrid = true, showCeiling = false, objects, selectedId, onSelect }: RoomSceneProps) {
  const { width, depth, height } = getRoomDimensions3D(room);

  return (
    <>
      <color attach="background" args={["#17191c"]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight intensity={0.45} groundColor="#202226" color="#f2ead9" />
      <directionalLight position={[width * 0.25, height, depth * 0.15]} intensity={1.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <RoomShell3D room={room} showCeiling={showCeiling} />
      {room.slots.map((slot) => (
        <RoomObject3D key={`slot-${slot.id}`} object={slot} isSlot selected={selectedId === slot.id} onSelect={onSelect} />
      ))}
      {objects.map((object) => (
        <RoomObject3D key={object.id} object={object} selected={selectedId === object.id} onSelect={onSelect} />
      ))}
      {showGrid && <MeasurementGrid3D room={room} />}
      <RoomCamera3D room={room} />
    </>
  );
}

export default function Room3D({ room, className, showGrid = true, showCeiling = false, objects = [], selectedId = null, onSelect = () => undefined }: Room3DProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  const cameraPosition: [number, number, number] = [0, height * 0.55, depth * 0.28];

  return (
    <div className={className} style={{ width: "100%", height: "100%", minHeight: 480 }}>
      <Canvas shadows camera={{ position: cameraPosition, fov: 68, near: 0.01, far: Math.max(width, depth, height) * 4 }} dpr={[1, 2]}>
        <RoomScene room={room} showGrid={showGrid} showCeiling={showCeiling} objects={objects} selectedId={selectedId} onSelect={onSelect} />
      </Canvas>
    </div>
  );
}
