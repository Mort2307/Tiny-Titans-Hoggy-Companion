import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";
import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import type { VivariumTelemetry } from "../../types/reptileRoom3D";
import { getRoomAssetPreset } from "../../data/reptileRoomAssetCatalog";
import { cmToWorld } from "./room3DScale";

type RoomObject3DProps = { room: ReptileRoomWorkspace; object: ReptileRoomObject | ReptileRoomSlot; selected: boolean; onSelect: (id: string) => void; isSlot?: boolean; photoUrl?: string; telemetry?: VivariumTelemetry };
type SlotWithRotation = ReptileRoomSlot & { rotation?: number };

const wood = { dark: "#41291d", medium: "#6a4328", light: "#895c34", metal: "#667078" };

function dimensions(object: ReptileRoomObject | ReptileRoomSlot) {
  if ("width" in object) return { width: object.width, depth: object.depth, height: object.height };
  return { width: object.w, depth: object.depth ?? object.h, height: object.height ?? 40 };
}

function rotationFor(object: ReptileRoomObject | ReptileRoomSlot) {
  return "width" in object ? object.rotation ?? 0 : (object as SlotWithRotation).rotation ?? 0;
}

function useWoodTexture(colour: string) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.fillStyle = colour;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < 180; index += 1) {
      const y = (index / 180) * canvas.height;
      context.beginPath();
      context.strokeStyle = `rgba(25,15,9,${0.06 + (index % 7) * 0.01})`;
      context.lineWidth = 1 + (index % 4) * 0.4;
      context.moveTo(-30, y);
      context.bezierCurveTo(220, y - 24, 500, y + 20, 1050, y - 10);
      context.stroke();
    }
    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.wrapS = THREE.RepeatWrapping;
    next.wrapT = THREE.RepeatWrapping;
    next.repeat.set(1.7, 1);
    next.anisotropy = 8;
    setTexture(next);
    return () => next.dispose();
  }, [colour]);
  return texture;
}

function WoodMaterial({ colour }: { colour: string }) {
  const texture = useWoodTexture(colour);
  return <meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.66} metalness={0.02} />;
}

function PanelMaterial({ style, colour }: { style: string; colour?: string }) {
  if (style === "front-opening") return <WoodMaterial colour={colour ?? wood.dark} />;
  if (style === "pvc") return <meshStandardMaterial color="#e4e7e3" roughness={0.58} metalness={0.04} />;
  if (style === "quarantine") return <meshStandardMaterial color="#d9dddf" roughness={0.45} metalness={0.08} />;
  return <meshStandardMaterial color="#697279" roughness={0.25} metalness={0.72} />;
}

function MountingBar({ width, height }: { width: number; height: number }) {
  return <group>
    <mesh castShadow position={[0, height * 0.18, 0]}><boxGeometry args={[width * 0.78, Math.max(height * 0.05, 0.012), Math.max(height * 0.028, 0.01)]} /><meshStandardMaterial color="#33393e" metalness={0.72} roughness={0.3} /></mesh>
    {[-0.34, 0.34].map((x) => <mesh key={x} castShadow position={[width * x, height * 0.18, 0]}><cylinderGeometry args={[Math.max(height * 0.03, 0.008), Math.max(height * 0.03, 0.008), Math.max(height * 0.05, 0.012), 16]} /><meshStandardMaterial color="#8b9297" metalness={0.9} roughness={0.2} /></mesh>)}
  </group>;
}

function SimpleFixture({ kind, width, depth, height, selected }: { kind: string; width: number; depth: number; height: number; selected: boolean }) {
  const accent = selected ? "#efbd55" : "#8a949a";
  const min = Math.min(width, depth, height);
  if (["thermostat", "thermometer", "hygrometer", "temp-humidity"].includes(kind)) {
    const screen = kind === "hygrometer" ? "#d7efe2" : "#cce9f3";
    return <group>
      <mesh castShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color="#1e2428" roughness={0.34} metalness={0.28} /></mesh>
      <mesh position={[0, height * 0.06, depth / 2 + 0.006]}><roundedBoxGeometry args={[width * 0.74, height * 0.44, 0.018]} radius={Math.max(0.004, min * 0.015)} smoothness={3} /><meshStandardMaterial color="#0b1114" roughness={0.42} /></mesh>
      <mesh position={[0, height * 0.06, depth / 2 + 0.017]}><planeGeometry args={[width * 0.63, height * 0.32]} /><meshStandardMaterial color={screen} emissive={screen} emissiveIntensity={0.12} /></mesh>
      <mesh position={[width * 0.29, -height * 0.24, depth / 2 + 0.017]}><circleGeometry args={[Math.max(min * 0.07, 0.01), 20]} /><meshStandardMaterial color={accent} metalness={0.35} roughness={0.25} /></mesh>
      {kind === "thermostat" && <MountingBar width={width} height={height} />}
    </group>;
  }
  if (["socket", "switched-socket", "smart-plug"].includes(kind)) {
    const dual = kind === "socket";
    return <group>
      <mesh castShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color="#ede9e0" roughness={0.5} /></mesh>
      {(dual ? [-0.22, 0.22] : [0]).map((x) => <group key={x} position={[width * x, 0.02, depth / 2 + 0.005]}>
        <mesh><circleGeometry args={[min * 0.09, 24]} /><meshStandardMaterial color="#f6f7f3" roughness={0.34} /></mesh>
        <mesh position={[0, 0, 0.002]}><circleGeometry args={[min * 0.065, 20]} /><meshStandardMaterial color="#202529" roughness={0.72} /></mesh>
      </group>)}
      <mesh position={[0, height * 0.32, depth / 2 + 0.007]}><boxGeometry args={[Math.max(width * 0.1, 0.012), Math.max(height * 0.16, 0.014), 0.008]} /><meshStandardMaterial color={kind === "switched-socket" ? "#343a3f" : "#c7cbd0"} roughness={0.45} /></mesh>
    </group>;
  }
  if (kind === "power-strip") {
    return <group>
      <mesh castShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color="#20262a" roughness={0.52} metalness={0.22} /></mesh>
      {Array.from({ length: 6 }).map((_, index) => <group key={index} position={[(index - 2.5) * width * 0.15, height * 0.08, depth / 2 + 0.012]}>
        <mesh><cylinderGeometry args={[Math.min(width, height) * 0.06, Math.min(width, height) * 0.06, 0.012, 20]} /><meshStandardMaterial color="#0d1113" /></mesh>
        <mesh position={[Math.min(width, height) * 0.055, 0, 0]}><cylinderGeometry args={[Math.min(width, height) * 0.045, Math.min(width, height) * 0.045, 0.012, 20]} /><meshStandardMaterial color="#0d1113" /></mesh>
      </group>)}
      <mesh position={[width * 0.42, -height * 0.25, depth / 2 + 0.012]}><boxGeometry args={[width * 0.08, height * 0.2, 0.01]} /><meshStandardMaterial color="#6f7c83" roughness={0.35} /></mesh>
    </group>;
  }
  if (kind === "timer") {
    return <group>
      <mesh castShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color="#f1eee7" roughness={0.44} /></mesh>
      <mesh position={[0, height * 0.12, depth / 2 + 0.006]}><boxGeometry args={[width * 0.72, height * 0.34, 0.014]} /><meshStandardMaterial color="#20262a" roughness={0.5} /></mesh>
      <mesh position={[0, height * 0.12, depth / 2 + 0.014]}><planeGeometry args={[width * 0.62, height * 0.25]} /><meshStandardMaterial color="#cbe6e3" emissive="#6aa09b" emissiveIntensity={0.08} /></mesh>
      {[-0.22, 0, 0.22].map((x) => <mesh key={x} position={[width * x, -height * 0.3, depth / 2 + 0.006]}><circleGeometry args={[min * 0.045, 18]} /><meshStandardMaterial color="#333a3f" roughness={0.42} /></mesh>)}
    </group>;
  }
  if (["ceiling-light", "basking-light", "halogen", "dhp", "che"].includes(kind)) {
    const isChe = kind === "che";
    const isDhp = kind === "dhp";
    const domeColour = isChe ? "#72787d" : "#2f353a";
    const emitterColour = isChe ? "#b8b2a6" : "#fff0c6";
    return <group rotation={[Math.PI, 0, 0]}>
      <mesh castShadow><cylinderGeometry args={[Math.max(width, depth) * 0.34, Math.max(width, depth) * 0.52, height * 0.62, 28]} /><meshStandardMaterial color={domeColour} roughness={0.28} metalness={0.72} /></mesh>
      <mesh position={[0, -height * 0.32, 0]} castShadow><cylinderGeometry args={[Math.max(width, depth) * 0.28, Math.max(width, depth) * 0.16, height * 0.12, 24]} /><meshStandardMaterial color="#1b2024" roughness={0.42} metalness={0.7} /></mesh>
      <mesh position={[0, -height * 0.42, 0]}><sphereGeometry args={[Math.max(width, depth) * (isChe ? 0.17 : 0.2), 20, 12]} /><meshStandardMaterial color={emitterColour} emissive={isChe ? "#2c2924" : emitterColour} emissiveIntensity={selected ? 1.9 : 0.55} roughness={isDhp ? 0.65 : 0.28} /></mesh>
      <mesh position={[0, height * 0.34, 0]}><cylinderGeometry args={[Math.max(min * 0.055, 0.01), Math.max(min * 0.07, 0.012), height * 0.14, 18]} /><meshStandardMaterial color="#777f84" metalness={0.7} roughness={0.3} /></mesh>
      {!isChe && <pointLight distance={2.4} intensity={selected ? 0.28 : 0.07} color="#ffe5ad" />}
    </group>;
  }
  if (kind === "led-bar" || kind === "uvb") {
    const uv = kind === "uvb";
    return <group>
      <mesh castShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={uv ? "#afb8bf" : "#d4d8db"} metalness={0.54} roughness={0.28} /></mesh>
      <mesh position={[0, -height * 0.12, depth / 2 + 0.009]}><boxGeometry args={[width * 0.84, height * 0.44, 0.012]} /><meshStandardMaterial color={uv ? "#d7e2d6" : "#fff4cf"} emissive={uv ? "#9faf8f" : "#fff4cf"} emissiveIntensity={selected ? 1.15 : 0.34} /></mesh>
      {[-0.44, 0.44].map((x) => <mesh key={x} position={[width * x, 0, 0]}><boxGeometry args={[Math.max(width * 0.025, 0.008), height, depth * 1.02]} /><meshStandardMaterial color="#5b6369" metalness={0.7} roughness={0.28} /></mesh>)}
    </group>;
  }
  if (kind === "heat-mat") {
    return <group>
      <mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color="#1c2125" roughness={0.84} metalness={0.05} /></mesh>
      <mesh position={[0, height / 2 + 0.002, 0]}><planeGeometry args={[width * 0.9, depth * 0.9]} /><meshStandardMaterial color="#2a3035" roughness={0.92} /></mesh>
      {[-0.35, 0, 0.35].map((x) => <mesh key={x} position={[width * x, height / 2 + 0.004, 0]}><boxGeometry args={[width * 0.015, 0.006, depth * 0.72]} /><meshStandardMaterial color="#454c52" roughness={0.85} /></mesh>)}
    </group>;
  }
  if (kind === "rhp") {
    return <group>
      <mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color="#22282c" roughness={0.86} metalness={0.12} /></mesh>
      <mesh position={[0, 0, depth / 2 + 0.01]}><planeGeometry args={[width * 0.86, height * 0.72]} /><meshStandardMaterial color="#2f3539" roughness={0.95} /></mesh>
      {[-0.24, 0.24].map((x) => <mesh key={x} position={[width * x, 0, depth / 2 + 0.014]}><cylinderGeometry args={[Math.max(min * 0.035, 0.008), Math.max(min * 0.035, 0.008), height * 0.5, 16]} /><meshStandardMaterial color="#51585d" metalness={0.62} roughness={0.34} /></mesh>)}
    </group>;
  }
  if (kind === "hide") {
    return <group>
      <mesh castShadow receiveShadow position={[0, height * 0.42, 0]} scale={[1, 0.82, 0.9]}><dodecahedronGeometry args={[Math.max(width, depth) * 0.5, 2]} /><meshStandardMaterial color="#5b4a3b" roughness={0.98} /></mesh>
      <mesh position={[0, height * 0.36, Math.max(depth * 0.22, 0.02)]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[Math.min(width, depth) * 0.18, 24]} /><meshStandardMaterial color="#221b17" roughness={1} /></mesh>
    </group>;
  }
  if (kind === "water-bowl") {
    const rim = Math.min(width, depth) * 0.34;
    return <group>
      <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[rim, Math.min(width, depth) * 0.075, 20, 36]} /><meshStandardMaterial color="#626d74" roughness={0.3} metalness={0.2} /></mesh>
      <mesh position={[0, height * 0.34, 0]}><cylinderGeometry args={[rim * 0.82, rim * 0.82, Math.max(height * 0.18, 0.012), 32]} /><meshStandardMaterial color="#9bbfc8" transparent opacity={0.64} roughness={0.08} /></mesh>
      <mesh position={[0, height * 0.45, 0]}><cylinderGeometry args={[rim * 0.73, rim * 0.73, Math.max(height * 0.045, 0.008), 32]} /><meshStandardMaterial color="#d6ecef" transparent opacity={0.42} roughness={0.04} /></mesh>
    </group>;
  }
  if (kind === "cork") {
    return <group rotation={[0.18, 0.06, -0.12]}>
      <mesh castShadow receiveShadow><cylinderGeometry args={[Math.max(width, depth) * 0.25, Math.max(width, depth) * 0.37, height, 16]} /><meshStandardMaterial color="#745234" roughness={1} /></mesh>
      {[-0.2, 0.15, 0.36].map((y) => <mesh key={y} position={[0, height * y, Math.max(depth * 0.22, 0.02)]} rotation={[0, 0, 0.25]}><boxGeometry args={[width * 0.5, Math.max(height * 0.02, 0.008), Math.max(depth * 0.03, 0.01)]} /><meshStandardMaterial color="#5b3f29" roughness={1} /></mesh>)}
    </group>;
  }
  if (kind === "branch") {
    return <group rotation={[0.16, 0, -0.48]}>
      <mesh castShadow><cylinderGeometry args={[Math.max(width, depth) * 0.065, Math.max(width, depth) * 0.1, Math.max(width, depth) * 1.2, 12]} /><meshStandardMaterial color="#67472e" roughness={1} /></mesh>
      <mesh castShadow position={[Math.max(width, depth) * 0.24, Math.max(width, depth) * 0.22, 0]} rotation={[0, 0, 0.55]}><cylinderGeometry args={[Math.max(width, depth) * 0.045, Math.max(width, depth) * 0.065, Math.max(width, depth) * 0.48, 10]} /><meshStandardMaterial color="#704d31" roughness={1} /></mesh>
    </group>;
  }
  if (kind === "plant") {
    return <group>
      <mesh castShadow position={[0, height * 0.14, 0]}><cylinderGeometry args={[width * 0.17, width * 0.23, height * 0.28, 14]} /><meshStandardMaterial color="#41332a" roughness={1} /></mesh>
      {Array.from({ length: 9 }, (_, index) => { const angle = index * 0.76; const leafHeight = height * (0.42 + (index % 3) * 0.035); return <mesh key={index} position={[Math.cos(angle) * width * 0.34, leafHeight, Math.sin(angle) * depth * 0.34]} rotation={[0.24 * Math.sin(angle), angle, 0.6]}><planeGeometry args={[width * 0.4, height * 0.24]} /><meshStandardMaterial color={index % 2 ? "#557149" : "#47643e"} side={THREE.DoubleSide} roughness={0.96} /></mesh>; })}
    </group>;
  }
  if (kind === "scale") {
    return <group>
      <mesh castShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color="#252b2f" roughness={0.35} metalness={0.4} /></mesh>
      <mesh position={[0, height / 2 + 0.006, 0]}><boxGeometry args={[width * 0.82, 0.012, depth * 0.82]} /><meshStandardMaterial color="#e2e5df" roughness={0.38} /></mesh>
      <mesh position={[width * 0.24, height / 2 + 0.013, depth * 0.1]}><boxGeometry args={[width * 0.3, 0.006, depth * 0.08]} /><meshStandardMaterial color="#22272b" roughness={0.6} /></mesh>
    </group>;
  }
  if (kind === "cleaning-station") {
    return <group>
      <mesh castShadow receiveShadow position={[0, height * 0.28, 0]}><boxGeometry args={[width, height * 0.56, depth]} /><meshStandardMaterial color="#c5cbc8" roughness={0.58} metalness={0.12} /></mesh>
      <mesh position={[0, height * 0.62, 0]}><boxGeometry args={[width * 0.96, height * 0.08, depth * 0.96]} /><meshStandardMaterial color="#e0e5e1" roughness={0.44} /></mesh>
      <mesh position={[0, height * 0.69, depth * 0.11]}><boxGeometry args={[width * 0.34, height * 0.08, depth * 0.42]} /><meshStandardMaterial color="#909b9e" roughness={0.62} metalness={0.08} /></mesh>
      <mesh position={[width * 0.36, height * 0.55, depth * 0.36]}><cylinderGeometry args={[width * 0.035, width * 0.035, height * 0.18, 16]} /><meshStandardMaterial color="#7f8b8f" metalness={0.42} roughness={0.3} /></mesh>
    </group>;
  }
  return <mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color="#4f5960" roughness={0.7} metalness={0.14} /> </mesh>;
}

function makePhotoPlaceholderTexture() {
  const canvas = document.createElement("canvas"); canvas.width = 640; canvas.height = 360;
  const context = canvas.getContext("2d"); if (!context) return null;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(20,30,34,.42)"; context.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
  context.strokeStyle = "rgba(190,225,232,.62)"; context.lineWidth = 5; context.setLineDash([16, 12]); context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24); context.setLineDash([]);
  context.fillStyle = "rgba(230,245,247,.92)"; context.textAlign = "center"; context.textBaseline = "middle"; context.font = "800 34px Arial"; context.fillText("ADD VIVARIUM PHOTO", canvas.width / 2, canvas.height / 2 - 10);
  context.font = "600 20px Arial"; context.fillStyle = "rgba(210,232,236,.72)"; context.fillText("Select this glass to personalise it", canvas.width / 2, canvas.height / 2 + 34);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearFilter; texture.magFilter = THREE.LinearFilter; return texture;
}

function VivariumPhoto({ url, width, height, z }: { url: string; width: number; height: number; z: number }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  useEffect(() => { let active = true; setTexture(null); const loader = new THREE.TextureLoader(); loader.setCrossOrigin("anonymous"); loader.load(url, (loaded) => { if (!active) { loaded.dispose(); return; } loaded.colorSpace = THREE.SRGBColorSpace; loaded.wrapS = THREE.ClampToEdgeWrapping; loaded.wrapT = THREE.ClampToEdgeWrapping; loaded.minFilter = THREE.LinearFilter; loaded.magFilter = THREE.LinearFilter; loaded.anisotropy = 8; loaded.needsUpdate = true; setTexture(loaded); }, undefined, () => { if (active) setTexture(null); }); return () => { active = false; }; }, [url]);
  useEffect(() => () => texture?.dispose(), [texture]);
  if (!texture) return null;
  return <mesh position={[0, 0, z]} renderOrder={3} userData={{ vivariumFaceImage: true }}><planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} toneMapped={false} depthWrite={false} depthTest side={THREE.DoubleSide} /></mesh>;
}

function VivariumModel({ width, depth, height, selected, photoUrl, onSelectGlass, enclosureStyle }: { width: number; depth: number; height: number; selected: boolean; photoUrl?: string; onSelectGlass: () => void; enclosureStyle: string }) {
  const style = enclosureStyle || "front-opening";
  const frame = Math.max(Math.min(width, height) * 0.046, 0.026);
  const glassWidth = Math.max(0.01, width - frame * 2);
  const glassHeight = Math.max(0.01, height - frame * 2);
  const frontZ = depth / 2;
  const trim = selected ? "#e2ad4f" : (style === "front-opening" ? wood.dark : "#5c666d");
  const placeholderTexture = useMemo(() => makePhotoPlaceholderTexture(), []);
  useEffect(() => () => placeholderTexture?.dispose(), [placeholderTexture]);
  const selectGlass = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onSelectGlass(); };
  const glass = <mesh position={[0, 0, frontZ + 0.002]} renderOrder={1}><planeGeometry args={[glassWidth, glassHeight]} /><meshPhysicalMaterial color="#c6e6eb" transparent opacity={photoUrl ? 0.04 : 0.12} roughness={0.018} metalness={0.04} transmission={style === "glass" || style === "sliding-glass" || style === "arboreal" ? 0.18 : 0.08} thickness={0.015} depthWrite={false} side={THREE.DoubleSide} /></mesh>;
  const hit = <mesh position={[0, 0, frontZ + 0.008]} renderOrder={2} onPointerDown={selectGlass} onClick={selectGlass} userData={{ vivariumGlassHitArea: true }}><planeGeometry args={[glassWidth, glassHeight]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} /></mesh>;
  const frontPhoto = style === "rack-tub" ? null : photoUrl ? <VivariumPhoto url={photoUrl} width={glassWidth * 0.985} height={glassHeight * 0.985} z={frontZ + 0.014} /> : placeholderTexture ? <mesh position={[0, 0, frontZ + 0.012]} renderOrder={2} userData={{ vivariumPhotoPlaceholder: true }} onPointerDown={selectGlass} onClick={selectGlass}><planeGeometry args={[glassWidth * 0.985, glassHeight * 0.985]} /><meshBasicMaterial map={placeholderTexture} transparent opacity={0.72} depthWrite={false} depthTest side={THREE.DoubleSide} /></mesh> : null;
  if (style === "rack-tub") return <group><mesh castShadow receiveShadow position={[0, 0, -depth / 2 + frame / 2]}><boxGeometry args={[width, height, frame]} /><meshStandardMaterial color="#353b40" roughness={0.58} metalness={0.2} /></mesh><mesh castShadow receiveShadow position={[0, 0, 0]}><boxGeometry args={[width * 0.96, height * 0.84, depth * 0.88]} /><meshStandardMaterial color="#7b8388" roughness={0.62} /></mesh><mesh position={[0, -height * 0.18, frontZ * 0.98]}><boxGeometry args={[glassWidth * 0.88, height * 0.18, frame * 1.4]} /><meshStandardMaterial color={trim} roughness={0.32} metalness={0.45} /></mesh><mesh position={[width * 0.34, -height * 0.18, frontZ * 0.995]}><torusGeometry args={[frame * 0.48, frame * 0.13, 16, 24]} /><meshStandardMaterial color="#cbd0d3" metalness={0.82} roughness={0.18} /></mesh></group>;
  const backMaterial = <PanelMaterial style={style} colour={wood.dark} />;
  return <group>
    <mesh castShadow receiveShadow position={[0, 0, -depth / 2 + frame / 2]}><boxGeometry args={[width, height, frame]} />{backMaterial}</mesh>
    <mesh castShadow receiveShadow position={[-width / 2 + frame / 2, 0, 0]}><boxGeometry args={[frame, height, depth]} /><PanelMaterial style={style} colour={wood.dark} /></mesh>
    <mesh castShadow receiveShadow position={[width / 2 - frame / 2, 0, 0]}><boxGeometry args={[frame, height, depth]} /><PanelMaterial style={style} colour={wood.dark} /></mesh>
    <mesh castShadow receiveShadow position={[0, height / 2 - frame / 2, 0]}><boxGeometry args={[width, frame, depth]} /><PanelMaterial style={style} colour={wood.dark} /></mesh>
    <mesh castShadow receiveShadow position={[0, -height / 2 + frame / 2, 0]}><boxGeometry args={[width, frame, depth]} /><PanelMaterial style={style} colour={wood.dark} /></mesh>
    {glass}{hit}{frontPhoto}
    <mesh position={[0, height / 2 - frame / 2, frontZ + 0.026]}><boxGeometry args={[width, frame, frame * 1.5]} /><meshStandardMaterial color={trim} roughness={0.54} metalness={style === "front-opening" ? 0.02 : 0.68} /></mesh>
    <mesh position={[0, -height / 2 + frame / 2, frontZ + 0.026]}><boxGeometry args={[width, frame, frame * 1.5]} /><meshStandardMaterial color={trim} roughness={0.54} metalness={style === "front-opening" ? 0.02 : 0.68} /></mesh>
    <mesh position={[-width / 2 + frame / 2, 0, frontZ + 0.026]}><boxGeometry args={[frame, height, frame * 1.5]} /><meshStandardMaterial color={trim} roughness={0.54} metalness={style === "front-opening" ? 0.02 : 0.68} /></mesh>
    <mesh position={[width / 2 - frame / 2, 0, frontZ + 0.026]}><boxGeometry args={[frame, height, frame * 1.5]} /><meshStandardMaterial color={trim} roughness={0.54} metalness={style === "front-opening" ? 0.02 : 0.68} /></mesh>
    {style === "sliding-glass" && <><mesh position={[0, 0, frontZ + 0.04]}><boxGeometry args={[frame * 0.55, glassHeight, frame * 0.28]} /><meshStandardMaterial color="#525b62" roughness={0.28} metalness={0.78} /></mesh><mesh position={[0, 0, frontZ + 0.055]}><boxGeometry args={[frame * 0.24, glassHeight, frame * 0.2]} /><meshStandardMaterial color="#a8afb4" roughness={0.22} metalness={0.75} /></mesh></>}
    {style === "arboreal" && <mesh position={[0, height * 0.38, frontZ + 0.03]}><boxGeometry args={[glassWidth, frame * 0.55, frame * 0.2]} /><meshStandardMaterial color="#525b62" roughness={0.3} metalness={0.75} /></mesh>}
    {style === "quarantine" && <mesh position={[0, 0, frontZ + 0.038]}><boxGeometry args={[glassWidth * 0.78, glassHeight * 0.68, 0.016]} /><meshStandardMaterial color="#bfc7ca" transparent opacity={0.14} roughness={0.25} /></mesh>}
    {style === "front-opening" && <group><mesh position={[width * 0.39, 0, frontZ + 0.05]} castShadow><boxGeometry args={[frame * 0.48, height * 0.2, frame * 0.72]} /><meshStandardMaterial color="#515a61" metalness={0.82} roughness={0.2} /></mesh><mesh position={[width * 0.39, 0, frontZ + 0.092]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[frame * 0.55, frame * 0.15, 16, 28]} /><meshStandardMaterial color="#c9ced2" metalness={0.9} roughness={0.16} /></mesh></group>}
  </group>;
}

function FurnitureModel({ kind, width, depth, height, selected }: { kind: string; width: number; depth: number; height: number; selected: boolean }) {
  const colour = kind === "table" || kind === "workbench" ? wood.light : kind === "storage-cabinet" ? wood.medium : wood.dark;
  const texture = useWoodTexture(colour);
  if (kind === "chair") return <group><mesh castShadow position={[0, height * 0.45, 0]}><boxGeometry args={[width, height * 0.1, depth]} /><meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.7} /></mesh><mesh castShadow position={[0, height * 0.8, depth * 0.42]}><boxGeometry args={[width, height * 0.5, depth * 0.08]} /><meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.7} /></mesh><mesh castShadow position={[width * 0.42, height * 0.13, 0]}><boxGeometry args={[width * 0.08, height * 0.55, depth * 0.08]} /><meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.72} /></mesh></group>;
  if (kind === "table" || kind === "workbench") return <group><mesh castShadow receiveShadow position={[0, height - 0.05, 0]}><boxGeometry args={[width, 0.1, depth]} /><meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.68} /></mesh>{[-1, 1].flatMap((x) => [-1, 1].map((z) => <mesh key={`${x}-${z}`} castShadow receiveShadow position={[x * width * 0.4, height * 0.43, z * depth * 0.4]}><boxGeometry args={[0.07, height * 0.86, 0.07]} /><meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.72} /></mesh>))}{kind === "workbench" && <mesh position={[0, height * 0.56, -depth * 0.28]}><boxGeometry args={[width * 0.72, height * 0.18, depth * 0.05]} /><meshStandardMaterial color="#4a5258" roughness={0.64} metalness={0.18} /></mesh>}</group>;
  if (kind === "shelving") return <group>{[0.08, 0.31, 0.54, 0.77, 0.96].map((level) => <mesh key={level} castShadow receiveShadow position={[0, height * level, 0]}><boxGeometry args={[width, 0.045, depth]} /><meshStandardMaterial color="#7a6552" roughness={0.74} /></mesh>)}<mesh position={[-width * 0.45, height / 2, 0]}><boxGeometry args={[0.045, height, 0.045]} /><meshStandardMaterial color="#7e898e" metalness={0.55} roughness={0.28} /></mesh><mesh position={[width * 0.45, height / 2, 0]}><boxGeometry args={[0.045, height, 0.045]} /><meshStandardMaterial color="#7e898e" metalness={0.55} roughness={0.28} /></mesh></group>;
  if (kind === "rack") return <group>{[0.08, 0.31, 0.54, 0.77, 0.96].map((level) => <group key={level}><mesh castShadow receiveShadow position={[0, height * level, 0]}><boxGeometry args={[width, 0.05, depth]} /><meshStandardMaterial color="#343a3f" roughness={0.76} metalness={0.34} /></mesh><mesh position={[0, height * level + 0.035, depth * 0.02]}><boxGeometry args={[width * 0.9, Math.max(height * 0.16, 0.02), depth * 0.78]} /><meshStandardMaterial color="#7a8185" roughness={0.65} /></mesh></group>)}{[-1, 1].map((x) => <mesh key={x} position={[x * width * 0.45, height / 2, 0]}><boxGeometry args={[0.05, height, 0.05]} /><meshStandardMaterial color={selected ? "#e2ad4f" : "#69757b"} metalness={0.62} roughness={0.28} /></mesh>)}</group>;
  if (kind === "storage-cabinet") return <group><mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.72} /></mesh><mesh position={[0, 0, depth / 2 + 0.012]}><boxGeometry args={[0.008, height * 0.9, 0.014]} /><meshStandardMaterial color="#b0b6ba" metalness={0.64} roughness={0.3} /></mesh>{[-0.32, 0.32].map((x) => <mesh key={x} position={[width * x, 0, depth / 2 + 0.026]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[Math.max(width * 0.022, 0.01), Math.max(width * 0.006, 0.003), 12, 20]} /><meshStandardMaterial color="#c1c6c8" metalness={0.72} roughness={0.18} /></mesh>)}</group>;
  if (kind === "quarantine-area") return <group><mesh castShadow receiveShadow position={[0, height * 0.3, 0]}><boxGeometry args={[width, height * 0.6, depth]} /><meshStandardMaterial color="#d4d8da" roughness={0.52} metalness={0.14} /></mesh><mesh position={[0, height * 0.63, 0]}><boxGeometry args={[width * 0.94, height * 0.08, depth * 0.94]} /><meshStandardMaterial color="#eef0ee" roughness={0.36} /></mesh><mesh position={[0, height * 0.73, -depth * 0.28]}><boxGeometry args={[width * 0.68, height * 0.06, depth * 0.05]} /><meshStandardMaterial color="#a5afb4" roughness={0.54} metalness={0.2} /></mesh></group>;
  return <mesh castShadow receiveShadow><boxGeometry args={[width, height, depth]} /><meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.73} metalness={0.02} /></mesh>;
}

export function RoomObject3D({ room, object, selected, onSelect, isSlot = false, photoUrl }: RoomObject3DProps) {
  const size = dimensions(object);
  const position = useMemo<[number, number, number]>(() => [cmToWorld(object.x + size.width / 2) - cmToWorld(room.width ?? 0) / 2, cmToWorld((object.z ?? 0) + size.height / 2), cmToWorld(object.y + size.depth / 2) - cmToWorld(room.depth ?? 0) / 2], [object.x, object.y, object.z, room.width, room.depth, size.width, size.depth, size.height]);
  const rotationY = (rotationFor(object) * Math.PI) / 180;
  const bodyHeight = Math.max(0.01, cmToWorld(size.height));
  const bodyWidth = Math.max(0.01, cmToWorld(size.width));
  const bodyDepth = Math.max(0.01, cmToWorld(size.depth));
  const select = (event: ThreeEvent<PointerEvent>) => { event.stopPropagation(); onSelect(object.id); };
  const kind = isSlot ? "vivarium" : (object as ReptileRoomObject).kind;
  const preset = !isSlot ? getRoomAssetPreset((object as ReptileRoomObject).assetId) : undefined;
  const enclosureStyle = isSlot ? ((object as ReptileRoomSlot).config?.enclosureStyle ?? "front-opening") : "front-opening";
  return <group position={position} rotation={[0, rotationY, 0]} userData={{ roomObjectId: object.id, isVivarium: isSlot, magLocked: Boolean(object.stackGroupId) }}>
    <mesh onPointerDown={select} onClick={select} visible={false}><boxGeometry args={[bodyWidth * 1.04, bodyHeight * 1.04, bodyDepth * 1.04]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
    {isSlot ? <VivariumModel width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} photoUrl={photoUrl} onSelectGlass={() => onSelect(object.id)} enclosureStyle={enclosureStyle} /> : preset ? <SimpleFixture kind={kind} width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} /> : <FurnitureModel kind={kind} width={bodyWidth} depth={bodyDepth} height={bodyHeight} selected={selected} />}
    {selected && <><mesh position={[0, 0, 0]}><boxGeometry args={[bodyWidth * 1.02, bodyHeight * 1.02, bodyDepth * 1.02]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /><Edges color="#e2ad4f" lineWidth={2.5} /></mesh><pointLight position={[0, bodyHeight * 0.45, 0]} intensity={0.28} distance={Math.max(bodyWidth, bodyDepth) * 2.5} color="#e2ad4f" /></>}
  </group>;
}
