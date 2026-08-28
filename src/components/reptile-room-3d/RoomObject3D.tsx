import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld } from "./room3DScale";

type Room3DMoveHandler = (dx: number, dy: number, dz: number, commit: boolean) => void;
type RoomObject3DProps = { room: ReptileRoomWorkspace; object: ReptileRoomObject | ReptileRoomSlot; selected: boolean; onSelect: (id: string) => void; onMove?: Room3DMoveHandler; isSlot?: boolean; photoUrl?: string };
type SlotWithRotation = ReptileRoomSlot & { rotation?: number };

const woodColour = (kind: string) => kind === "oak-table" || kind === "table" ? "#8b5a2b" : kind === "teak-corner-unit" || kind === "cabinet" ? "#a66a3f" : "#5a3a24";

function dimensions(object: ReptileRoomObject | ReptileRoomSlot) {
  if ("width" in object) return { width: object.width, depth: object.depth, height: object.height };
  return { width: object.w, depth: object.depth ?? object.h, height: object.height ?? 40 };
}

function rotationFor(object: ReptileRoomObject | ReptileRoomSlot) {
  return "width" in object ? object.rotation ?? 0 : (object as SlotWithRotation).rotation ?? 0;
}

function FurnitureModel({ kind, width, depth, height, selected }: { kind: string; width: number; depth: number; height: number; selected: boolean }) {
  const colour = woodColour(kind);
  const accent = selected ? "#d89a32" : "#5b6570";
  if (kind === "table" || kind === "oak-table") return <group><mesh castShadow receiveShadow position={[0, height / 2 - 0.05, 0]}><boxGeometry args={[width, 0.1, depth]} /><meshStandardMaterial color={colour} roughness={0.66} /></mesh>{[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <mesh key={`${x}-${z}`} castShadow receiveShadow position={[x * width * 0.39, height * 0.22, z * depth * 0.39]}><boxGeometry args={[0.07, height * 0.44, 0.07]} /><meshStandardMaterial color={colour} /></mesh>)}</group>;
  if (kind === "cabinet" || kind === "teak-corner-unit") return <group><mesh castShadow receiveShadow position={[0, height / 2, 0]}><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} roughness={0.62} /></mesh><mesh position={[0, height / 2, depth / 2 + 0.008]}><boxGeometry args={[width * 0.92, height * 0.78, 0.018]} /><meshStandardMaterial color="#6d432c" roughness={0.5} /></mesh><mesh position={[0, height * 0.5, depth / 2 + 0.022]}><boxGeometry args={[width * 0.035, 0.035, 0.03]} /><meshStandardMaterial color={accent} metalness={0.35} /></mesh></group>;
  if (kind === "shelving" || kind === "rack") return <group>{[0.08, 0.31, 0.54, 0.77, 0.96].map((level) => <mesh key={level} castShadow receiveShadow position={[0, height * level, 0]}><boxGeometry args={[width, 0.045, depth]} /><meshStandardMaterial color={kind === "rack" ? "#3d4248" : colour} roughness={0.7} /></mesh>)}<mesh position={[-width * 0.45, height / 2, 0]}><boxGeometry args={[0.045, height, 0.045]} /><meshStandardMaterial color={accent} /></mesh><mesh position={[width * 0.45, height / 2, 0]}><boxGeometry args={[0.045, height, 0.045]} /><meshStandardMaterial color={accent} /></mesh></group>;
  if (kind === "workbench") return <group><mesh castShadow receiveShadow position={[0, height - 0.05, 0]}><boxGeometry args={[width, 0.1, depth]} /><meshStandardMaterial color={colour} /></mesh>{[-1, 1].map((x) => <mesh key={x} position={[x * width * 0.42, height / 2, -depth * 0.42]}><boxGeometry args={[0.07, height, 0.07]} /><meshStandardMaterial color={colour} /></mesh>)}</group>;
  return <mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} roughness={0.72} /></mesh>;
}

function makeWoodTexture(base: string) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  const rgb = base === "#a66a3f" ? [120, 70, 38] : [100, 60, 28];
  for (let i = 0; i < 22; i += 1) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.18 + (i % 4) * 0.04})`;
    ctx.lineWidth = 1 + (i % 3);
    ctx.moveTo(-20, i * 13 + 5);
    ctx.bezierCurveTo(65, i * 13 - 10, 150, i * 13 + 18, 276, i * 13 - 2);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

function VivariumPhoto({ url, width, height, z }: { url: string; width: number; height: number; z: number }) {
  return (
    <Html
      transform
      position={[0, 0, z]}
      distanceFactor={400}
      center
      zIndexRange={[20, 10]}
      style={{
        width: "100%",
        height: "100%",
        padding: 0,
        margin: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: "transparent",
      }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        referrerPolicy="no-referrer"
        style={{
          display: "block",
          width: `${Math.max(1, width * 100)}px`,
          height: `${Math.max(1, height * 100)}px`,
          maxWidth: `${Math.max(1, width * 100)}px`,
          maxHeight: `${Math.max(1, height * 100)}px`,
          objectFit: "cover",
          objectPosition: "center",
          margin: 0,
          padding: 0,
          border: 0,
          opacity: 0.98,
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </Html>
  );
}

function VivariumModel({ width, depth, height, selected, photoUrl }: { width: number; depth: number; height: number; selected: boolean; photoUrl?: string }) {
  const frame = Math.max(Math.min(width, height) * 0.045, 0.025);
  const wood = "#6b3f20";
  const trim = selected ? "#d89a32" : wood;
  const glassWidth = Math.max(0.01, width - frame * 2);
  const glassHeight = Math.max(0.01, height - frame * 2);
  const frontZ = depth / 2;
  const woodTexture = useMemo(() => makeWoodTexture(wood), []);
  const woodMaterial = <meshStandardMaterial color={trim} map={woodTexture ?? undefined} roughness={0.58} />;

  return <group>
    <mesh castShadow receiveShadow position={[0, 0, -depth / 2 + frame / 2]}><boxGeometry args={[width, height, frame]} />{woodMaterial}</mesh>
    <mesh castShadow receiveShadow position={[-width / 2 + frame / 2, 0, 0]}><boxGeometry args={[frame, height, depth]} />{woodMaterial}</mesh>
    <mesh castShadow receiveShadow position={[width / 2 - frame / 2, 0, 0]}><boxGeometry args={[frame, height, depth]} />{woodMaterial}</mesh>
    <mesh castShadow receiveShadow position={[0, height / 2 - frame / 2, 0]}><boxGeometry args={[width, frame, depth]} />{woodMaterial}</mesh>
    <mesh castShadow receiveShadow position={[0, -height / 2 + frame / 2, 0]}><boxGeometry args={[width, frame, depth]} />{woodMaterial}</mesh>

    <mesh position={[0, 0, -depth / 2 + frame + 0.006]}>
      <planeGeometry args={[glassWidth, glassHeight]} />
      <meshStandardMaterial color="#17191b" roughness={0.9} />
    </mesh>

    <mesh position={[0, 0, frontZ + 0.006]} renderOrder={1}>
      <planeGeometry args={[glassWidth, glassHeight]} />
      <meshPhysicalMaterial color="#b8dce2" transparent opacity={photoUrl ? 0.025 : 0.16} roughness={0.03} metalness={0.05} transmission={0.05} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>

    {photoUrl && <VivariumPhoto url={photoUrl} width={glassWidth * 0.985} height={glassHeight * 0.985} z={frontZ + 0.012} />}

    <mesh position={[0, height / 2 - frame / 2, frontZ + 0.035]}><boxGeometry args={[width, frame, frame * 1.6]} />{woodMaterial}</mesh>
    <mesh position={[0, -height / 2 + frame / 2, frontZ + 0.035]}><boxGeometry args={[width, frame, frame * 1.6]} />{woodMaterial}</mesh>
    <mesh position={[-width / 2 + frame / 2, 0, frontZ + 0.035]}><boxGeometry args={[frame, height, frame * 1.6]} />{woodMaterial}</mesh>
    <mesh position={[width / 2 - frame / 2, 0, frontZ + 0.035]}><boxGeometry args={[frame, height, frame * 1.6]} />{woodMaterial}</mesh>

    <mesh position={[width * 0.39, 0, frontZ + 0.055]} castShadow><boxGeometry args={[frame * 0.48, height * 0.18, frame * 0.7]} /><meshStandardMaterial color="#4d5358" metalness={0.75} roughness={0.25} /></mesh>
    <mesh position={[width * 0.39, 0, frontZ + 0.09]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[frame * 0.55, frame * 0.16, 12, 24]} /><meshStandardMaterial color="#c4c9cc" metalness={0.8} roughness={0.2} /></mesh>
  </group>;
}

export function RoomObject3D({ room, object, selected, onSelect, onMove, isSlot = false, photoUrl }: RoomObject3DProps) {
  void onMove;
  const size = dimensions(object);
  const position = useMemo<[number, number, number]>(() => [cmToWorld(object.x + size.width / 2) - cmToWorld(room.width ?? 0) / 2, cmToWorld((object.z ?? 0) + size.height / 2), cmToWorld(object.y + size.depth / 2) - cmToWorld(room.depth ?? 0) / 2], [object.x, object.y, object.z, room.width, room.depth, size.width, size.depth, size.height]);
  const rotationY = rotationFor(object) * Math.PI / 180;
  const bodyHeight = Math.max(0.01, cmToWorld(size.height));
  const bodyWidth = Math.max(0.01, cmToWorld(size.width));
  const bodyDepth = Math.max(0.01, cmToWorld(size.depth));
  const select = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onSelect(object.id); };

  return <group position={position} rotation={[0, rotationY, 0]} userData={{ roomObjectId: object.id, isVivarium: isSlot, magLocked: Boolean(object.stackGroupId) }}>
    <mesh onPointerDown={select} onClick={select} visible={false}><boxGeometry args={[bodyWidth * 1.08, bodyHeight * 1.08, bodyDepth * 1.08]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
    {isSlot ? <VivariumModel width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} photoUrl={photoUrl} /> : <FurnitureModel kind={(object as ReptileRoomObject).kind} width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} />}
    {selected && <mesh position={[0, -bodyHeight / 2 + 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[Math.max(bodyWidth, bodyDepth) * 0.43, Math.max(bodyWidth, bodyDepth) * 0.47, 32]} /><meshBasicMaterial color="#d89a32" transparent opacity={0.75} depthWrite={false} /></mesh>}
  </group>;
}
