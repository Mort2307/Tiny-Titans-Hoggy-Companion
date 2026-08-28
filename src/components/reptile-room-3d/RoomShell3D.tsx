import { useMemo } from "react";
import { DoubleSide } from "three";
import type { ReptileRoomWorkspace, ReptileRoomWall } from "../../services/reptileRoomService";
import { cmToWorld, getRoomDimensions3D } from "./room3DScale";
import { ROOM_3D_WALL_THICKNESS_CM } from "../../data/reptileRoomAssets";

type RoomShell3DProps = { room: ReptileRoomWorkspace; showCeiling: boolean };

function pointToWorld(room: ReptileRoomWorkspace, x: number, z: number): [number, number] {
  return [cmToWorld(x - (room.width ?? 0) / 2), cmToWorld(z - (room.depth ?? 0) / 2)];
}

function WallSegment({ room, wall }: { room: ReptileRoomWorkspace; wall: ReptileRoomWall }) {
  const [sx, sz] = pointToWorld(room, wall.start.x, wall.start.z);
  const [ex, ez] = pointToWorld(room, wall.end.x, wall.end.z);
  const dx = ex - sx;
  const dz = ez - sz;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dz, dx);
  const thickness = cmToWorld(wall.thickness ?? ROOM_3D_WALL_THICKNESS_CM);
  const height = cmToWorld(wall.height ?? room.height ?? 240);
  return <mesh position={[(sx + ex) / 2, height / 2, (sz + ez) / 2]} rotation={[0, -angle, 0]} receiveShadow name={`wall-${wall.id}`}>
    <boxGeometry args={[length, height, thickness]} />
    <meshStandardMaterial color={wall.colour ?? "#6d6257"} roughness={0.95} side={DoubleSide} />
  </mesh>;
}

function RoomFloor({ room }: { room: ReptileRoomWorkspace }) {
  const points = room.floorPlan ?? [{ x: 0, z: 0 }, { x: room.width ?? 360, z: 0 }, { x: room.width ?? 360, z: room.depth ?? 300 }, { x: 0, z: room.depth ?? 300 }];
  const shape = useMemo(() => {
    const result = new (require("three").Shape)();
    points.forEach((point, index) => {
      const [x, z] = pointToWorld(room, point.x, point.z);
      if (index === 0) result.moveTo(x, z); else result.lineTo(x, z);
    });
    result.closePath();
    return result;
  }, [points, room]);
  return <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow name="room-floor">
    <shapeGeometry args={[shape]} />
    <meshStandardMaterial color="#30343a" roughness={0.9} side={DoubleSide} />
  </mesh>;
}

function PowerSocket({ room, socket }: { room: ReptileRoomWorkspace; socket: NonNullable<ReptileRoomWorkspace["sockets"]>[number] }) {
  const wall = room.walls?.find((item) => item.id === socket.wallId);
  if (!wall) return null;
  const [x, z] = pointToWorld(room, socket.x, socket.z);
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const angle = Math.atan2(dz, dx);
  const height = cmToWorld(socket.height);
  return <group position={[x, height, z]} rotation={[0, -angle, 0]} name={`socket-${socket.id}`}>
    <mesh position={[0, 0, -0.008]}><boxGeometry args={[0.14, 0.1, 0.018]} /><meshStandardMaterial color="#ece8df" roughness={0.55} /></mesh>
    {Array.from({ length: Math.min(4, socket.outlets) }).map((_, index) => <mesh key={index} position={[(index - (Math.min(4, socket.outlets) - 1) / 2) * 0.035, 0, -0.02]}><circleGeometry args={[0.009, 12]} /><meshStandardMaterial color="#202328" /></mesh>)}
  </group>;
}

export function RoomShell3D({ room, showCeiling }: RoomShell3DProps) {
  const { width, depth, height } = getRoomDimensions3D(room);
  const wallThickness = cmToWorld(ROOM_3D_WALL_THICKNESS_CM);
  const walls = room.walls?.length ? room.walls : [
    { id: "north", start: { x: 0, z: 0 }, end: { x: width * 100, z: 0 }, height: height * 100, thickness: ROOM_3D_WALL_THICKNESS_CM, colour: "#6d6257" },
    { id: "east", start: { x: width * 100, z: 0 }, end: { x: width * 100, z: depth * 100 }, height: height * 100, thickness: ROOM_3D_WALL_THICKNESS_CM, colour: "#6d6257" },
    { id: "south", start: { x: width * 100, z: depth * 100 }, end: { x: 0, z: depth * 100 }, height: height * 100, thickness: ROOM_3D_WALL_THICKNESS_CM, colour: "#6d6257" },
    { id: "west", start: { x: 0, z: depth * 100 }, end: { x: 0, z: 0 }, height: height * 100, thickness: ROOM_3D_WALL_THICKNESS_CM, colour: "#6d6257" },
  ];
  return <group name="room-shell-3d">
    <RoomFloor room={room} />
    {walls.map((wall) => <WallSegment key={wall.id} room={room} wall={wall} />)}
    {(room.sockets ?? []).map((socket) => <PowerSocket key={socket.id} room={room} socket={socket} />)}
    {showCeiling && <mesh position={[0, height + wallThickness / 2, 0]} receiveShadow><boxGeometry args={[width + wallThickness * 2, wallThickness, depth + wallThickness * 2]} /><meshStandardMaterial color="#45484d" roughness={0.9} /></mesh>}
  </group>;
}
