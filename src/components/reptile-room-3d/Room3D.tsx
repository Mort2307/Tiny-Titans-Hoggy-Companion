import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import type { Room3DProps, Room3DSelection } from "../../types/reptileRoom3D";
import { MeasurementGrid3D } from "./MeasurementGrid3D";
import { RoomCamera3D } from "./RoomCamera3D";
import { RoomNavigation3D, buildRoomNavigationNodes } from "./RoomNavigation3D";
import type { RoomNavigationNode } from "./RoomNavigation3D";
import { RoomObject3D } from "./RoomObject3D";
import { RoomShell3D } from "./RoomShell3D";
import { RoomAssetLibrary3D } from "./RoomAssetLibrary3D";
import { getRoomDimensions3D } from "./room3DScale";
import type { Camera } from "three";

type RoomSceneProps = Omit<Room3DProps, "className"> & {
  objects: ReptileRoomObject[];
  slots: ReptileRoomSlot[];
  selectedId: string | null;
  selectedType: "slot" | "object" | null;
  navigationNode: RoomNavigationNode;
  onSelect: (selection: Room3DSelection) => void;
  onTeleport: (node: RoomNavigationNode) => void;
};

function RoomScene({
  room,
  showGrid = true,
  showCeiling = false,
  objects,
  slots,
  selectedId,
  selectedType,
  photoForSlot,
  onSelect,
  onMove,
  navigationNode,
  onTeleport,
  ...assetLibraryProps
}: RoomSceneProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  const handleMove = (
    type: "slot" | "object",
    id: string,
    dx: number,
    dy: number,
    dz: number,
    commit: boolean,
  ) => onMove?.({ type, id }, dx, dy, dz, commit);

  return (
    <>
      <color attach="background" args={["#17191c"]} />
      <ambientLight intensity={0.6} />
      <hemisphereLight intensity={0.45} groundColor="#202226" color="#f2ead9" />
      <directionalLight
        position={[width * 0.25, height, depth * 0.15]}
        intensity={1.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <RoomShell3D room={room} showCeiling={showCeiling} />

      {slots.map((slot) => (
        <RoomObject3D
          key={`slot-${slot.id}`}
          object={slot}
          isSlot
          photoUrl={photoForSlot?.(slot)}
          selected={selectedType === "slot" && selectedId === slot.id}
          onSelect={(id) => onSelect({ type: "slot", id })}
          onMove={(dx, dy, dz, commit) => handleMove("slot", slot.id, dx, dy, dz, commit)}
        />
      ))}

      {objects.map((object) => (
        <RoomObject3D
          key={object.id}
          object={object}
          selected={selectedType === "object" && selectedId === object.id}
          onSelect={(id) => onSelect({ type: "object", id })}
          onMove={(dx, dy, dz, commit) => handleMove("object", object.id, dx, dy, dz, commit)}
        />
      ))}

      {showGrid && <MeasurementGrid3D room={room} />}
      <RoomNavigation3D room={room} activeNodeId={navigationNode.id} onTeleport={onTeleport} />
      <RoomCamera3D room={room} target={navigationNode} />
      <RoomAssetLibrary3D room={room} {...assetLibraryProps} />
    </>
  );
}

export default function Room3D({
  room,
  className,
  showGrid = true,
  showCeiling = false,
  objects = [],
  slots = [],
  selectedId = null,
  selectedType = null,
  photoForSlot,
  onSelect = () => undefined,
  onMove,
  ...assetLibraryProps
}: Room3DProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  const cameraPosition: [number, number, number] = [
    0,
    Math.max(0.5, height * 0.55),
    Math.max(0.5, depth * 0.28),
  ];
  const navigationNodes = useMemo(() => buildRoomNavigationNodes(room), [room]);
  const defaultNode = useMemo(
    () =>
      navigationNodes.reduce<RoomNavigationNode | null>(
        (closest, node) =>
          !closest || Math.hypot(node.xCm, node.zCm) < Math.hypot(closest.xCm, closest.zCm)
            ? node
            : closest,
        null,
      ) ?? { id: "nav-centre", xCm: 0, zCm: 0 },
    [navigationNodes],
  );
  const [navigationNode, setNavigationNode] = useState<RoomNavigationNode>(defaultNode);
  useEffect(() => setNavigationNode(defaultNode), [defaultNode]);

  return (
    <div className={className} style={{ width: "100%", height: "100%", minHeight: 480 }}>
      <Canvas
        shadows
        camera={{
          position: cameraPosition,
          fov: 68,
          near: 0.01,
          far: Math.max(width, depth, height) * 4,
        }}
        dpr={[1, 2]}
        onCreated={({ camera }) => {
          (window as Window & { __tinyTitansRoom3DCamera?: Camera }).__tinyTitansRoom3DCamera = camera;
        }}
        onPointerMissed={() => onSelect(null)}
      >
        <RoomScene
          room={room}
          showGrid={showGrid}
          showCeiling={showCeiling}
          objects={objects}
          slots={slots}
          selectedId={selectedId}
          selectedType={selectedType}
          photoForSlot={photoForSlot}
          onSelect={onSelect}
          onMove={onMove}
          navigationNode={navigationNode}
          onTeleport={setNavigationNode}
          {...assetLibraryProps}
        />
      </Canvas>
    </div>
  );
}
