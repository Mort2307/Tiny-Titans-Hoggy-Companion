import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { ROOM_3D_CAMERA_MARGIN_CM } from "../../data/reptileRoomAssets";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld, getRoomDimensions3D } from "./room3DScale";
import { buildRoomNavigationNodes } from "./RoomNavigation3D";

/* eslint-disable react-hooks/immutability */
type RoomNavigationTarget = { xCm: number; zCm: number };
type RoomCamera3DProps = { room: ReptileRoomWorkspace; target?: RoomNavigationTarget };
const LOOK_SENSITIVITY = 0.0032;
const MIN_PITCH = -Math.PI / 2.35;
const MAX_PITCH = Math.PI / 2.35;
const DEFAULT_USER_HEIGHT_CM = 165;
const MIN_USER_HEIGHT_CM = 120;
const MAX_USER_HEIGHT_CM = 220;
const DEFAULT_PITCH = -0.08;
const USER_HEIGHT_STORAGE_KEY = "tinyTitans.rr3d.userHeightCm";

type Room3DWindow = Window & { __tinyTitansRoom3DCamera?: import("three").Camera };

function readUserHeight() {
  try {
    const stored = Number(localStorage.getItem(USER_HEIGHT_STORAGE_KEY));
    if (Number.isFinite(stored)) return Math.min(MAX_USER_HEIGHT_CM, Math.max(MIN_USER_HEIGHT_CM, Math.round(stored)));
  } catch { /* optional persistence */ }
  return DEFAULT_USER_HEIGHT_CM;
}

export function RoomCamera3D({ room, target }: RoomCamera3DProps) {
  const { camera, gl } = useThree();
  const { width, depth, height } = getRoomDimensions3D(room);
  const [userHeightCm, setUserHeightCm] = useState(readUserHeight);
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);
  const { margin, minX, maxX, minZ, maxZ } = useMemo(() => {
    const marginValue = Math.min(cmToWorld(ROOM_3D_CAMERA_MARGIN_CM), width / 4, depth / 4, height / 4);
    return { margin: marginValue, minX: -width / 2 + marginValue, maxX: width / 2 - marginValue, minZ: -depth / 2 + marginValue, maxZ: depth / 2 - marginValue };
  }, [width, depth, height]);
  const initialTarget = useMemo(() => buildRoomNavigationNodes(room).reduce((closest, node) => Math.hypot(node.xCm, node.zCm) < Math.hypot(closest.xCm, closest.zCm) ? node : closest, buildRoomNavigationNodes(room)[0] ?? { id: "nav-centre", xCm: 0, zCm: 0 }), [room]);
  const destination = target ?? initialTarget;
  const yawRef = useRef(0);
  const pitchRef = useRef(DEFAULT_PITCH);
  const cameraHeight = Math.min(height - margin, Math.max(margin, cmToWorld(Math.min(userHeightCm, (room.height ?? 240) - 10))));

  useEffect(() => {
    const host = window as Room3DWindow;
    host.__tinyTitansRoom3DCamera = camera;
    window.dispatchEvent(new CustomEvent("tiny-titans:room3d-camera-ready"));
    return () => {
      if (host.__tinyTitansRoom3DCamera === camera) delete host.__tinyTitansRoom3DCamera;
    };
  }, [camera]);

  useEffect(() => {
    setOverlayHost(gl.domElement.parentElement);
  }, [gl]);

  useEffect(() => {
    try { localStorage.setItem(USER_HEIGHT_STORAGE_KEY, String(userHeightCm)); } catch { /* optional persistence */ }
  }, [userHeightCm]);

  useEffect(() => {
    const canvas = gl.domElement; let dragging = false; let pointerId: number | null = null; let lastX = 0; let lastY = 0; let pendingStart: number | null = null;
    const isTransforming = () => document.documentElement.dataset.rr3dTransforming === "true";
    const onPointerDown = (event: PointerEvent) => { if (event.button !== 0 || isTransforming()) return; if (pendingStart !== null) cancelAnimationFrame(pendingStart); pendingStart = requestAnimationFrame(() => { pendingStart = null; if (isTransforming()) return; dragging = true; pointerId = event.pointerId; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture?.(event.pointerId); canvas.style.cursor = "grabbing"; }); };
    const onPointerMove = (event: PointerEvent) => { if (!dragging || pointerId !== event.pointerId || isTransforming()) return; const dx = event.clientX - lastX, dy = event.clientY - lastY; lastX = event.clientX; lastY = event.clientY; yawRef.current += dx * LOOK_SENSITIVITY; pitchRef.current = Math.min(MAX_PITCH, Math.max(MIN_PITCH, pitchRef.current - dy * LOOK_SENSITIVITY)); camera.rotation.order = "YXZ"; camera.rotation.y = yawRef.current; camera.rotation.x = pitchRef.current; };
    const stopDragging = (event: PointerEvent) => { if (pendingStart !== null) { cancelAnimationFrame(pendingStart); pendingStart = null; } if (pointerId !== event.pointerId) return; dragging = false; pointerId = null; if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId); canvas.style.cursor = "grab"; };
    canvas.style.cursor = "grab"; canvas.addEventListener("pointerdown", onPointerDown); canvas.addEventListener("pointermove", onPointerMove); canvas.addEventListener("pointerup", stopDragging); canvas.addEventListener("pointercancel", stopDragging);
    return () => { if (pendingStart !== null) cancelAnimationFrame(pendingStart); canvas.style.cursor = ""; if (pointerId !== null && canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId); canvas.removeEventListener("pointerdown", onPointerDown); canvas.removeEventListener("pointermove", onPointerMove); canvas.removeEventListener("pointerup", stopDragging); canvas.removeEventListener("pointercancel", stopDragging); };
  }, [camera, gl]);

  useEffect(() => { const x = Math.min(maxX, Math.max(minX, cmToWorld(destination.xCm))); const z = Math.min(maxZ, Math.max(minZ, cmToWorld(destination.zCm))); camera.rotation.order = "YXZ"; camera.rotation.y = yawRef.current; camera.rotation.x = pitchRef.current; camera.position.set(x, cameraHeight, z); }, [camera, destination.xCm, destination.zCm, cameraHeight, maxX, maxZ, minX, minZ]);

  const heightControl = overlayHost ? createPortal(
    <div style={{ position: "absolute", left: 16, bottom: 16, zIndex: 40, width: 220, padding: "10px 12px", borderRadius: 12, border: "1px solid rgba(255,255,255,.14)", background: "rgba(10,14,16,.9)", color: "#f4f7f8", boxShadow: "0 10px 28px rgba(0,0,0,.32)", backdropFilter: "blur(10px)", fontFamily: "system-ui,sans-serif", pointerEvents: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".09em", opacity: .65 }}>VIEWER HEIGHT</span>
        <strong style={{ fontSize: 13 }}>{userHeightCm} cm</strong>
      </div>
      <input aria-label="Viewer height in centimetres" type="range" min={MIN_USER_HEIGHT_CM} max={MAX_USER_HEIGHT_CM} step={1} value={userHeightCm} onChange={(event) => setUserHeightCm(Number(event.target.value))} style={{ width: "100%", accentColor: "#e2ad4f" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 8, opacity: .45 }}><span>{MIN_USER_HEIGHT_CM} cm</span><span>{MAX_USER_HEIGHT_CM} cm</span></div>
      <div style={{ marginTop: 6, fontSize: 8, lineHeight: 1.35, opacity: .55 }}>Sets the camera at your eye level for a more accurate real-world room view.</div>
    </div>,
    overlayHost,
  ) : null;

  return heightControl;
}

export function getCameraForwardSpawn(camera: { position: Vector3; getWorldDirection: (target: Vector3) => Vector3 }, distanceCm: number, room: ReptileRoomWorkspace) { const direction = camera.getWorldDirection(new Vector3()); const distance = cmToWorld(distanceCm); const xWorld = camera.position.x + direction.x * distance; const zWorld = camera.position.z + direction.z * distance; const width = room.width ?? 0; const depth = room.depth ?? 0; const xCm = xWorld * 100 + width / 2; const zCm = zWorld * 100 + depth / 2; return { xCm, yCm: zCm, zCm }; }
