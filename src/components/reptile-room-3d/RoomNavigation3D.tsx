import { useMemo, useState } from "react";
import type { ReptileRoomWorkspace } from "../../services/reptileRoomService";
import {
  buildRoomNavigationNodes,
} from "../../lib/roomNavigation";

export type { RoomNavigationNode } from "../../lib/roomNavigation";

export { buildRoomNavigationNodes, ROOM_NAVIGATION_SPACING_CM } from "../../lib/roomNavigation";

function Footprints({ active, hovered }: { active: boolean; hovered: boolean }) {
  const colour = active ? "#d89a32" : hovered ? "#f2bd55" : "#e9ecef";

  return (
    <group
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.025, 0]}
      scale={active ? 1.08 : 1}
    >
      <mesh position={[-0.055, 0.055, 0]}>
        <capsuleGeometry args={[0.018, 0.065, 5, 8]} />
        <meshStandardMaterial
          color={colour}
          emissive={active || hovered ? colour : "#000000"}
          emissiveIntensity={active ? 0.45 : hovered ? 0.2 : 0}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.055, -0.055, 0]}>
        <capsuleGeometry args={[0.018, 0.065, 5, 8]} />
        <meshStandardMaterial
          color={colour}
          emissive={active || hovered ? colour : "#000000"}
          emissiveIntensity={active ? 0.45 : hovered ? 0.2 : 0}
          transparent
          opacity={0.9}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function RoomNavigation3D({
  room,
  activeNodeId,
  onTeleport,
}: {
  room: ReptileRoomWorkspace;
  activeNodeId: string;
  onTeleport?: (node: import("../../lib/roomNavigation").RoomNavigationNode) => void;
}) {
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
            onPointerOver={(event) => {
              event.stopPropagation();
              setHoveredNodeId(node.id);
            }}
            onPointerOut={() => setHoveredNodeId(null)}
            onClick={(event) => {
              event.stopPropagation();
              onTeleport?.(node);
            }}
          >
            <mesh
              position={[0, 0.012, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <circleGeometry args={[0.18, 24]} />
              <meshStandardMaterial
                color="#ffffff"
                transparent
                opacity={active ? 0.07 : hovered ? 0.11 : 0.035}
                depthWrite={false}
              />
            </mesh>
            <Footprints active={active} hovered={hovered} />
          </group>
        );
      })}
    </group>
  );
}
