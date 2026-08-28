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

type RoomSceneProps = Omit<Room3DProps, "className"> & { objects: ReptileRoomObject[]; slots: ReptileRoomSlot[]; selectedId: string | null; selectedType: "slot" | "object" | null; navigationNode: RoomNavigationNode; onTeleport: (node: RoomNavigationNode) => void; onSelect: (selection: Room3DSelection) => void };

function RoomScene({ room, showGrid = true, showCeiling = false, viewerMode = false, objects, slots, selectedId, selectedType, photoForSlot, onSelect, onMove, navigationNode, onTeleport }: RoomSceneProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  const handleMove = (type: "slot" | "object", id: string, dx: number, dy: number, dz: number, commit: boolean) => onMove?.({ type, id }, dx, dy, dz, commit);
  return <>
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
  </>;
}

function NavigationPad({ nodes, activeNode, onMove }: { nodes: RoomNavigationNode[]; activeNode: RoomNavigationNode; onMove: (node: RoomNavigationNode) => void }) {
  const findNode = (dx: number, dz: number) => nodes.find((node) => node.xCm === activeNode.xCm + dx && node.zCm === activeNode.zCm + dz) ?? activeNode;
  const buttonStyle: CSSProperties = { width: 34, height: 30, padding: 0, display: "grid", placeItems: "center", borderRadius: 7, border: "1px solid rgba(255,255,255,.16)", background: "rgba(18,21,24,.88)", color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer", backdropFilter: "blur(5px)" };
  const stop = (event: ReactPointerEvent<HTMLButtonElement>) => event.stopPropagation();
  return <div className="rr3d-navigation-pad" style={{ position: "absolute", left: 14, bottom: 14, zIndex: 40, color: "#fff", pointerEvents: "auto", userSelect: "none" }}>
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".08em", opacity: 0.72, margin: "0 0 5px 2px" }}>NAVIGATION</div>
    <div style={{ display: "grid", gridTemplateColumns: "34px 34px 34px", gridTemplateRows: "30px 30px", gap: 4, justifyItems: "center" }}>
      <span /><button type="button" aria-label="Move camera forward" title="Forward" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(0, -ROOM_NAVIGATION_SPACING_CM))}>↑</button><span />
      <button type="button" aria-label="Move camera left" title="Left" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(-ROOM_NAVIGATION_SPACING_CM, 0))}>←</button>
      <button type="button" aria-label="Move camera backward" title="Backward" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(0, ROOM_NAVIGATION_SPACING_CM))}>↓</button>
      <button type="button" aria-label="Move camera right" title="Right" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(ROOM_NAVIGATION_SPACING_CM, 0))}>→</button>
    </div>
  </div>;
}

function TransformEditor({ object, slot, onChange }: { object: ReptileRoomObject | null; slot: ReptileRoomSlot | null; onChange: (patch: Partial<ReptileRoomObject> | Partial<ReptileRoomSlot>) => void }) {
  const item = object ?? slot;
  if (!item) return null;
  const isSlot = Boolean(slot);
  const width = isSlot ? slot!.w : object!.width;
  const depth = isSlot ? (slot!.depth ?? slot!.h) : object!.depth;
  const height = isSlot ? (slot!.height ?? 45) : object!.height;
  const rotation = isSlot ? 0 : object!.rotation ?? 0;
  const inputStyle: CSSProperties = { width: "100%", minWidth: 0, boxSizing: "border-box", height: 32, padding: "0 8px", borderRadius: 7, border: "1px solid rgba(255,255,255,.14)", background: "rgba(8,10,12,.72)", color: "#fff" };
  const buttonStyle: CSSProperties = { minWidth: 38, height: 32, padding: "0 8px", borderRadius: 7, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.07)", color: "#fff", cursor: "pointer", fontWeight: 800 };
  const setDimension = (field: "width" | "depth" | "height", value: number) => {
    const next = Math.max(1, Number.isFinite(value) ? value : 1);
    if (isSlot) {
      if (field === "width") onChange({ w: next });
      else if (field === "depth") onChange({ depth: next, h: next });
      else onChange({ height: next });
    } else onChange({ [field]: next });
  };
  return <div style={{ position: "absolute", right: 14, bottom: 14, zIndex: 41, width: 238, padding: 12, borderRadius: 12, background: "rgba(18,21,24,.94)", border: "1px solid rgba(255,255,255,.14)", boxShadow: "0 12px 30px rgba(0,0,0,.28)", color: "#fff", pointerEvents: "auto", backdropFilter: "blur(10px)" }} onPointerDown={(event) => event.stopPropagation()}>
    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".1em", opacity: .7, marginBottom: 8 }}>TRANSFORM · {isSlot ? "VIVARIUM" : "ASSET"}</div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
      {(["width", "depth", "height"] as const).map((field) => <label key={field} style={{ fontSize: 10, opacity: .72 }}>{field[0].toUpperCase() + field.slice(1)}<input type="number" min="1" step="0.5" value={Math.round(({ width, depth, height }[field]) * 100) / 100} onChange={(event) => setDimension(field, Number(event.target.value))} style={inputStyle} /></label>)}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 9 }}>
      <span style={{ fontSize: 11, opacity: .72, minWidth: 54 }}>Rotate</span>
      <button type="button" aria-label="Rotate left 15 degrees" title="Rotate left 15°" style={buttonStyle} disabled={isSlot} onClick={() => onChange({ rotation: ((rotation - 15) % 360 + 360) % 360 })}>↶</button>
      <div style={{ flex: 1, textAlign: "center", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{Math.round(rotation)}°</div>
      <button type="button" aria-label="Rotate right 15 degrees" title="Rotate right 15°" style={buttonStyle} disabled={isSlot} onClick={() => onChange({ rotation: (rotation + 15) % 360 })}>↷</button>
      <button type="button" aria-label="Reset rotation" title="Reset rotation" style={{ ...buttonStyle, minWidth: 34 }} disabled={isSlot} onClick={() => onChange({ rotation: 0 })}>0°</button>
    </div>
    <div style={{ marginTop: 6, fontSize: 10, opacity: .5 }}>Dimensions are centimetres. Rotation uses 15° steps.</div>
  </div>;
}

export default function Room3D({ room, className, showGrid = true, showCeiling = false, viewerMode = false, objects = [], slots = [], selectedId = null, selectedType = null, photoForSlot, onSelect = () => undefined, onMove, onTeleport }: Room3DProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  const navigationNodes = useMemo(() => buildRoomNavigationNodes(room), [room]);
  const defaultNode = useMemo(() => {
    if (!navigationNodes.length) return { id: "nav-centre", xCm: 0, zCm: 0 };
    return navigationNodes.reduce((closest, node) => Math.hypot(node.xCm, node.zCm) < Math.hypot(closest.xCm, closest.zCm) ? node : closest, navigationNodes[0]);
  }, [navigationNodes]);
  const storageKey = `tinyTitans.rr3d.cameraPosition:${room.id}`;
  const [navigationNode, setNavigationNode] = useState<RoomNavigationNode>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as { xCm?: number; zCm?: number } | null;
      return navigationNodes.find((node) => node.xCm === saved?.xCm && node.zCm === saved?.zCm) ?? defaultNode;
    } catch { return defaultNode; }
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [, setTransformVersion] = useState(0);
  useEffect(() => {
    setNavigationNode((current) => navigationNodes.find((node) => node.xCm === current.xCm && node.zCm === current.zCm) ?? defaultNode);
  }, [defaultNode, navigationNodes]);
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement !== null);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);
  const handleTeleport = (node: RoomNavigationNode) => {
    setNavigationNode(node);
    try { localStorage.setItem(storageKey, JSON.stringify({ xCm: node.xCm, zCm: node.zCm })); } catch { /* storage is optional */ }
    onTeleport?.(node);
  };
  const toggleFullscreen = async () => {
    const host = document.querySelector<HTMLElement>(`[data-rr3d-host="${CSS.escape(room.id)}"]`);
    if (!host) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await host.requestFullscreen();
    } catch { /* browser may block fullscreen; normal view remains usable */ }
  };
  const selectedObject = selectedType === "object" ? objects.find((item) => item.id === selectedId) ?? null : null;
  const selectedSlot = selectedType === "slot" ? slots.find((item) => item.id === selectedId) ?? null : null;
  const updateTransform = (patch: Partial<ReptileRoomObject> | Partial<ReptileRoomSlot>) => {
    const target = selectedObject ?? selectedSlot;
    if (!target) return;
    Object.assign(target, patch);
    setTransformVersion((value) => value + 1);
  };
  const cameraPosition: [number, number, number] = [0, Math.max(0.5, height * 0.55), Math.max(0.5, depth * 0.28)];
  return <div data-rr3d-host={room.id} className={className} style={{ position: "relative", width: "100%", height: "100%", minHeight: isFullscreen ? "100vh" : 0, touchAction: viewerMode ? "none" : undefined, background: "#0c0f11" }}>
    <Canvas shadows camera={{ position: cameraPosition, fov: 68, near: 0.01, far: Math.max(width, depth, height) * 4 }} dpr={[1, 2]} onCreated={({ camera }) => { (window as Window & { __tinyTitansRoom3DCamera?: Camera }).__tinyTitansRoom3DCamera = camera; }} onPointerMissed={() => onSelect(null)}>
      <RoomScene room={room} showGrid={showGrid} showCeiling={showCeiling} viewerMode={viewerMode} objects={objects} slots={slots} selectedId={selectedId} selectedType={selectedType} photoForSlot={photoForSlot} onSelect={onSelect} onMove={onMove} navigationNode={navigationNode} onTeleport={handleTeleport} />
    </Canvas>
    <button type="button" className="rr3d-fullscreen-button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Exit full screen" : "Open full screen"} title={isFullscreen ? "Exit full screen" : "Open full screen"}>{isFullscreen ? "⛶ Exit" : "⛶ Full screen"}</button>
    {!viewerMode && <NavigationPad nodes={navigationNodes} activeNode={navigationNode} onMove={handleTeleport} />}
    {!viewerMode && <TransformEditor object={selectedObject} slot={selectedSlot} onChange={updateTransform} />}
  </div>;
}
