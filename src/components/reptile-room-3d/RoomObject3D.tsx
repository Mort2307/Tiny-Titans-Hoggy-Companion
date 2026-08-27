import { useMemo } from "react";
import type { ReptileRoomObject, ReptileRoomSlot } from "../../services/reptileRoomService";
import { cmToWorld } from "./room3DScale";

type RoomObject3DProps = {
  object: ReptileRoomObject | ReptileRoomSlot;
  selected: boolean;
  onSelect: (id: string) => void;
  isSlot?: boolean;
};

function dimensions(item: ReptileRoomObject | ReptileRoomSlot) {
  if ("w" in item) {
    return {
      width: item.w,
      depth: item.depth ?? item.w,
      height: item.height ?? item.h,
    };
  }

  return {
    width: item.width,
    depth: item.depth,
    height: item.height,
  };
}

function rotationFor(item: ReptileRoomObject | ReptileRoomSlot): number {
  return "rotation" in item && typeof item.rotation === "number" ? item.rotation : 0;
}

export function RoomObject3D({ object, selected, onSelect, isSlot = false }: RoomObject3DProps) {
  const size = dimensions(object);
  const position = useMemo<[number, number, number]>(() => [
    cmToWorld(object.x + size.width / 2),
    cmToWorld(object.y + size.height / 2),
    cmToWorld(object.z + size.depth / 2),
  ], [object.x, object.y, object.z, size.width, size.depth, size.height]);

  const rotationY = rotationFor(object) * Math.PI / 180;
  const bodyHeight = Math.max(0.01, cmToWorld(size.height));
  const bodyWidth = Math.max(0.01, cmToWorld(size.width));
  const bodyDepth = Math.max(0.01, cmToWorld(size.depth));

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(object.id);
      }}
      userData={{ roomObjectId: object.id, isVivarium: isSlot }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[bodyWidth, bodyHeight, bodyDepth]} />
        <meshStandardMaterial
          color={selected ? "#d89a32" : isSlot ? "#6d4630" : "#4b5057"}
          roughness={0.72}
        />
      </mesh>

      {isSlot && (
        <mesh position={[0, bodyHeight / 2 + 0.003, 0]}>
          <boxGeometry args={[bodyWidth * 0.94, 0.006, bodyDepth * 0.94]} />
          <meshStandardMaterial color="#172027" roughness={0.45} />
        </mesh>
      )}

      {selected && (
        <mesh position={[0, bodyHeight / 2 + 0.008, 0]}>
          <boxGeometry args={[bodyWidth + 0.012, 0.012, bodyDepth + 0.012]} />
          <meshStandardMaterial
            color="#f2bd55"
            emissive="#7a4d0d"
            emissiveIntensity={0.6}
          />
        </mesh>
      )}
    </group>
  );
}

export function getRoomObjectLabel(item: ReptileRoomObject | ReptileRoomSlot): string {
  return item.label;
}
