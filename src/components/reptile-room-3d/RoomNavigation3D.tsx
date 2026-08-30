import { useMemo, useState } from "react";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { getRoomDimensions3D } from "./room3DScale";

export const ROOM_NAVIGATION_SPACING_CM = 100;
const FLOOR_EDGE_MARGIN_CM = 45;
const MAX_NAVIGATION_AXIS_NODES = 32;
export type RoomNavigationNode = { id: string; xCm: number; zCm: number };

function buildAxisPositions(lengthCm: number): number[] {
  const usableMin = -lengthCm / 2 + FLOOR_EDGE_MARGIN_CM;
  const usableMax = lengthCm / 2 - FLOOR_EDGE_MARGIN_CM;
  if (usableMax <= usableMin) return [0];
  const span = usableMax - usableMin;
  const step = Math.max(ROOM_NAVIGATION_SPACING_CM, span / Math.max(1, MAX_NAVIGATION_AXIS_NODES - 1));
  const positions: number[] = [];
  for (let index = 0; index < MAX_NAVIGATION_AXIS_NODES; index += 1) {
    const value = Math.min(usableMax, usableMin + index * step);
    positions.push(Math.round(value));
    if (value >= usableMax - 0.001) break;
  }
  if (positions.length === 0) return [0];
  if (positions[positions.length - 1] !== Math.round(usableMax)) positions.push(Math.round(usableMax));
  return [...new Set(positions)];
}

function pointInPolygon(x: number, z: number, points: { x: number; z: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, zi = points[i].z;
    const xj = points[j].x, zj = points[j].z;
    const intersects = zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function buildRoomNavigationNodes(room: ReptileRoomWorkspace): RoomNavigationNode[] {
  const { width, depth } = getRoomDimensions3D(room);
  const floorPlan = room.floorPlan;
  const xPositions = buildAxisPositions(width * 100);
  const zPositions = buildAxisPositions(depth * 100);
  const nodes = zPositions.flatMap((zCm) => xPositions.map((xCm) => ({ id: `nav-${xCm}-${zCm}`, xCm, zCm })));
  if (!floorPlan || floorPlan.length < 3) return nodes;
  const offsetX = (room.width ?? 0) / 2;
  const offsetZ = (room.depth ?? 0) / 2;
  return nodes.filter((node) => pointInPolygon(node.xCm + offsetX, node.zCm + offsetZ, floorPlan));
}

function Footprints({ active, hovered }: { active: boolean; hovered: boolean }) {
  const colour = active ? "#d89a32" : hovered ? "#f2bd55" : "#e9ecef";
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} scale={active ? 1.08 : 1}>
      <mesh position={[-0.055, 0.055, 0]}>
        <capsuleGeometry args={[0.018, 0.065, 5, 8]} />
        <meshStandardMaterial color={colour} emissive={active || hovered ? colour : "#000000"} emissiveIntensity={active ? 0.45 : hovered ? 0.2 : 0} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <mesh position={[0.055, -0.055, 0]}>
        <capsuleGeometry args={[0.018, 0.065, 5, 8]} />
        <meshStandardMaterial color={colour} emissive={active || hovered ? colour : "#000000"} emissiveIntensity={active ? 0.45 : hovered ? 0.2 : 0} transparent opacity={0.9} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function RoomNavigation3D({ room, activeNodeId, onTeleport }: { room: ReptileRoomWorkspace; activeNodeId: string; onTeleport?: (node: RoomNavigationNode) => void }) {
  const nodes = useMemo(() => buildRoomNavigationNodes(room), [room]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  return (
    <group name="room-navigation">
      {nodes.map((node) => {
        const active = node.id === activeNodeId;
        const hovered = node.id === hoveredNodeId;
        return (
          <group
            key={node.id}
            position={[node.xCm / 100, 0, node.zCm / 100]}
            onPointerOver={(event) => { event.stopPropagation(); setHoveredNodeId(node.id); }}
            onPointerOut={() => setHoveredNodeId(null)}
            onClick={(event) => { event.stopPropagation(); onTeleport?.(node); }}
          >
            <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.18, 24]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={active ? 0.07 : hovered ? 0.11 : 0.035} depthWrite={false} />
            </mesh>
            <Footprints active={active} hovered={hovered} />
          </group>
        );
      })}
    </group>
  );
}
