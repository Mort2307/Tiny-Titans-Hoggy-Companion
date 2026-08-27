import { useMemo, useState } from "react";
import { useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import { cmToWorld } from "./room3DScale";

type RoomObject3DProps = {
  object: ReptileRoomObject | ReptileRoomSlot;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove?: (deltaXcm: number, deltaYcm: number, commit: boolean) => void;
  isSlot?: boolean;
  photoUrl?: string;
};

function dimensions(item: ReptileRoomObject | ReptileRoomSlot) {
  if ("w" in item) {
    return { width: item.w, depth: item.depth ?? item.w, height: item.height ?? item.h };
  }
  return { width: item.width, depth: item.depth, height: item.height };
}

function rotationFor(item: ReptileRoomObject | ReptileRoomSlot): number {
  return "rotation" in item && typeof item.rotation === "number" ? item.rotation : 0;
}

function VivariumPhoto({ url, width, height, depth }: { url: string; width: number; height: number; depth: number }) {
  const texture = useTexture(url);
  return (
    <mesh position={[0, 0, depth / 2 + 0.004]}>
      <planeGeometry args={[Math.max(0.01, width * 0.92), Math.max(0.01, height * 0.82)]} />
      <meshStandardMaterial map={texture} roughness={0.5} transparent />
    </mesh>
  );
}

export function RoomObject3D({ object, selected, onSelect, onMove, isSlot = false, photoUrl }: RoomObject3DProps) {
  const size = dimensions(object);
  const position = useMemo<[number, number, number]>(() => [
    cmToWorld(object.x + size.width / 2),
    cmToWorld(object.z + size.height / 2),
    cmToWorld(object.y + size.depth / 2),
  ], [object.x, object.y, object.z, size.width, size.depth, size.height]);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<[number, number] | null>(null);
  const rotationY = rotationFor(object) * Math.PI / 180;
  const bodyHeight = Math.max(0.01, cmToWorld(size.height));
  const bodyWidth = Math.max(0.01, cmToWorld(size.width));
  const bodyDepth = Math.max(0.01, cmToWorld(size.depth));

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect(object.id);
    if (!onMove) return;
    setDragging(true);
    setDragStart([event.point.x, event.point.z]);
    event.target.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!dragging || !dragStart || !onMove) return;
    event.stopPropagation();
    const dx = (event.point.x - dragStart[0]) * 100;
    const dy = (event.point.z - dragStart[1]) * 100;
    if (Math.abs(dx) > 0.25 || Math.abs(dy) > 0.25) onMove(dx, dy, false);
    setDragStart([event.point.x, event.point.z]);
  };

  const handlePointerUp = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (dragging && onMove) onMove(0, 0, true);
    setDragging(false);
    setDragStart(null);
  };

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(event) => { event.stopPropagation(); onSelect(object.id); }}
      userData={{ roomObjectId: object.id, isVivarium: isSlot, magLocked: "stackGroupId" in object && Boolean(object.stackGroupId) }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[bodyWidth, bodyHeight, bodyDepth]} />
        <meshStandardMaterial color={selected ? "#d89a32" : isSlot ? "#6d4630" : "#4b5057"} roughness={0.72} transparent={isSlot} opacity={isSlot ? 0.92 : 1} />
      </mesh>
      {isSlot && <mesh position={[0, 0, bodyDepth / 2 + 0.003]}><boxGeometry args={[bodyWidth * 0.94, bodyHeight * 0.94, 0.006]} /><meshStandardMaterial color="#9fc2cf" metalness={0.08} roughness={0.2} transparent opacity={0.3} /></mesh>}
      {isSlot && photoUrl && <VivariumPhoto url={photoUrl} width={bodyWidth} height={bodyHeight} depth={bodyDepth} />}
      {selected && <mesh position={[0, bodyHeight / 2 + 0.008, 0]}><boxGeometry args={[bodyWidth + 0.012, 0.012, bodyDepth + 0.012]} /><meshStandardMaterial color="#f2bd55" emissive="#7a4d0d" emissiveIntensity={0.6} /></mesh>}
      {isSlot && "stackGroupId" in object && object.stackGroupId && <mesh position={[0, bodyHeight + 0.025, 0]}><sphereGeometry args={[0.018, 12, 8]} /><meshStandardMaterial color="#e0a63b" emissive="#6d4307" emissiveIntensity={0.7} /></mesh>}
    </group>
  );
}

export function getRoomObjectLabel(item: ReptileRoomObject | ReptileRoomSlot): string { return item.label; }
