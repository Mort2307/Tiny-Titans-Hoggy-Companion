import { useEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { ROOM_3D_CAMERA_HEIGHT_RATIO, ROOM_3D_CAMERA_MARGIN_CM } from "../../data/reptileRoomAssets";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { cmToWorld, getRoomDimensions3D } from "./room3DScale";
import { buildRoomNavigationNodes } from "./RoomNavigation3D";

// Three.js cameras/renderers are intentionally mutable scene-graph objects. The
// React hooks immutability rule is aimed at React-owned values and cannot model
// these imperative Three.js APIs correctly, so this component opts out locally.
/* eslint-disable react-hooks/immutability */

type RoomNavigationTarget = { xCm: number; zCm: number };
type RoomCamera3DProps = { room: ReptileRoomWorkspace; target?: RoomNavigationTarget };

const LOOK_SENSITIVITY = 0.0032;
const MIN_PITCH = -Math.PI / 2.35;
const MAX_PITCH = Math.PI / 2.35;

export function RoomCamera3D({ room, target }: RoomCamera3DProps) {
  const { camera, gl } = useThree();
  const { width, depth, height } = getRoomDimensions3D(room);
  const margin = Math.min(cmToWorld(ROOM_3D_CAMERA_MARGIN_CM), width / 4, depth / 4, height / 4);
  const minX = -width / 2 + margin;
  const maxX = width / 2 - margin;
  const minZ = -depth / 2 + margin;
  const maxZ = depth / 2 - margin;
  const initialTarget = useMemo(() => buildRoomNavigationNodes(room)[0] ?? { xCm: 0, zCm: 0 }, [room]);
  const destination = target ?? initialTarget;
  const yawRef = useRef(camera.rotation.y);
  const pitchRef = useRef(camera.rotation.x);

  useEffect(() => {
    const canvas = gl.domElement;
    let dragging = false;
    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let pendingStart: number | null = null;

    const isTransforming = () => document.documentElement.dataset.rr3dTransforming === "true";

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
      pitchRef.current = Math.min(MAX_PITCH, Math.max(MIN_PITCH, pitchRef.current - dy * LOOK_SENSITIVITY));
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
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
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
      if (pointerId !== null && canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
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
    camera.position.set(x, Math.min(height - margin, Math.max(margin, height * ROOM_3D_CAMERA_HEIGHT_RATIO)), z);
  }, [camera, destination.xCm, destination.zCm, height, margin, maxX, maxZ, minX, minZ]);

  return null;
}

export function getCameraForwardSpawn(camera: { position: Vector3; getWorldDirection: (target: Vector3) => Vector3 }, distanceCm: number, room: ReptileRoomWorkspace) {
  const direction = camera.getWorldDirection(new Vector3());
  const distance = cmToWorld(distanceCm);
  const xWorld = camera.position.x + direction.x * distance;
  const zWorld = camera.position.z + direction.z * distance;
  const width = room.width ?? 0;
  const depth = room.depth ?? 0;
  return { xCm: xWorld * 100 + width / 2, yCm: zWorld * 100 + depth / 2 };
}
