import { useMemo, useRef, useState } from "react";
import { TransformControls, useTexture } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import { cmToWorld } from "./room3DScale";
import type { Object3D } from "three";

type RoomObject3DProps = { object: ReptileRoomObject | ReptileRoomSlot; selected: boolean; onSelect: (id: string) => void; onMove?: (deltaXcm: number, deltaYcm: number, deltaZcm: number, commit: boolean) => void; isSlot?: boolean; photoUrl?: string };
function dimensions(item: ReptileRoomObject | ReptileRoomSlot) { if ("w" in item) return { width: item.w, depth: item.depth ?? item.h, height: item.height ?? 45 }; return { width: item.width, depth: item.depth, height: item.height }; }
function rotationFor(item: ReptileRoomObject | ReptileRoomSlot): number { return "rotation" in item && typeof item.rotation === "number" ? item.rotation : 0; }
function VivariumPhoto({ url, width, height, depth }: { url: string; width: number; height: number; depth: number }) { const texture = useTexture(url); return <mesh position={[0, 0, depth / 2 + 0.004]}><planeGeometry args={[width * 0.92, height * 0.82]} /><meshStandardMaterial map={texture} roughness={0.5} transparent /></mesh>; }
function setTransformActive(active: boolean) { if (typeof document === "undefined") return; document.documentElement.dataset.rr3dTransforming = active ? "true" : "false"; }

function FurnitureModel({ kind, width, depth, height, selected }: { kind: string; width: number; depth: number; height: number; selected: boolean }) {
  const colour = selected ? "#d89a32" : "#6a7078";
  const accent = selected ? "#f2bd55" : "#3e444b";
  const legH = Math.max(0.03, height - 0.055);
  const legW = Math.max(0.025, Math.min(width, depth) * 0.045);
  if (kind === "table" || kind === "workbench") {
    const topThickness = kind === "workbench" ? 0.075 : 0.055;
    return <group>
      <mesh castShadow receiveShadow position={[0, height / 2 - topThickness / 2, 0]}><boxGeometry args={[width, topThickness, depth]} /><meshStandardMaterial color={colour} roughness={0.68} /></mesh>
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z]) => <mesh key={`${x}-${z}`} castShadow receiveShadow position={[x * (width / 2 - legW * 1.6), -height / 2 + legH / 2, z * (depth / 2 - legW * 1.6)]}><boxGeometry args={[legW, legH, legW]} /><meshStandardMaterial color={accent} roughness={0.72} /></mesh>)}
      {kind === "workbench" && <mesh castShadow receiveShadow position={[0, -height * 0.12, -depth * 0.25]}><boxGeometry args={[width * 0.72, height * 0.38, depth * 0.28]} /><meshStandardMaterial color={accent} roughness={0.78} /></mesh>}
    </group>;
  }
  if (kind === "chair") {
    const seatY = -height * 0.05;
    const backH = height * 0.58;
    return <group>
      <mesh castShadow receiveShadow position={[0, seatY, 0]}><boxGeometry args={[width, height * 0.08, depth]} /><meshStandardMaterial color={colour} /></mesh>
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z]) => <mesh key={`${x}-${z}`} castShadow position={[x * (width / 2 - legW * 1.5), -height / 2 + (height * 0.42) / 2, z * (depth / 2 - legW * 1.5)]}><boxGeometry args={[legW, height * 0.42, legW]} /><meshStandardMaterial color={accent} /></mesh>)}
      <mesh castShadow receiveShadow position={[0, height / 2 - backH / 2, -depth / 2 + legW / 2]}><boxGeometry args={[width * 0.88, backH, legW]} /><meshStandardMaterial color={colour} /></mesh>
    </group>;
  }
  if (kind === "shelving" || kind === "rack") {
    const shelfCount = kind === "rack" ? 5 : 4;
    const shelfThickness = Math.max(0.025, height * 0.025);
    return <group>
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={`${x}-${z}`} castShadow position={[x * (width / 2 - legW / 2), 0, z * (depth / 2 - legW / 2)]}><boxGeometry args={[legW, height, legW]} /><meshStandardMaterial color={accent} /></mesh>))}
      {Array.from({ length: shelfCount }, (_, index) => { const y = -height / 2 + shelfThickness / 2 + index * ((height - shelfThickness) / (shelfCount - 1)); return <mesh key={index} castShadow receiveShadow position={[0, y, 0]}><boxGeometry args={[width - legW * 1.8, shelfThickness, depth - legW * 1.8]} /><meshStandardMaterial color={colour} roughness={0.7} /></mesh>; })}
    </group>;
  }
  if (kind === "storage-cabinet") {
    return <group>
      <mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} roughness={0.72} /></mesh>
      <mesh position={[0, 0, depth / 2 + 0.004]}><boxGeometry args={[width * 0.88, height * 0.82, 0.012]} /><meshStandardMaterial color="#30353b" roughness={0.45} /></mesh>
      <mesh position={[0, 0, depth / 2 + 0.012]}><boxGeometry args={[0.012, height * 0.72, 0.012]} /><meshStandardMaterial color={accent} /></mesh>
      <mesh position={[0, 0, depth / 2 + 0.014]}><boxGeometry args={[width * 0.04, 0.04, 0.025]} /><meshStandardMaterial color={accent} metalness={0.35} /></mesh>
    </group>;
  }
  if (kind === "equipment-station") {
    return <group>
      <mesh castShadow receiveShadow position={[0, height / 2 - 0.03, 0]}><boxGeometry args={[width, 0.06, depth]} /><meshStandardMaterial color={colour} /></mesh>
      <mesh castShadow position={[0, 0, 0]}><boxGeometry args={[width * 0.78, height * 0.78, depth * 0.72]} /><meshStandardMaterial color="#454b52" roughness={0.76} /></mesh>
      <mesh position={[0, height * 0.12, depth * 0.37]}><boxGeometry args={[width * 0.5, height * 0.18, 0.025]} /><meshStandardMaterial color={accent} emissive={selected ? "#7a4d0d" : "#000000"} emissiveIntensity={selected ? 0.4 : 0} /></mesh>
    </group>;
  }
  return <mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} roughness={0.72} /></mesh>;
}

export function RoomObject3D({ object, selected, onSelect, onMove, isSlot = false, photoUrl }: RoomObject3DProps) {
  const size = dimensions(object);
  const position = useMemo<[number, number, number]>(() => [cmToWorld(object.x + size.width / 2), cmToWorld((object.z ?? 0) + size.height / 2), cmToWorld(object.y + size.depth / 2)], [object.x, object.y, object.z, size.width, size.depth, size.height]);
  const groupRef = useRef<Object3D>(null);
  const [transforming, setTransforming] = useState(false);
  const lastTransformRef = useRef<[number, number, number] | null>(null);
  const rotationY = rotationFor(object) * Math.PI / 180;
  const bodyHeight = Math.max(0.01, cmToWorld(size.height));
  const bodyWidth = Math.max(0.01, cmToWorld(size.width));
  const bodyDepth = Math.max(0.01, cmToWorld(size.depth));
  const select = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onSelect(object.id); };
  const startTransform = () => { setTransformActive(true); setTransforming(true); const node = groupRef.current; if (node) lastTransformRef.current = [node.position.x, node.position.y, node.position.z]; };
  const updateTransform = () => { const node = groupRef.current; const previous = lastTransformRef.current; if (!transforming || !onMove || !node || !previous) return; const current = node.position; const dx = (current.x - previous[0]) * 100; const dy = (current.z - previous[2]) * 100; const dz = (current.y - previous[1]) * 100; if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001 && Math.abs(dz) < 0.001) return; lastTransformRef.current = [current.x, current.y, current.z]; onMove(dx, dy, dz, false); };
  const endTransform = () => { if (transforming && onMove) onMove(0, 0, 0, true); lastTransformRef.current = null; setTransforming(false); setTransformActive(false); };
  return <>
    <group ref={groupRef} position={position} rotation={[0, rotationY, 0]} onPointerDown={select} onClick={select} userData={{ roomObjectId: object.id, isVivarium: isSlot, magLocked: "stackGroupId" in object && Boolean(object.stackGroupId) }}>
      {isSlot ? <>
        <mesh castShadow receiveShadow><boxGeometry args={[bodyWidth, bodyHeight, bodyDepth]} /><meshStandardMaterial color={selected ? "#d89a32" : "#6d4630"} roughness={0.72} transparent opacity={0.92} /></mesh>
        <mesh position={[0, 0, bodyDepth / 2 + 0.003]}><boxGeometry args={[bodyWidth * 0.94, bodyHeight * 0.94, 0.006]} /><meshStandardMaterial color="#9fc2cf" metalness={0.08} roughness={0.2} transparent opacity={0.3} /></mesh>
        {photoUrl && <VivariumPhoto url={photoUrl} width={bodyWidth} height={bodyHeight} depth={bodyDepth} />}
      </> : <FurnitureModel kind={"kind" in object ? object.kind : "asset"} width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} />}
      {selected && <mesh position={[0, bodyHeight / 2 + 0.008, 0]}><boxGeometry args={[bodyWidth + 0.012, 0.012, bodyDepth + 0.012]} /><meshStandardMaterial color="#f2bd55" emissive="#7a4d0d" emissiveIntensity={0.6} /></mesh>}
      {isSlot && "stackGroupId" in object && object.stackGroupId && <mesh position={[0, bodyHeight + 0.025, 0]}><sphereGeometry args={[0.018, 12, 8]} /><meshStandardMaterial color="#e0a63b" emissive="#6d4307" emissiveIntensity={0.7} /></mesh>}
    </group>
    {selected && onMove && groupRef.current && <TransformControls object={groupRef.current} mode="translate" size={0.9} showX showY showZ onMouseDown={startTransform} onObjectChange={updateTransform} onMouseUp={endTransform} />}
  </>;
}

export function getRoomObjectLabel(item: ReptileRoomObject | ReptileRoomSlot): string { return item.label; }
