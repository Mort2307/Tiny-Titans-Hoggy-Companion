import { useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { PerspectiveCamera, Vector3 } from "three";
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
const CAMERA_FOV = 72;

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
  const [userHeightCm, setUserHeightCm] = useState(readUserHeight);
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
  const effectiveUserHeightCm = Math.min(
    userHeightCm,
    Math.max(MIN_USER_HEIGHT_CM, (room.height ?? 240) - 10),
  );
  const cameraHeight = Math.min(
    height - margin,
    Math.max(margin, cmToWorld(effectiveUserHeightCm)),
  );

  useEffect(() => {
    try {
      localStorage.setItem(USER_HEIGHT_STORAGE_KEY, String(userHeightCm));
    } catch {
      // Optional persistence only.
    }
  }, [userHeightCm]);

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
    const stage = gl.domElement.parentElement;
    if (!stage) return undefined;

    const control = document.createElement("div");
    control.className = "rr3d-camera-height-control";
    Object.assign(control.style, {
      position: "absolute",
      top: "11px",
      right: "11px",
      zIndex: "46",
      display: "grid",
      gap: "6px",
      minWidth: "150px",
      padding: "9px 10px",
      border: "1px solid rgba(255,255,255,.14)",
      borderRadius: "10px",
      background: "rgba(13,16,18,.88)",
      backdropFilter: "blur(9px)",
      color: "#eef1f2",
      boxShadow: "0 8px 22px rgba(0,0,0,.24)",
      pointerEvents: "auto",
      userSelect: "none",
    });

    const label = document.createElement("label");
    label.textContent = "Keeper camera height";
    Object.assign(label.style, {
      fontSize: ".66rem",
      fontWeight: "800",
      letterSpacing: ".04em",
      textTransform: "uppercase",
      opacity: ".72",
    });

    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "grid",
      gridTemplateColumns: "1fr 58px",
      gap: "7px",
      alignItems: "center",
    });

    const range = document.createElement("input");
    range.type = "range";
    range.min = String(MIN_USER_HEIGHT_CM);
    range.max = String(MAX_USER_HEIGHT_CM);
    range.step = "1";
    range.value = String(userHeightCm);
    range.setAttribute("aria-label", "Keeper camera height in centimetres");
    range.style.width = "100%";

    const number = document.createElement("input");
    number.type = "number";
    number.min = String(MIN_USER_HEIGHT_CM);
    number.max = String(MAX_USER_HEIGHT_CM);
    number.step = "1";
    number.value = String(userHeightCm);
    number.setAttribute("aria-label", "Keeper camera height");
    Object.assign(number.style, {
      width: "58px",
      boxSizing: "border-box",
      padding: "5px 6px",
      border: "1px solid rgba(255,255,255,.15)",
      borderRadius: "7px",
      background: "#101316",
      color: "#eef1f2",
      font: "inherit",
      fontSize: ".69rem",
      fontWeight: "800",
    });

    const valueText = document.createElement("div");
    valueText.textContent = `${userHeightCm} cm`;
    Object.assign(valueText.style, {
      fontSize: ".6rem",
      opacity: ".52",
      textAlign: "right",
    });

    const applyHeight = (raw: string) => {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) return;
      const next = Math.min(MAX_USER_HEIGHT_CM, Math.max(MIN_USER_HEIGHT_CM, Math.round(numeric)));
      setUserHeightCm(next);
      range.value = String(next);
      number.value = String(next);
      valueText.textContent = `${next} cm`;
    };

    const onRangeInput = () => applyHeight(range.value);
    const onNumberInput = () => applyHeight(number.value);
    range.addEventListener("input", onRangeInput);
    number.addEventListener("input", onNumberInput);
    control.addEventListener("pointerdown", (event) => event.stopPropagation());
    control.addEventListener("click", (event) => event.stopPropagation());

    row.append(range, number);
    control.append(label, row, valueText);
    stage.appendChild(control);

    return () => {
      range.removeEventListener("input", onRangeInput);
      number.removeEventListener("input", onNumberInput);
      control.remove();
    };
  }, [gl, userHeightCm]);

  useEffect(() => {
    const canvas = gl.domElement;
    const stage = canvas.parentElement;
    if (!stage) return undefined;

    const syncViewport = () => {
      if (!(camera instanceof PerspectiveCamera)) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      camera.aspect = rect.width / rect.height;
      camera.fov = CAMERA_FOV;
      camera.near = 0.01;
      camera.far = Math.max(width, depth, height) * 5;
      camera.updateProjectionMatrix();
    };

    syncViewport();
    const observer = new ResizeObserver(syncViewport);
    observer.observe(canvas);
    window.addEventListener("resize", syncViewport);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncViewport);
    };
  }, [camera, gl, height, width, depth]);

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
