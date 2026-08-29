import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { ROOM_3D_CAMERA_MARGIN_CM } from "../../data/reptileRoomAssets";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld, getRoomDimensions3D } from "./room3DScale";
import { buildRoomNavigationNodes } from "./RoomNavigation3D";

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
    if (Number.isFinite(stored)) {
      return Math.min(MAX_USER_HEIGHT_CM, Math.max(MIN_USER_HEIGHT_CM, Math.round(stored)));
    }
  } catch {
    // Optional persistence only.
  }
  return DEFAULT_USER_HEIGHT_CM;
}

export function RoomCamera3D({ room, target }: RoomCamera3DProps) {
  const { camera, gl } = useThree();
  const { width, depth, height } = getRoomDimensions3D(room);
  const [userHeightCm] = useState(readUserHeight);
  const { margin, minX, maxX, minZ, maxZ } = useMemo(() => {
    const marginValue = Math.min(
      cmToWorld(ROOM_3D_CAMERA_MARGIN_CM),
      width / 4,
      depth / 4,
      height / 4,
    );
    return {
      margin: marginValue,
      minX: -width / 2 + marginValue,
      maxX: width / 2 - marginValue,
      minZ: -depth / 2 + marginValue,
      maxZ: depth / 2 - marginValue,
    };
  }, [width, depth, height]);

  const initialTarget = useMemo(() => {
    const nodes = buildRoomNavigationNodes(room);
    if (!nodes.length) return { id: "nav-centre", xCm: 0, zCm: 0 };
    return nodes.reduce(
      (closest, node) =>
        Math.hypot(node.xCm, node.zCm) < Math.hypot(closest.xCm, closest.zCm)
          ? node
          : closest,
      nodes[0],
    );
  }, [room]);

  const destination = target ?? initialTarget;
  const yawRef = useRef(0);
  const pitchRef = useRef(DEFAULT_PITCH);
  const cameraHeight = Math.min(
    height - margin,
    Math.max(
      margin,
      cmToWorld(
        Math.min(
          userHeightCm,
          Math.max(MIN_USER_HEIGHT_CM, (room.height ?? 240) - 10),
        ),
      ),
    ),
  );

  useEffect(() => {
    const host = window as Room3DWindow;
    host.__tinyTitansRoom3DCamera = camera;
    window.dispatchEvent(new CustomEvent("tiny-titans:room3d-camera-ready"));
    return () => {
      if (host.__tinyTitansRoom3DCamera === camera) {
        delete host.__tinyTitansRoom3DCamera;
      }
    };
  }, [camera]);

  useEffect(() => {
    try {
      localStorage.setItem(USER_HEIGHT_STORAGE_KEY, String(userHeightCm));
    } catch {
      // Optional persistence only.
    }
  }, [userHeightCm]);

  useEffect(() => {
    const canvas = gl.domElement;
    let dragging = false;
    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let pendingStart: number | null = null;

    const isTransforming = () =>
      document.documentElement.dataset.rr3dTransforming === "true";

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || isTransforming()) return;
      if (pendingStart !== null) cancelAnimationFrame(pendingStart);
      pendingStart = requestAnimationFrame(() => {
        pendingStart = null;
        if (isTransforming()) return;
        dragging = true;
        pointerId = event.pointerId;
        lastX = event.clientX;
        lastY = event.clientY;
        canvas.setPointerCapture?.(event.pointerId);
        canvas.style.cursor = "grabbing";
      });
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging || pointerId !== event.pointerId || isTransforming()) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      yawRef.current += dx * LOOK_SENSITIVITY;
      pitchRef.current = Math.min(
        MAX_PITCH,
        Math.max(MIN_PITCH, pitchRef.current - dy * LOOK_SENSITIVITY),
      );
      camera.rotation.order = "YXZ";
      camera.rotation.y = yawRef.current;
      camera.rotation.x = pitchRef.current;
    };

    const stopDragging = (event: PointerEvent) => {
      if (pendingStart !== null) {
        cancelAnimationFrame(pendingStart);
        pendingStart = null;
      }
      if (pointerId !== event.pointerId) return;
      dragging = false;
      pointerId = null;
      if (canvas.hasPointerCapture?.(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      canvas.style.cursor = "grab";
    };

    canvas.style.cursor = "grab";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", stopDragging);
    canvas.addEventListener("pointercancel", stopDragging);

    return () => {
      if (pendingStart !== null) cancelAnimationFrame(pendingStart);
      canvas.style.cursor = "";
      if (pointerId !== null && canvas.hasPointerCapture?.(pointerId)) {
        canvas.releasePointerCapture(pointerId);
      }
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", stopDragging);
      canvas.removeEventListener("pointercancel", stopDragging);
    };
  }, [camera, gl]);

  useEffect(() => {
    const x = Math.min(maxX, Math.max(minX, cmToWorld(destination.xCm)));
    const z = Math.min(maxZ, Math.max(minZ, cmToWorld(destination.zCm)));
    camera.rotation.order = "YXZ";
    camera.rotation.y = yawRef.current;
    camera.rotation.x = pitchRef.current;
    camera.position.set(x, cameraHeight, z);
  }, [camera, destination.xCm, destination.zCm, cameraHeight, maxX, maxZ, minX, minZ]);

  // IMPORTANT: this component must never return DOM from inside <Canvas>.
  return null;
}

export function getCameraForwardSpawn(
  camera: { position: Vector3; getWorldDirection: (target: Vector3) => Vector3 },
  distanceCm: number,
  room: ReptileRoomWorkspace,
) {
  const direction = camera.getWorldDirection(new Vector3());
  const distance = cmToWorld(distanceCm);
  const xWorld = camera.position.x + direction.x * distance;
  const zWorld = camera.position.z + direction.z * distance;
  const width = room.width ?? 0;
  const depth = room.depth ?? 0;
  const xCm = xWorld * 100 + width / 2;
  const zCm = zWorld * 100 + depth / 2;
  return { xCm, yCm: zCm, zCm };
}
