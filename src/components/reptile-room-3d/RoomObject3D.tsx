import { useMemo, useRef, useState } from "react";
import { TransformControls, useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import { cmToWorld } from "./room3DScale";
import type { Object3D } from "three";

type RoomObject3DProps = {
  object: ReptileRoomObject | ReptileRoomSlot;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove?: (deltaXcm: number, deltaYcm: number, deltaZcm: number, commit: boolean) => void;
  isSlot?: boolean;
  photoUrl?: string;
};

function dimensions(item: ReptileRoomObject | ReptileRoomSlot) {
  if ("w" in item) return { width: item.w, depth: item.depth ?? item.w, height: item.height ?? item.h };
  return { width: item.width, depth: item.depth, height: item.height };
}

function rotationFor(item: ReptileRoomObject | ReptileRoomSlot): number {
  return "rotation" in item && typeof item.rotation === "number" ? item.rotation : 0;
}

function VivariumPhoto({ url, width, height, depth }: { url: string; width: number; height: number; depth: number }) {
  const texture = useTexture(url);
  return <mesh position={[0, 0, depth / 2 + 0.004]}><planeGeometry args={[width * 0.92, height * 0.82]} /><meshStandardMaterial map={texture} roughness={0.5} transparent /></mesh>;
}

export function RoomObject3D({ object, selected, onSelect, onMove, isSlot = false, photoUrl }: RoomObject3DProps) {
  const size = dimensions(object);
  const position = useMemo<[number, number, number]>(() => [cmToWorld(object.x + size.width / 2), cmToWorld(object.z + size.height / 2), cmToWorld(object.y + size.depth / 2)], [object.x, object.y, object.z, size.width, size.depth, size.height]);
  const groupRef = useRef<Object3D>(null);
  const [transformObject, setTransformObject] = useState<Object3D | null>(null);
  const lastTransformRef = useRef<[number, number, number] | null>(null);
  const [transforming, setTransforming] = useState(false);
  const rotationY = rotationFor(object) * Math.PI / 180;
  const bodyHeight = Math.max(0.01, cmToWorld(size.height));
  const bodyWidth = Math.max(0.01, cmToWorld(size.width));
  const bodyDepth = Math.max(0.01, cmToWorld(size.depth));

  const select = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect(object.id);
  };

  const startTransform = () => {
    if (!transformObject) return;
    lastTransformRef.current = [transformObject.position.x, transformObject.position.y, transformObject.position.z];
    setTransforming(true);
  };

  const updateTransform = () => {
    if (!transforming || !onMove || !transformObject || !lastTransformRef.current) return;
    const previous = lastTransformRef.current;
    const current = transformObject.position;
    // Three.js X/Z are the room floor axes; Y is vertical. The app stores
    // floor depth as `y` and vertical elevation as `z`.
    const dx = (current.x - previous[0]) * 100;
    const dy = (current.z - previous[2]) * 100;
    const dz = (current.y - previous[1]) * 100;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001 && Math.abs(dz) < 0.001) return;
    lastTransformRef.current = [current.x, current.y, current.z];
    onMove(dx, dy, dz, false);
  };

  const endTransform = () => {
    if (transforming && onMove) onMove(0, 0, 0, true);
    lastTransformRef.current = null;
    setTransforming(false);
  };

  return <>
    <group
      ref={(node) => { groupRef.current = node; setTransformObject(node); }}
      position={position}
      rotation={[0, rotationY, 0]}
      onPointerDown={select}
      onClick={(event) => { event.stopPropagation(); onSelect(object.id); }}
      userData={{ roomObjectId: object.id, isVivarium: isSlot, magLocked: "stackGroupId" in object && Boolean(object.stackGroupId) }}
    >
      <mesh castShadow receiveShadow><boxGeometry args={[bodyWidth, bodyHeight, bodyDepth]} /><meshStandardMaterial color={selected ? "#d89a32" : isSlot ? "#6d4630" : "#4b5057"} roughness={0.72} transparent={isSlot} opacity={isSlot ? 0.92 : 1} /></mesh>
      {isSlot && <mesh position={[0, 0, bodyDepth / 2 + 0.003]}><boxGeometry args={[bodyWidth * 0.94, bodyHeight * 0.94, 0.006]} /><meshStandardMaterial color="#9fc2cf" metalness={0.08} roughness={0.2} transparent opacity={0.3} /></mesh>}
      {isSlot && photoUrl && <VivariumPhoto url={photoUrl} width={bodyWidth} height={bodyHeight} depth={bodyDepth} />}
      {selected && <mesh position={[0, bodyHeight / 2 + 0.008, 0]}><boxGeometry args={[bodyWidth + 0.012, 0.012, bodyDepth + 0.012]} /><meshStandardMaterial color="#f2bd55" emissive="#7a4d0d" emissiveIntensity={0.6} /></mesh>}
      {isSlot && "stackGroupId" in object && object.stackGroupId && <mesh position={[0, bodyHeight + 0.025, 0]}><sphereGeometry args={[0.018, 12, 8]} /><meshStandardMaterial color="#e0a63b" emissive="#6d4307" emissiveIntensity={0.7} /></mesh>}
    </group>
    {selected && onMove && transformObject && <TransformControls
      object={transformObject}
      mode="translate"
      size={0.85}
      onMouseDown={startTransform}
      onObjectChange={updateTransform}
      onMouseUp={endTransform}
    />}
  </>;
}

export function getRoomObjectLabel(item: ReptileRoomObject | ReptileRoomSlot): string { return item.label; }
