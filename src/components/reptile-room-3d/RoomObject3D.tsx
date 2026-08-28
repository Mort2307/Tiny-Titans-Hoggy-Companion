import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld } from "../../utils/reptileRoom3D";
import type { Room3DSelection } from "../../types/reptileRoom3D";

type RoomObject3DProps = {
  room: ReptileRoomWorkspace;
  object: ReptileRoomObject | ReptileRoomSlot;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove?: (id: string, delta: [number, number, number]) => void;
  isSlot?: boolean;
  photoUrl?: string;
};

const woodColour = (kind: string) => kind === "oak-table" ? "#8b5a2b" : kind === "teak-corner-unit" ? "#a66a3f" : "#5a3a24";

function dimensions(object: ReptileRoomObject | ReptileRoomSlot) {
  if ("width" in object) return { width: object.width, depth: object.depth, height: object.height };
  return { width: object.w, depth: object.depth ?? object.h, height: object.height ?? 40 };
}

function rotationFor(object: ReptileRoomObject | ReptileRoomSlot) {
  return "rotation" in object ? object.rotation ?? 0 : 0;
}

function FurnitureModel({ kind, width, depth, height, selected }: { kind: string; width: number; depth: number; height: number; selected: boolean }) {
  const colour = woodColour(kind);
  const accent = selected ? "#d89a32" : "#5b6570";
  if (kind === "oak-table") return <group><mesh castShadow receiveShadow position={[0, height / 2 - 0.05, 0]}><boxGeometry args={[width, 0.1, depth]} /><meshStandardMaterial color={colour} roughness={0.66} /></mesh><mesh castShadow receiveShadow position={[-width * 0.39, height * 0.22, -depth * 0.39]}><boxGeometry args={[0.07, height * 0.44, 0.07]} /><meshStandardMaterial color={colour} /></mesh><mesh castShadow receiveShadow position={[width * 0.39, height * 0.22, -depth * 0.39]}><boxGeometry args={[0.07, height * 0.44, 0.07]} /><meshStandardMaterial color={colour} /></mesh><mesh castShadow receiveShadow position={[-width * 0.39, height * 0.22, depth * 0.39]}><boxGeometry args={[0.07, height * 0.44, 0.07]} /><meshStandardMaterial color={colour} /></mesh><mesh castShadow receiveShadow position={[width * 0.39, height * 0.22, depth * 0.39]}><boxGeometry args={[0.07, height * 0.44, 0.07]} /><meshStandardMaterial color={colour} /></mesh></group>;
  if (kind === "teak-corner-unit") return <group><mesh castShadow receiveShadow position={[0, height / 2 - 0.05, 0]}><boxGeometry args={[width, 0.08, depth]} /><meshStandardMaterial color={colour} roughness={0.62} /></mesh><mesh castShadow receiveShadow position={[0, height * 0.38, 0]}><boxGeometry args={[width, 0.05, depth]} /><meshStandardMaterial color={colour} /></mesh><mesh castShadow receiveShadow position={[0, height * 0.7, 0]}><boxGeometry args={[width, 0.05, depth]} /><meshStandardMaterial color={colour} /></mesh><mesh castShadow receiveShadow position={[-width * 0.45, height / 2, -depth * 0.45]}><boxGeometry args={[0.05, height, 0.05]} /><meshStandardMaterial color={colour} /></mesh><mesh castShadow receiveShadow position={[width * 0.45, height / 2, -depth * 0.45]}><boxGeometry args={[0.05, height, 0.05]} /><meshStandardMaterial color={colour} /></mesh><mesh castShadow receiveShadow position={[-width * 0.45, height / 2, depth * 0.45]}><boxGeometry args={[0.05, height, 0.05]} /><meshStandardMaterial color={colour} /></mesh><mesh castShadow receiveShadow position={[width * 0.45, height / 2, depth * 0.45]}><boxGeometry args={[0.05, height, 0.05]} /><meshStandardMaterial color={colour} /></mesh></group>;
  if (kind === "shelving") return <group>{[0.1, 0.33, 0.56, 0.79].map((level) => <mesh key={level} castShadow receiveShadow position={[0, height * level, 0]}><boxGeometry args={[width, 0.045, depth]} /><meshStandardMaterial color={colour} /></mesh>)}<mesh position={[-width * 0.45, height / 2, 0]}><boxGeometry args={[0.045, height, 0.045]} /><meshStandardMaterial color={accent} /></mesh><mesh position={[width * 0.45, height / 2, 0]}><boxGeometry args={[0.045, height, 0.045]} /><meshStandardMaterial color={accent} /></mesh></group>;
  if (kind === "rack") return <group>{[0.16, 0.39, 0.62, 0.85].map((level) => <mesh key={level} castShadow receiveShadow position={[0, height * level, 0]}><boxGeometry args={[width, 0.05, depth]} /><meshStandardMaterial color="#3d4248" roughness={0.7} /></mesh>)}</group>;
  if (kind === "workbench") return <group><mesh castShadow receiveShadow position={[0, height - 0.05, 0]}><boxGeometry args={[width, 0.1, depth]} /><meshStandardMaterial color={colour} /></mesh><mesh position={[-width * 0.42, height / 2, -depth * 0.42]}><boxGeometry args={[0.07, height, 0.07]} /><meshStandardMaterial color={colour} /></mesh><mesh position={[width * 0.42, height / 2, -depth * 0.42]}><boxGeometry args={[0.07, height, 0.07]} /><meshStandardMaterial color={colour} /></mesh></group>;
  if (kind === "storage-cabinet") return <group><mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} roughness={0.72} /></mesh><mesh position={[0, 0, depth / 2 + 0.004]}><boxGeometry args={[width * 0.88, height * 0.82, 0.012]} /><meshStandardMaterial color="#30353b" roughness={0.45} /></mesh><mesh position={[0, 0, depth / 2 + 0.012]}><boxGeometry args={[0.012, height * 0.72, 0.012]} /><meshStandardMaterial color={accent} /></mesh><mesh position={[0, 0, depth / 2 + 0.014]}><boxGeometry args={[width * 0.04, 0.04, 0.025]} /><meshStandardMaterial color={accent} metalness={0.35} /></mesh></group>;
  if (kind === "equipment-station") return <group><mesh castShadow receiveShadow position={[0, height / 2 - 0.03, 0]}><boxGeometry args={[width, 0.06, depth]} /><meshStandardMaterial color={colour} /></mesh><mesh castShadow><boxGeometry args={[width * 0.78, height * 0.78, depth * 0.72]} /><meshStandardMaterial color="#454b52" roughness={0.76} /></mesh></group>;
  return <mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} roughness={0.72} /></mesh>;
}

function VivariumFrame({ width, depth, height, selected }: { width: number; depth: number; height: number; selected: boolean }) {
  const frame = 0.055;
  const glass = "#b9d7df";
  const trim = selected ? "#d89a32" : "#5b6570";
  return <group><mesh position={[0, 0, depth / 2 - frame / 2]}><boxGeometry args={[width, height, frame]} /><meshStandardMaterial color={glass} transparent opacity={0.16} roughness={0.08} metalness={0.08} /></mesh><mesh position={[0, height / 2 - frame / 2, depth / 2]}><boxGeometry args={[width, frame, frame * 1.4]} /><meshStandardMaterial color={trim} metalness={0.35} /></mesh><mesh position={[0, -height / 2 + frame / 2, depth / 2]}><boxGeometry args={[width, frame, frame * 1.4]} /><meshStandardMaterial color={trim} metalness={0.35} /></mesh><mesh position={[-width / 2 + frame / 2, 0, depth / 2]}><boxGeometry args={[frame, height, frame * 1.4]} /><meshStandardMaterial color={trim} metalness={0.35} /></mesh><mesh position={[width / 2 - frame / 2, 0, depth / 2]}><boxGeometry args={[frame, height, frame * 1.4]} /><meshStandardMaterial color={trim} metalness={0.35} /></mesh></group>;
}

function VivariumPhoto({ url, width, height, depth }: { url: string; width: number; height: number; depth: number }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => { let active = true; const img = new Image(); img.crossOrigin = "anonymous"; img.onload = () => active && setImage(img); img.onerror = () => active && setImage(null); img.src = url; return () => { active = false; }; }, [url]);
  if (!image) return null;
  const texture = useMemo(() => { const loader = new THREE.TextureLoader(); const tex = loader.load(url); tex.colorSpace = THREE.SRGBColorSpace; return tex; }, [url]);
  return <mesh position={[0, 0, depth / 2 + 0.004]}><planeGeometry args={[width * 0.96, height * 0.9]} /><meshBasicMaterial map={texture} transparent opacity={0.96} toneMapped={false} depthWrite={false} /></mesh>;
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
    <mesh onPointerDown={select} onClick={select} visible={false}><boxGeometry args={[bodyWidth * 1.08, bodyHeight * 1.08, bodyDepth * 1.08]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
    {isSlot ? <><VivariumFrame width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} />{photoUrl && <VivariumPhoto url={photoUrl} width={bodyWidth} height={bodyHeight} depth={bodyDepth} />}</> : <FurnitureModel kind={(object as ReptileRoomObject).kind} width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} />}
    {selected && <mesh position={[0, -bodyHeight / 2 + 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[Math.max(bodyWidth, bodyDepth) * 0.43, Math.max(bodyWidth, bodyDepth) * 0.47, 32]} /><meshBasicMaterial color="#d89a32" transparent opacity={0.75} depthWrite={false} /></mesh>}
  </group>;
}