import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Canvas } from "@react-three/fiber";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import type { Room3DProps, Room3DSelection } from "../../types/reptileRoom3D";
import { MeasurementGrid3D } from "./MeasurementGrid3D";
import { RoomCamera3D } from "./RoomCamera3D";
import { RoomNavigation3D, buildRoomNavigationNodes, ROOM_NAVIGATION_SPACING_CM } from "./RoomNavigation3D";
import type { RoomNavigationNode } from "./RoomNavigation3D";
import { RoomObject3D } from "./RoomObject3D";
import { RoomShell3D } from "./RoomShell3D";
import { getRoomDimensions3D } from "./room3DScale";
import type { Camera } from "three";
import "../../styles/reptileRoomDigitalTwinImmersive.css";

type RoomSceneProps = Omit<Room3DProps, "className"> & {
  objects: ReptileRoomObject[];
  slots: ReptileRoomSlot[];
  selectedId: string | null;
  selectedType: "slot" | "object" | null;
  navigationNode: RoomNavigationNode;
  onTeleport: (node: RoomNavigationNode) => void;
  onSelect: (selection: Room3DSelection) => void;
};

function RoomScene({ room, showGrid = true, showCeiling = false, viewerMode = false, objects, slots, selectedId, selectedType, photoForSlot, onSelect, onMove, navigationNode, onTeleport }: RoomSceneProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  const handleMove = (type: "slot" | "object", id: string, dx: number, dy: number, dz: number, commit: boolean) => { onMove?.({ type, id }, dx, dy, dz, commit); };
  return (
    <>
      <color attach="background" args={["#17191c"]} />
      <ambientLight intensity={0.6} />
      <hemisphereLight intensity={0.45} groundColor="#202226" color="#f2ead9" />
      <directionalLight position={[width * 0.25, height, depth * 0.15]} intensity={1.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <RoomShell3D room={room} showCeiling={showCeiling} />
      {slots.map((slot) => <RoomObject3D key={`slot-${slot.id}`} room={room} object={slot} isSlot photoUrl={photoForSlot?.(slot)} selected={!viewerMode && selectedType === "slot" && selectedId === slot.id} onSelect={(id) => onSelect({ type: "slot", id })} onMove={(dx, dy, dz, commit) => handleMove("slot", slot.id, dx, dy, dz, commit)} />)}
      {objects.map((object) => <RoomObject3D key={object.id} room={room} object={object} selected={!viewerMode && selectedType === "object" && selectedId === object.id} onSelect={(id) => onSelect({ type: "object", id })} onMove={(dx, dy, dz, commit) => handleMove("object", object.id, dx, dy, dz, commit)} />)}
      {showGrid && !viewerMode && <MeasurementGrid3D room={room} />}
      {!viewerMode && <RoomNavigation3D room={room} activeNodeId={navigationNode.id} onTeleport={onTeleport} />}
      <RoomCamera3D room={room} target={navigationNode} />
    </>
  );
}

function NavigationPad({ nodes, activeNode, onMove }: { nodes: RoomNavigationNode[]; activeNode: RoomNavigationNode; onMove: (node: RoomNavigationNode) => void }) {
  const findNode = (dx: number, dz: number) => nodes.find((node) => node.xCm === activeNode.xCm + dx && node.zCm === activeNode.zCm + dz) ?? activeNode;
  const buttonStyle: CSSProperties = { width: 34, height: 30, padding: 0, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid rgba(255,255,255,.16)", background: "rgba(18,21,24,.88)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", backdropFilter: "blur(5px)" };
  const stop = (event: ReactPointerEvent<HTMLButtonElement>) => { event.stopPropagation(); };
  return (
    <div style={{ position: "absolute", left: 14, bottom: 14, zIndex: 40, color: "#fff", pointerEvents: "auto", userSelect: "none" }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", opacity: 0.72, margin: "0 0 5px 2px" }}>NAVIGATION</div>
      <div style={{ display: "grid", gridTemplateColumns: "34px 34px 34px", gridTemplateRows: "30px 30px", gap: 4, justifyItems: "center" }}>
        <span />
        <button type="button" aria-label="Move camera forward" title="Forward" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(0, -ROOM_NAVIGATION_SPACING_CM))}>↑</button>
        <span />
        <button type="button" aria-label="Move camera left" title="Left" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(-ROOM_NAVIGATION_SPACING_CM, 0))}>←</button>
        <button type="button" aria-label="Move camera backward" title="Backward" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(0, ROOM_NAVIGATION_SPACING_CM))}>↓</button>
        <button type="button" aria-label="Move camera right" title="Right" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(ROOM_NAVIGATION_SPACING_CM, 0))}>→</button>
      </div>
    </div>
  );
}

export default function Room3D({ room, className, showGrid = true, showCeiling = false, viewerMode = false, objects = [], slots = [], selectedId = null, selectedType = null, photoForSlot, onSelect = () => undefined, onMove, onTeleport }: Room3DProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  const cameraPosition: [number, number, number] = [0, Math.max(0.5, height * 0.55), Math.max(0.5, depth * 0.28)];
  const navigationNodes = useMemo(() => buildRoomNavigationNodes(room), [room]);
  const defaultNode = useMemo(() => navigationNodes.reduce<RoomNavigationNode | null>((closest, node) => !closest || Math.hypot(node.xCm, node.zCm) < Math.hypot(closest.xCm, closest.zCm) ? node : closest, null) ?? { id: "nav-centre", xCm: 0, zCm: 0 }, [navigationNodes]);
  const [navigationNode, setNavigationNode] = useState<RoomNavigationNode>(defaultNode);
  useEffect(() => { setNavigationNode(defaultNode); }, [defaultNode]);
  const handleTeleport = (node: RoomNavigationNode) => { setNavigationNode(node); onTeleport?.(node); };
  return (
    <div className={className} style={{ position: "relative", width: "100%", height: "100%", minHeight: 480, touchAction: viewerMode ? "none" : undefined }}>
      <Canvas shadows camera={{ position: cameraPosition, fov: 68, near: 0.01, far: Math.max(width, depth, height) * 4 }} dpr={[1, 2]} onCreated={({ camera }) => { (window as Window & { __tinyTitansRoom3DCamera?: Camera }).__tinyTitansRoom3DCamera = camera; }} onPointerMissed={() => onSelect(null)}>
        <RoomScene room={room} showGrid={showGrid} showCeiling={showCeiling} viewerMode={viewerMode} objects={objects} slots={slots} selectedId={selectedId} selectedType={selectedType} photoForSlot={photoForSlot} onSelect={onSelect} onMove={onMove} navigationNode={navigationNode} onTeleport={handleTeleport} />
      </Canvas>
      {!viewerMode && <NavigationPad nodes={navigationNodes} activeNode={navigationNode} onMove={handleTeleport} />}
    </div>
  );
}
