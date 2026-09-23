import { useMemo } from "react";
import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import type { VivariumTelemetry } from "../../types/reptileRoom3D";
import { getRoomAssetPreset } from "../../data/reptileRoomAssetCatalog";
import { cmToWorld } from "../../lib/room3DScale";
import { dimensionsForRoomObject, rotationForRoomObject } from "../../lib/roomObject3D";
import { FurnitureModel, SimpleFixture, VivariumModel } from "./RoomObjectModels";

type RoomObject3DProps = {
  room: ReptileRoomWorkspace;
  object: ReptileRoomObject | ReptileRoomSlot;
  selected: boolean;
  onSelect: (id: string) => void;
  isSlot?: boolean;
  photoUrl?: string;
  telemetry?: VivariumTelemetry;
};

export function RoomObject3D({ room, object, selected, onSelect, isSlot = false, photoUrl }: RoomObject3DProps) {
  const size = dimensionsForRoomObject(object);
  const position = useMemo<[number, number, number]>(() => [
    cmToWorld(object.x + size.width / 2) - cmToWorld(room.width ?? 0) / 2,
    cmToWorld((object.z ?? 0) + size.height / 2),
    cmToWorld(object.y + size.depth / 2) - cmToWorld(room.depth ?? 0) / 2,
  ], [object.x, object.y, object.z, room.width, room.depth, size.width, size.depth, size.height]);
  const rotationY = (rotationForRoomObject(object) * Math.PI) / 180;
  const bodyHeight = Math.max(0.01, cmToWorld(size.height));
  const bodyWidth = Math.max(0.01, cmToWorld(size.width));
  const bodyDepth = Math.max(0.01, cmToWorld(size.depth));
  const select = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onSelect(object.id); };
  const kind = isSlot ? "vivarium" : (object as ReptileRoomObject).kind;
  const preset = !isSlot ? getRoomAssetPreset((object as ReptileRoomObject).assetId) : undefined;
  const enclosureStyle = isSlot ? ((object as ReptileRoomSlot).config?.enclosureStyle ?? "front-opening") : "front-opening";

  return <group position={position} rotation={[0, rotationY, 0]} userData={{ roomObjectId: object.id, isVivarium: isSlot, magLocked: Boolean(object.stackGroupId) }}>
    <mesh onPointerDown={select} onClick={select} visible={false}>
      <boxGeometry args={[bodyWidth * 1.04, bodyHeight * 1.04, bodyDepth * 1.04]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    {isSlot ? <VivariumModel width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} photoUrl={photoUrl} onSelectGlass={() => onSelect(object.id)} enclosureStyle={enclosureStyle} /> : preset ? <SimpleFixture kind={kind} width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} /> : <FurnitureModel kind={kind} width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} />}
    {selected && <><mesh position={[0, 0, 0]}><boxGeometry args={[bodyWidth * 1.02, bodyHeight * 1.02, bodyDepth * 1.02]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /><Edges color="#e2ad4f" lineWidth={2.5} /></mesh><pointLight position={[0, bodyHeight * 0.45, 0]} intensity={0.28} distance={Math.max(bodyWidth, bodyDepth) * 2.5} color="#e2ad4f" /></>}
  </group>;
}
