import { useEffect, useMemo, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld } from "./room3DScale";

type Room3DMoveHandler = (dx: number, dy: number, dz: number, commit: boolean) => void;
type RoomObject3DProps = { room: ReptileRoomWorkspace; object: ReptileRoomObject | ReptileRoomSlot; selected: boolean; onSelect: (id: string) => void; onMove?: Room3DMoveHandler; isSlot?: boolean; photoUrl?: string };
type SlotWithRotation = ReptileRoomSlot & { rotation?: number };

const woodPalette = { oak: "#8a5b32", teak: "#7f5232", dark: "#4a3022" };
const woodColour = (kind: string) => kind === "oak-table" || kind === "table" ? woodPalette.oak : kind === "teak-corner-unit" || kind === "cabinet" ? woodPalette.teak : woodPalette.dark;
function dimensions(object: ReptileRoomObject | ReptileRoomSlot) { if ("width" in object) return { width: object.width, depth: object.depth, height: object.height }; return { width: object.w, depth: object.depth ?? object.h, height: object.height ?? 40 }; }
function rotationFor(object: ReptileRoomObject | ReptileRoomSlot) { return "width" in object ? object.rotation ?? 0 : (object as SlotWithRotation).rotation ?? 0; }
function makeWoodTexture(base: string) {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d"); if (!ctx) return null; ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 512);
  const grain = base === woodPalette.teak ? [58, 34, 22] : [54, 34, 22];
  for (let i = 0; i < 70; i += 1) { const y = i * 8 + 3; ctx.beginPath(); ctx.strokeStyle = `rgba(${grain[0]},${grain[1]},${grain[2]},${0.08 + (i % 5) * 0.014})`; ctx.lineWidth = 0.7 + (i % 4) * 0.45; ctx.moveTo(-40, y); ctx.bezierCurveTo(90, y - 28, 220, y + 24, 560, y - 6); ctx.stroke(); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2.2, 2.2); texture.anisotropy = 4; return texture;
}
function FurnitureModel({ kind, width, depth, height, selected }: { kind: string; width: number; depth: number; height: number; selected: boolean }) {
  const colour = woodColour(kind); const accent = selected ? "#e2ad4f" : "#6f7880"; const woodTexture = useMemo(() => makeWoodTexture(colour), [colour]); useEffect(() => () => woodTexture?.dispose(), [woodTexture]); const woodMaterial = <meshStandardMaterial color={colour} map={woodTexture ?? undefined} roughness={0.72} metalness={0.02} />;
  if (kind === "table" || kind === "oak-table") return <group><mesh castShadow receiveShadow position={[0, height - 0.05, 0]}><boxGeometry args={[width, 0.1, depth]} />{woodMaterial}</mesh>{[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={`${x}-${z}`} castShadow receiveShadow position={[x * width * 0.39, height * 0.42, z * depth * 0.39]}><boxGeometry args={[0.07, height * 0.84, 0.07]} />{woodMaterial}</mesh>))}<mesh position={[0, height * 0.56, 0]} receiveShadow><boxGeometry args={[width * 0.72, height * 0.04, depth * 0.7]} /><meshStandardMaterial color="#3c2720" roughness={0.86} /></mesh></group>;
  if (kind === "cabinet" || kind === "teak-corner-unit") return <group><mesh castShadow receiveShadow position={[0, height / 2, 0]}><boxGeometry args={[width, height, depth]} />{woodMaterial}</mesh><mesh position={[0, height / 2, depth / 2 + 0.008]}><boxGeometry args={[width * 0.92, height * 0.78, 0.018]} /><meshStandardMaterial color="#5a3628" roughness={0.48} /></mesh><mesh position={[0, height * 0.5, depth / 2 + 0.022]}><boxGeometry args={[width * 0.035, 0.035, 0.03]} /><meshStandardMaterial color={accent} metalness={0.52} roughness={0.26} /></mesh></group>;
  if (kind === "shelving" || kind === "rack") return <group>{[0.08, 0.31, 0.54, 0.77, 0.96].map((level) => <mesh key={level} castShadow receiveShadow position={[0, height * level, 0]}><boxGeometry args={[width, 0.045, depth]} /><meshStandardMaterial color={kind === "rack" ? "#343a40" : colour} roughness={0.76} metalness={kind === "rack" ? 0.2 : 0.02} /></mesh>)}<mesh position={[-width * 0.45, height / 2, 0]}><boxGeometry args={[0.045, height, 0.045]} /><meshStandardMaterial color={accent} metalness={0.45} roughness={0.3} /></mesh><mesh position={[width * 0.45, height / 2, 0]}><boxGeometry args={[0.045, height, 0.045]} /><meshStandardMaterial color={accent} metalness={0.45} roughness={0.3} /></mesh></group>;
  if (kind === "workbench") return <group><mesh castShadow receiveShadow position={[0, height - 0.05, 0]}><boxGeometry args={[width, 0.1, depth]} />{woodMaterial}</mesh>{[-1, 1].map((x) => <mesh key={x} position={[x * width * 0.42, height / 2, -depth * 0.42]} castShadow><boxGeometry args={[0.07, height, 0.07]} />{woodMaterial}</mesh>)}</group>;
  return <mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} />{woodMaterial}</mesh>;
}
function VivariumPhoto({ url, width, height, z }: { url: string; width: number; height: number; z: number }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => { let active = true; setTexture(null); const loader = new THREE.TextureLoader(); loader.setCrossOrigin("anonymous"); loader.load(url, (loaded) => { if (!active) { loaded.dispose(); return; } loaded.colorSpace = THREE.SRGBColorSpace; loaded.wrapS = THREE.ClampToEdgeWrapping; loaded.wrapT = THREE.ClampToEdgeWrapping; loaded.minFilter = THREE.LinearFilter; loaded.magFilter = THREE.LinearFilter; loaded.anisotropy = 4; loaded.needsUpdate = true; setTexture(loaded); }, undefined, () => { if (active) setTexture(null); }); return () => { active = false; }; }, [url]);
  useEffect(() => () => texture?.dispose(), [texture]); if (!texture) return null;
  return <mesh position={[0, 0, z]} renderOrder={3} userData={{ vivariumFaceImage: true }}><planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} toneMapped={false} depthWrite={false} depthTest={false} side={THREE.DoubleSide} /></mesh>;
}
function VivariumModel({ width, depth, height, selected, photoUrl }: { width: number; depth: number; height: number; selected: boolean; photoUrl?: string }) {
  const frame = Math.max(Math.min(width, height) * 0.046, 0.026); const wood = woodPalette.dark; const trim = selected ? "#e2ad4f" : wood; const glassWidth = Math.max(0.01, width - frame * 2); const glassHeight = Math.max(0.01, height - frame * 2); const frontZ = depth / 2;
  const woodTexture = useMemo(() => makeWoodTexture(wood), []); useEffect(() => () => woodTexture?.dispose(), [woodTexture]); const frameMaterial = <meshStandardMaterial color={trim} map={woodTexture ?? undefined} roughness={0.62} metalness={0.02} />;
  return <group>
    <mesh castShadow receiveShadow position={[0, 0, -depth / 2 + frame / 2]}><boxGeometry args={[width, height, frame]} />{frameMaterial}</mesh>
    <mesh castShadow receiveShadow position={[-width / 2 + frame / 2, 0, 0]}><boxGeometry args={[frame, height, depth]} />{frameMaterial}</mesh>
    <mesh castShadow receiveShadow position={[width / 2 - frame / 2, 0, 0]}><boxGeometry args={[frame, height, depth]} />{frameMaterial}</mesh>
    <mesh castShadow receiveShadow position={[0, height / 2 - frame / 2, 0]}><boxGeometry args={[width, frame, depth]} />{frameMaterial}</mesh>
    <mesh castShadow receiveShadow position={[0, -height / 2 + frame / 2, 0]}><boxGeometry args={[width, frame, depth]} />{frameMaterial}</mesh>
    <mesh position={[0, 0, -depth / 2 + frame + 0.006]}><planeGeometry args={[Math.max(0.01, width - frame * 2), Math.max(0.01, height - frame * 2)]} /><meshStandardMaterial color="#121719" roughness={0.96} /></mesh>
    <mesh position={[0, 0, frontZ + 0.004]} renderOrder={1}><planeGeometry args={[glassWidth, glassHeight]} /><meshPhysicalMaterial color="#c2e2e7" transparent opacity={photoUrl ? 0.07 : 0.19} roughness={0.025} metalness={0.04} transmission={0.12} thickness={0.02} depthWrite={false} side={THREE.DoubleSide} /></mesh>
    {photoUrl && <VivariumPhoto url={photoUrl} width={glassWidth * 0.985} height={glassHeight * 0.985} z={frontZ + 0.013} />}
    <mesh position={[0, height / 2 - frame / 2, frontZ + 0.035]}><boxGeometry args={[width, frame, frame * 1.6]} />{frameMaterial}</mesh>
    <mesh position={[0, -height / 2 + frame / 2, frontZ + 0.035]}><boxGeometry args={[width, frame, frame * 1.6]} />{frameMaterial}</mesh>
    <mesh position={[-width / 2 + frame / 2, 0, frontZ + 0.035]}><boxGeometry args={[frame, height, frame * 1.6]} />{frameMaterial}</mesh>
    <mesh position={[width / 2 - frame / 2, 0, frontZ + 0.035]}><boxGeometry args={[frame, height, frame * 1.6]} />{frameMaterial}</mesh>
    <mesh position={[width * 0.39, 0, frontZ + 0.055]} castShadow><boxGeometry args={[frame * 0.48, height * 0.18, frame * 0.7]} /><meshStandardMaterial color="#4e555b" metalness={0.8} roughness={0.22} /></mesh>
    <mesh position={[width * 0.39, 0, frontZ + 0.09]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[frame * 0.55, frame * 0.16, 16, 28]} /><meshStandardMaterial color="#c7cdd1" metalness={0.86} roughness={0.18} /></mesh>
    {!photoUrl && <mesh position={[0, 0, frontZ + 0.012]} renderOrder={2}><planeGeometry args={[glassWidth * 0.9, glassHeight * 0.9]} /><meshPhysicalMaterial color="#d7edf0" transparent opacity={0.035} roughness={0.2} metalness={0.02} depthWrite={false} side={THREE.DoubleSide} /></mesh>}
  </group>;
}
export function RoomObject3D({ room, object, selected, onSelect, isSlot = false, photoUrl }: RoomObject3DProps) {
  const size = dimensions(object); const position = useMemo<[number, number, number]>(() => [cmToWorld(object.x + size.width / 2) - cmToWorld(room.width ?? 0) / 2, cmToWorld((object.z ?? 0) + size.height / 2), cmToWorld(object.y + size.depth / 2) - cmToWorld(room.depth ?? 0) / 2], [object.x, object.y, object.z, room.width, room.depth, size.width, size.depth, size.height]); const rotationY = rotationFor(object) * Math.PI / 180; const bodyHeight = Math.max(0.01, cmToWorld(size.height)); const bodyWidth = Math.max(0.01, cmToWorld(size.width)); const bodyDepth = Math.max(0.01, cmToWorld(size.depth)); const select = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onSelect(object.id); };
  return <group position={position} rotation={[0, rotationY, 0]} userData={{ roomObjectId: object.id, isVivarium: isSlot, magLocked: Boolean(object.stackGroupId) }}><mesh onPointerDown={select} onClick={select} visible={false}><boxGeometry args={[bodyWidth * 1.08, bodyHeight * 1.08, bodyDepth * 1.08]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>{isSlot ? <VivariumModel width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} photoUrl={photoUrl} /> : <FurnitureModel kind={(object as ReptileRoomObject).kind} width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} />}{selected && <mesh position={[0, -bodyHeight / 2 + 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[Math.max(bodyWidth, bodyDepth) * 0.43, Math.max(bodyWidth, bodyDepth) * 0.47, 48]} /><meshBasicMaterial color="#e2ad4f" transparent opacity={0.8} depthWrite={false} /></mesh>}</group>;
}
