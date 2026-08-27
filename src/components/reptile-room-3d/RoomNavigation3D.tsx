import { useMemo, useState } from "react";
import { Html } from "@react-three/drei";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import { getRoomDimensions3D } from "./room3DScale";

export const ROOM_NAVIGATION_SPACING_CM = 100;
const FLOOR_EDGE_MARGIN_CM = 45;

export type RoomNavigationNode = {
  id: string;
  xCm: number;
  zCm: number;
};

type RoomNavigation3DProps = {
  room: ReptileRoomWorkspace;
  activeNodeId: string;
  onTeleport: (node: RoomNavigationNode) => void;
};

function buildAxisPositions(lengthCm: number): number[] {
  const usableMin = -lengthCm / 2 + FLOOR_EDGE_MARGIN_CM;
  const usableMax = lengthCm / 2 - FLOOR_EDGE_MARGIN_CM;
  if (usableMax <= usableMin) return [0];
  const positions: number[] = [];
  for (let value = usableMin; value <= usableMax + 0.001; value += ROOM_NAVIGATION_SPACING_CM) positions.push(Math.round(value));
  return positions.length ? positions : [0];
}

export function buildRoomNavigationNodes(room: ReptileRoomWorkspace): RoomNavigationNode[] {
  const { width, depth } = getRoomDimensions3D(room);
  const xPositions = buildAxisPositions(width * 100);
  const zPositions = buildAxisPositions(depth * 100);
  return zPositions.flatMap((zCm) => xPositions.map((xCm) => ({ id: `nav-${xCm}-${zCm}`, xCm, zCm })));
}

function Footprints({ active, hovered }: { active: boolean; hovered: boolean }) {
  const colour = active ? "#d89a32" : hovered ? "#f2bd55" : "#e9ecef";
  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} scale={active ? 1.08 : 1}>
      <mesh position={[-0.055, 0.055, 0]}><capsuleGeometry args={[0.018, 0.065, 5, 8]} /><meshStandardMaterial color={colour} emissive={active || hovered ? colour : "#000000"} emissiveIntensity={active ? 0.45 : hovered ? 0.2 : 0} transparent opacity={0.92} /></mesh>
      <mesh position={[0.055, -0.055, 0]}><capsuleGeometry args={[0.018, 0.065, 5, 8]} /><meshStandardMaterial color={colour} emissive={active || hovered ? colour : "#000000"} emissiveIntensity={active ? 0.45 : hovered ? 0.2 : 0} transparent opacity={0.92} /></mesh>
    </group>
  );
}

export function RoomNavigation3D({ room, activeNodeId, onTeleport }: RoomNavigation3DProps) {
  const nodes = useMemo(() => buildRoomNavigationNodes(room), [room]);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  return (
    <group name="room-navigation">
      {nodes.map((node) => {
        const active = node.id === activeNodeId;
        const hovered = node.id === hoveredNodeId;
        return (
          <group key={node.id} position={[node.xCm / 100, 0, node.zCm / 100]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={(event) => { event.stopPropagation(); onTeleport(node); }} onPointerOver={(event) => { event.stopPropagation(); setHoveredNodeId(node.id); }} onPointerOut={() => setHoveredNodeId(null)}>
              <circleGeometry args={[0.18, 24]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={active ? 0.08 : hovered ? 0.13 : 0.04} depthWrite={false} />
            </mesh>
            <Footprints active={active} hovered={hovered} />
            {hovered && <Html position={[0, 0.08, 0]} center distanceFactor={5}><div style={{ pointerEvents: "none", whiteSpace: "nowrap", padding: "4px 7px", borderRadius: 6, background: "rgba(10,12,14,.9)", color: "#eef1f2", border: "1px solid #454b52", fontSize: 11 }}>Teleport · {node.xCm} × {node.zCm} cm</div></Html>}
          </group>
        );
      })}
    </group>
  );
}
