import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Canvas } from "@react-three/fiber";
import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { saveReptileRooms } from "../../services/reptileRoomService";
import { uploadReptileRoomVivariumPhoto } from "../../services/reptileRoomPhotoService";
import { useAuth } from "../../context/useAuth";
import type { Room3DProps, Room3DSelection } from "../../types/reptileRoom3D";
import { MeasurementGrid3D } from "./MeasurementGrid3D";
import { RoomCamera3D } from "./RoomCamera3D";
import { RoomNavigation3D, buildRoomNavigationNodes, ROOM_NAVIGATION_SPACING_CM } from "./RoomNavigation3D";
import type { RoomNavigationNode } from "./RoomNavigation3D";
import { RoomObject3D } from "./RoomObject3D";
import { RoomShell3D } from "./RoomShell3D";
import { getRoomDimensions3D } from "./room3DScale";

type RoomSceneProps = Omit<Room3DProps, "className"> & { objects: ReptileRoomObject[]; slots: ReptileRoomSlot[]; selectedId: string | null; selectedType: "slot" | "object" | null; navigationNode: RoomNavigationNode; onTeleport: (node: RoomNavigationNode) => void; onSelect: (selection: Room3DSelection) => void };
type Room3DWindow = Window & { __tinyTitansRoom3DCamera?: import("three").Camera };

function RoomScene({ room, showGrid = true, showCeiling = false, viewerMode = false, objects, slots, selectedId, selectedType, photoForSlot, onSelect, onMove, navigationNode, onTeleport }: RoomSceneProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  const handleMove = (type: "slot" | "object", id: string, dx: number, dy: number, dz: number, commit: boolean) => onMove?.({ type, id }, dx, dy, dz, commit);
  return <>
    <color attach="background" args={["#17191c"]} />
    <ambientLight intensity={0.6} />
    <hemisphereLight intensity={0.45} groundColor="#202226" color="#f2ead9" />
    <directionalLight position={[width * 0.25, height, depth * 0.15]} intensity={1.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <RoomShell3D room={room} showCeiling={showCeiling} />
    {slots.map((slot) => <RoomObject3D key={`slot-${slot.id}`} room={room} object={slot} isSlot photoUrl={photoForSlot?.(slot) ?? slot.photoUrl} selected={!viewerMode && selectedType === "slot" && selectedId === slot.id} onSelect={(id) => onSelect({ type: "slot", id })} onMove={(dx, dy, dz, commit) => handleMove("slot", slot.id, dx, dy, dz, commit)} />)}
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

function VivariumPhotoDock({ room, slot, onPhotoUrl }: { room: ReptileRoomWorkspace; slot: ReptileRoomSlot; onPhotoUrl: (slotId: string, url: string) => void }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selectedPhoto = slot.photoUrl || "";
  const upload = async (file: File) => {
    if (!user) return;
    setBusy(true);
    setMessage("");
    try {
      const url = await uploadReptileRoomVivariumPhoto(user.uid, room.id, slot.id, file);
      const nextRooms = [{ ...room, slots: room.slots.map((item) => item.id === slot.id ? { ...item, photoUrl: url } : item), updatedAt: new Date().toISOString() }];
      await saveReptileRooms(user.uid, nextRooms);
      onPhotoUrl(slot.id, url);
      setMessage("Photo applied to the vivarium glass.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Vivarium photo upload failed.");
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!user) return;
    setBusy(true);
    setMessage("");
    try {
      const nextRooms = [{ ...room, slots: room.slots.map((item) => item.id === slot.id ? { ...item, photoUrl: "" } : item), updatedAt: new Date().toISOString() }];
      await saveReptileRooms(user.uid, nextRooms);
      onPhotoUrl(slot.id, "");
      setMessage("Glass photo removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove the vivarium photo.");
    } finally {
      setBusy(false);
    }
  };
  return <div style={{ position: "absolute", right: 14, bottom: 14, zIndex: 40, width: "min(360px, calc(100% - 28px))", padding: 14, borderRadius: 14, border: "1px solid rgba(255,255,255,.14)", background: "rgba(12,10,16,.94)", color: "#fff", boxShadow: "0 14px 38px rgba(0,0,0,.38)", backdropFilter: "blur(12px)" }}>
    <div style={{ fontSize: 10, letterSpacing: ".08em", fontWeight: 850, opacity: .7, textTransform: "uppercase" }}>VIVARIUM GLASS</div>
    <strong style={{ display: "block", marginTop: 3 }}>{slot.label || "Vivarium"}</strong>
    <p style={{ margin: "6px 0 10px", color: "rgba(255,255,255,.72)", fontSize: 12, lineHeight: 1.45 }}>Each front glass door can use a photo of the real enclosure so your 3D room mirrors your actual setup.</p>
    {selectedPhoto && <img src={selectedPhoto} alt="Vivarium glass preview" style={{ display: "block", width: "100%", aspectRatio: "16/8", objectFit: "cover", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)", marginBottom: 10 }} />}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <label style={{ minHeight: 42, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 14px", borderRadius: 9, background: "#f0bb58", color: "#15100a", fontWeight: 850, cursor: busy ? "wait" : "pointer" }}>{busy ? "Working…" : selectedPhoto ? "Replace photo" : "Add enclosure photo"}<input type="file" accept="image/*" disabled={busy} style={{ display: "none" }} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} /></label>
      {selectedPhoto && <button type="button" disabled={busy} onClick={() => void remove()} style={{ minHeight: 42, padding: "0 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 800 }}>Remove</button>}
    </div>
    {message && <div role="status" style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,.72)" }}>{message}</div>}
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
  const [photoOverrides, setPhotoOverrides] = useState<Record<string, string>>({});
  const selectedVivarium = !viewerMode && selectedType === "slot" ? slots.find((slot) => slot.id === selectedId) ?? null : null;
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
  const handlePhotoUrl = (slotId: string, url: string) => setPhotoOverrides((current) => ({ ...current, [slotId]: url }));
  const effectivePhotoForSlot = photoForSlot ?? ((slot: ReptileRoomSlot) => photoOverrides[slot.id] || slot.photoUrl || undefined);
  const toggleFullscreen = async () => {
    const host = document.querySelector<HTMLElement>(`[data-rr3d-host="${CSS.escape(room.id)}"]`);
    if (!host) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await host.requestFullscreen();
    } catch { /* browser may block fullscreen; normal view remains usable */ }
  };
  const cameraPosition: [number, number, number] = [0, Math.max(0.5, height * 0.55), Math.max(0.5, depth * 0.28)];
  const canvasReady = ({ camera }: { camera: import("three").Camera }) => {
    const host = window as Room3DWindow;
    host.__tinyTitansRoom3DCamera = camera;
    window.dispatchEvent(new CustomEvent("tiny-titans:room3d-camera-ready"));
  };
  return <div data-rr3d-host={room.id} className={className} style={{ position: "relative", width: "100%", height: "100%", minHeight: isFullscreen ? "100vh" : 0, touchAction: viewerMode ? "none" : undefined, background: "#0c0f11" }}>
    <Canvas shadows camera={{ position: cameraPosition, fov: 68, near: 0.01, far: Math.max(width, depth, height) * 4 }} dpr={[1, 2]} onCreated={canvasReady} onPointerMissed={() => onSelect(null)}>
      <RoomScene room={room} showGrid={showGrid} showCeiling={showCeiling} viewerMode={viewerMode} objects={objects} slots={slots} selectedId={selectedId} selectedType={selectedType} photoForSlot={effectivePhotoForSlot} onSelect={onSelect} onMove={onMove} navigationNode={navigationNode} onTeleport={handleTeleport} />
    </Canvas>
    <button type="button" className="rr3d-fullscreen-button" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? "Exit full screen" : "Open full screen"} title={isFullscreen ? "Exit full screen" : "Open full screen"}>{isFullscreen ? "⛶ Exit" : "⛶ Full screen"}</button>
    {!viewerMode && <NavigationPad nodes={navigationNodes} activeNode={navigationNode} onMove={handleTeleport} />}
    {selectedVivarium && !photoForSlot && <VivariumPhotoDock room={room} slot={{ ...selectedVivarium, photoUrl: photoOverrides[selectedVivarium.id] ?? selectedVivarium.photoUrl }} onPhotoUrl={handlePhotoUrl} />}
  </div>;
}
