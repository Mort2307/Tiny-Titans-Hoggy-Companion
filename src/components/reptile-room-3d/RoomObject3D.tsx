import { useEffect, useMemo, useState } from "react";
import { TextureLoader } from "three";
import type { Texture } from "three";
import type { ThreeEvent } from "@react-three/fiber";
import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld } from "./room3DScale";

type RoomObject3DProps = {
  room: ReptileRoomWorkspace;
  object: ReptileRoomObject | ReptileRoomSlot;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove?: (deltaXcm: number, deltaYcm: number, deltaZcm: number, commit: boolean) => void;
  isSlot?: boolean;
  photoUrl?: string;
};

function dimensions(item: ReptileRoomObject | ReptileRoomSlot) {
  if ("w" in item) return { width: item.w, depth: item.depth ?? item.w, height: item.height ?? 45 };
  return { width: item.width, depth: item.depth, height: item.height };
}

function rotationFor(item: ReptileRoomObject | ReptileRoomSlot): number {
  return "rotation" in item && typeof item.rotation === "number" ? item.rotation : 0;
}

function VivariumPhoto({ url, width, height, depth }: { url: string; width: number; height: number; depth: number }) {
  const [texture, setTexture] = useState<Texture | null>(null);

  useEffect(() => {
    let alive = true;
    const loader = new TextureLoader();
    setTexture(null);

    loader.load(
      url,
      (loaded) => {
        if (!alive) {
          loaded.dispose();
          return;
        }
        loaded.colorSpace = "srgb";
        loaded.needsUpdate = true;
        setTexture(loaded);
      },
      undefined,
      () => {
        if (alive) setTexture(null);
      },
    );

    return () => {
      alive = false;
    };
  }, [url]);

  if (!texture || !url) return null;

  // The photo is a real Three.js plane attached to the vivarium's front (+Z)
  // face. It inherits the vivarium rotation and never billboards toward the camera.
  const photoWidth = Math.max(0.01, width * 0.90);
  const photoHeight = Math.max(0.01, height * 0.82);
  const frontOffset = Math.max(0.004, depth * 0.5 + 0.004);

  return (
    <mesh position={[0, 0, frontOffset]} renderOrder={2}>
      <planeGeometry args={[photoWidth, photoHeight]} />
      <meshBasicMaterial map={texture} toneMapped={false} transparent opacity={0.98} depthWrite={false} />
    </mesh>
  );
}

function FurnitureModel({ kind, width, depth, height, selected }: { kind: string; width: number; depth: number; height: number; selected: boolean }) {
  const colour = selected ? "#d89a32" : "#6a7078";
  const accent = selected ? "#f2bd55" : "#3e444b";
  const legH = Math.max(0.03, height - 0.055);
  const legW = Math.max(0.025, Math.min(width, depth) * 0.045);
  if (kind === "table" || kind === "workbench") { const topThickness = kind === "workbench" ? 0.075 : 0.055; return <group><mesh castShadow receiveShadow position={[0, height / 2 - topThickness / 2, 0]}><boxGeometry args={[width, topThickness, depth]} /><meshStandardMaterial color={colour} roughness={0.68} /></mesh>{[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z]) => <mesh key={`${x}-${z}`} castShadow receiveShadow position={[x * (width / 2 - legW * 1.6), -height / 2 + legH / 2, z * (depth / 2 - legW * 1.6)]}><boxGeometry args={[legW, legH, legW]} /><meshStandardMaterial color={accent} roughness={0.72} /></mesh>)}{kind === "workbench" && <mesh castShadow receiveShadow position={[0, -height * 0.12, -depth * 0.25]}><boxGeometry args={[width * 0.72, height * 0.38, depth * 0.28]} /><meshStandardMaterial color={accent} roughness={0.78} /></mesh>}</group>; }
  if (kind === "chair") { const backH = height * 0.58; return <group><mesh castShadow receiveShadow position={[0, -height * 0.05, 0]}><boxGeometry args={[width, height * 0.08, depth]} /><meshStandardMaterial color={colour} /></mesh>{[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z]) => <mesh key={`${x}-${z}`} castShadow position={[x * (width / 2 - legW * 1.5), -height / 2 + (height * 0.42) / 2, z * (depth / 2 - legW * 1.5)]}><boxGeometry args={[legW, height * 0.42, legW]} /><meshStandardMaterial color={accent} /></mesh>)}<mesh castShadow receiveShadow position={[0, height / 2 - backH / 2, -depth / 2 + legW / 2]}><boxGeometry args={[width * 0.88, backH, legW]} /><meshStandardMaterial color={colour} /></mesh></group>; }
  if (kind === "shelving" || kind === "rack") { const shelfCount = kind === "rack" ? 5 : 4; const shelfThickness = Math.max(0.025, height * 0.025); return <group>{[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={`${x}-${z}`} castShadow position={[x * (width / 2 - legW / 2), 0, z * (depth / 2 - legW / 2)]}><boxGeometry args={[legW, height, legW]} /><meshStandardMaterial color={accent} /></mesh>))}{Array.from({ length: shelfCount }, (_, index) => { const y = -height / 2 + shelfThickness / 2 + index * ((height - shelfThickness) / (shelfCount - 1)); return <mesh key={index} castShadow receiveShadow position={[0, y, 0]}><boxGeometry args={[width - legW * 1.8, shelfThickness, depth - legW * 1.8]} /><meshStandardMaterial color={colour} roughness={0.7} /></mesh>; })}</group>; }
  if (kind === "storage-cabinet") return <group><mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} roughness={0.72} /></mesh><mesh position={[0, 0, depth / 2 + 0.004]}><boxGeometry args={[width * 0.88, height * 0.82, 0.012]} /><meshStandardMaterial color="#30353b" roughness={0.45} /></mesh><mesh position={[0, 0, depth / 2 + 0.012]}><boxGeometry args={[0.012, height * 0.72, 0.012]} /><meshStandardMaterial color={accent} /></mesh><mesh position={[0, 0, depth / 2 + 0.014]}><boxGeometry args={[width * 0.04, 0.04, 0.025]} /><meshStandardMaterial color={accent} metalness={0.35} /></mesh></group>;
  if (kind === "equipment-station") return <group><mesh castShadow receiveShadow position={[0, height / 2 - 0.03, 0]}><boxGeometry args={[width, 0.06, depth]} /><meshStandardMaterial color={colour} /></mesh><mesh castShadow><boxGeometry args={[width * 0.78, height * 0.78, depth * 0.72]} /><meshStandardMaterial color="#454b52" roughness={0.76} /></mesh></group>;
  return <mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} roughness={0.72} /></mesh>;
}

export function RoomObject3D({ room, object, selected, onSelect, isSlot = false, photoUrl }: RoomObject3DProps) {
  const size = dimensions(object);
  const position = useMemo<[number, number, number]>(() => [cmToWorld(object.x + size.width / 2) - cmToWorld(room.width ?? 0) / 2, cmToWorld((object.z ?? 0) + size.height / 2), cmToWorld(object.y + size.depth / 2) - cmToWorld(room.depth ?? 0) / 2], [object.x, object.y, object.z, room.width, room.depth, size.width, size.depth, size.height]);
  const rotationY = rotationFor(object) * Math.PI / 180;
  const bodyHeight = Math.max(0.01, cmToWorld(size.height));
  const bodyWidth = Math.max(0.01, cmToWorld(size.width));
  const bodyDepth = Math.max(0.01, cmToWorld(size.depth));
  const select = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onSelect(object.id); };
  return <group position={position} rotation={[0, rotationY, 0]} userData={{ roomObjectId: object.id, isVivarium: isSlot, magLocked: Boolean(object.stackGroupId) }}>
    <mesh onPointerDown={select} onClick={select} visible={false}><boxGeometry args={[bodyWidth * 1.12, bodyHeight * 1.12, bodyDepth * 1.12]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
    {isSlot ? <>
      <mesh castShadow receiveShadow onPointerDown={select} onClick={select}><boxGeometry args={[bodyWidth, bodyHeight, bodyDepth]} /><meshStandardMaterial color={selected ? "#d89a32" : "#6d4630"} roughness={0.72} transparent opacity={photoUrl ? 0.16 : 0.92} /></mesh>
      <mesh position={[0, 0, bodyDepth / 2 + 0.002]} onPointerDown={select} onClick={select}><boxGeometry args={[bodyWidth * 0.96, bodyHeight * 0.96, 0.008]} /><meshStandardMaterial color="#a8c9d5" metalness={0.18} roughness={0.16} transparent opacity={photoUrl ? 0.10 : 0.28} /></mesh>
      {photoUrl && <VivariumPhoto url={photoUrl} width={bodyWidth} height={bodyHeight} depth={bodyDepth} />}
    </> : <group onPointerDown={select} onClick={select}><FurnitureModel kind={"kind" in object ? object.kind : "asset"} width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} /></group>}
    {selected && <mesh position={[0, bodyHeight / 2 + 0.008, 0]}><boxGeometry args={[bodyWidth + 0.012, 0.012, bodyDepth + 0.012]} /><meshStandardMaterial color="#f2bd55" emissive="#7a4d0d" emissiveIntensity={0.6} /></mesh>}
    {isSlot && object.stackGroupId && <mesh position={[0, bodyHeight + 0.025, 0]}><sphereGeometry args={[0.018, 12, 8]} /><meshStandardMaterial color="#e0a63b" emissive="#6d4307" emissiveIntensity={0.7} /></mesh>}
  </group>;
}

export function getRoomObjectLabel(item: ReptileRoomObject | ReptileRoomSlot): string { return item.label; }