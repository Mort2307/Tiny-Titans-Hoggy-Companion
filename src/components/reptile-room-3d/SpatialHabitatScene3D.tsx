import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import { Shape, ShapeGeometry } from "three";
import type { Group } from "three";
import type { SpatialHabitatScene, SpatialNode, SpatialRoomSocket, SpatialRoomWall } from "../../types/spatialHabitat";
import { childrenOf, snapCm } from "../../services/spatialHabitatService";
import { cmToWorld } from "./room3DScale";

type Props = {
  scene: SpatialHabitatScene;
  containerId: string;
  selectedId: string | null;
  showGrid?: boolean;
  showCeiling?: boolean;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number, z: number) => void;
  onEnter: (id: string) => void;
};

function nodeColor(node: SpatialNode) {
  if (node.category === "enclosure") return "#91a9af";
  if (node.category === "heating") return "#a66039";
  if (node.category === "lighting") return "#d8b24e";
  if (node.category === "power") return "#444c51";
  if (node.category === "monitoring") return "#60757d";
  if (node.category === "enrichment") return "#65784f";
  if (node.category === "water") return "#628894";
  if (node.category === "storage") return "#6e5b49";
  return "#777c7f";
}

function Visual({ node, selected, onSelect, onEnter }: { node: SpatialNode; selected: boolean; onSelect: () => void; onEnter: () => void }) {
  const width = cmToWorld(node.dimensions.width);
  const depth = cmToWorld(node.dimensions.depth);
  const height = cmToWorld(node.dimensions.height);
  const transparent = node.kind === "vivarium";

  return (
    <group
      onClick={(event) => { event.stopPropagation(); onSelect(); }}
      onDoubleClick={(event) => { event.stopPropagation(); if (node.capabilities.container) onEnter(); }}
    >
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={nodeColor(node)} roughness={transparent ? 0.18 : 0.72} transparent={transparent} opacity={transparent ? 0.16 : 1} emissive="#efbd55" emissiveIntensity={selected ? 0.3 : 0} />
      </mesh>

      {node.kind === "vivarium" && (
        <>
          <mesh position={[0, 0.012, 0]}>
            <boxGeometry args={[width * 0.96, 0.024, depth * 0.96]} />
            <meshStandardMaterial color="#2a211a" roughness={1} />
          </mesh>
          <mesh position={[0, height * 0.5, depth * 0.5]}>
            <boxGeometry args={[width * 0.96, height * 0.94, 0.012]} />
            <meshStandardMaterial color="#d9edf0" transparent opacity={0.08} />
          </mesh>
        </>
      )}

      {["rack", "shelving"].includes(node.kind) && [0.18, 0.5, 0.82].map((ratio) => (
        <mesh key={ratio} position={[0, height * ratio, 0]}>
          <boxGeometry args={[width * 0.94, Math.max(0.012, height * 0.025), depth * 0.94]} />
          <meshStandardMaterial color="#34383a" roughness={0.75} />
        </mesh>
      ))}

      {node.kind === "plant" && (
        <group>
          {[0, 1, 2, 3, 4].map((index) => {
            const angle = index * Math.PI * 2 / 5;
            return (
              <mesh key={index} position={[Math.cos(angle) * width * 0.18, height * 0.42, Math.sin(angle) * depth * 0.18]} rotation={[0.3, angle, 0.2]}>
                <coneGeometry args={[Math.max(width * 0.11, 0.02), height * 0.45, 6]} />
                <meshStandardMaterial color="#56744c" roughness={0.95} />
              </mesh>
            );
          })}
        </group>
      )}

      {node.kind === "branch" && (
        <mesh position={[0, height * 0.55, 0]} rotation={[0.15, 0, -0.45]} castShadow>
          <cylinderGeometry args={[Math.max(width * 0.035, 0.008), Math.max(width * 0.055, 0.011), Math.max(width, depth) * 1.1, 10]} />
          <meshStandardMaterial color="#68472e" roughness={1} />
        </mesh>
      )}

      {node.kind === "water-bowl" && (
        <mesh position={[0, height * 0.75, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[Math.min(width, depth) * 0.27, Math.max(0.012, Math.min(width, depth) * 0.08), 16, 24]} />
          <meshStandardMaterial color="#8db9c4" roughness={0.2} />
        </mesh>
      )}

      {["door", "window"].includes(node.kind) && (
        <group position={[0, height * 0.5, 0]}>
          <mesh>
            <boxGeometry args={[width * 0.94, height * 0.9, Math.max(0.018, depth * 0.7)]} />
            <meshStandardMaterial color={node.kind === "window" ? "#9cc1c9" : "#604936"} roughness={node.kind === "window" ? 0.2 : 0.85} transparent={node.kind === "window"} opacity={node.kind === "window" ? 0.38 : 1} />
          </mesh>
          <mesh position={[-width * 0.47, 0, depth * 0.01]}>
            <boxGeometry args={[Math.max(0.01, width * 0.03), height, Math.max(0.02, depth * 0.9)]} />
            <meshStandardMaterial color="#282d2e" roughness={0.7} />
          </mesh>
          <mesh position={[width * 0.47, 0, depth * 0.01]}>
            <boxGeometry args={[Math.max(0.01, width * 0.03), height, Math.max(0.02, depth * 0.9)]} />
            <meshStandardMaterial color="#282d2e" roughness={0.7} />
          </mesh>
        </group>
      )}

      {["heat-mat", "che", "halogen", "dhp", "rhp", "basking-light"].includes(node.kind) && (
        <group>
          {node.kind === "heat-mat" ? (
            <mesh position={[0, 0.02, 0]}>
              <boxGeometry args={[width * 0.92, 0.035, depth * 0.92]} />
              <meshStandardMaterial color="#4c3430" roughness={0.95} />
            </mesh>
          ) : (
            <mesh position={[0, height * 0.58, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[Math.max(0.025, Math.min(width, depth) * 0.18), Math.max(0.025, Math.min(width, depth) * 0.22), Math.max(0.06, height * 0.7), 12]} />
              <meshStandardMaterial color="#553e2d" emissive="#b96c32" emissiveIntensity={node.kind === "halogen" || node.kind === "basking-light" ? 0.32 : 0.18} roughness={0.65} />
            </mesh>
          )}
        </group>
      )}

      {["ceiling-light", "led-bar", "lamp"].includes(node.kind) && (
        <mesh position={[0, Math.max(0.01, height * 0.7), 0]}>
          <boxGeometry args={[width * 0.9, Math.max(0.025, height * 0.18), Math.max(0.025, depth * 0.3)]} />
          <meshStandardMaterial color="#e3d6af" emissive="#d2b35f" emissiveIntensity={0.45} roughness={0.4} />
        </mesh>
      )}

      {["thermostat", "thermometer", "hygrometer", "temp-humidity"].includes(node.kind) && (
        <group position={[0, height * 0.62, 0]}>
          <mesh>
            <boxGeometry args={[Math.max(0.035, width * 0.45), Math.max(0.035, height * 0.48), Math.max(0.02, depth * 0.35)]} />
            <meshStandardMaterial color="#38464b" roughness={0.52} />
          </mesh>
          <mesh position={[0, 0, Math.max(0.012, depth * 0.2)]}>
            <boxGeometry args={[Math.max(0.018, width * 0.28), Math.max(0.018, height * 0.22), 0.008]} />
            <meshStandardMaterial color="#c6d4d2" emissive="#a9cbc4" emissiveIntensity={0.2} roughness={0.25} />
          </mesh>
        </group>
      )}

      {["socket", "switched-socket", "power-strip", "timer", "smart-plug"].includes(node.kind) && (
        <group position={[0, height * 0.56, 0]}>
          <mesh>
            <boxGeometry args={[Math.max(0.05, width * 0.7), Math.max(0.04, height * 0.42), Math.max(0.025, depth * 0.45)]} />
            <meshStandardMaterial color="#202427" roughness={0.64} />
          </mesh>
          <mesh position={[0, 0, Math.max(0.014, depth * 0.25)]}>
            <boxGeometry args={[Math.max(0.025, width * 0.3), Math.max(0.02, height * 0.16), 0.008]} />
            <meshStandardMaterial color="#b7c2c1" roughness={0.34} />
          </mesh>
        </group>
      )}

      {["hide", "cork"].includes(node.kind) && (
        <mesh position={[0, height * 0.42, 0]} scale={[1, 0.72, 1]} castShadow>
          <sphereGeometry args={[Math.max(0.05, Math.min(width, depth) * 0.32), 16, 10]} />
          <meshStandardMaterial color="#5f4a36" roughness={1} />
        </mesh>
      )}

      {node.kind === "scale" && (
        <mesh position={[0, Math.max(0.02, height * 0.18), 0]}>
          <boxGeometry args={[width * 0.9, Math.max(0.025, height * 0.22), depth * 0.9]} />
          <meshStandardMaterial color="#b9bab2" roughness={0.42} />
        </mesh>
      )}

      {node.kind === "uvb" && (
        <mesh position={[0, height * 0.55, 0]}>
          <boxGeometry args={[width * 0.9, Math.max(0.012, height * 0.16), Math.max(0.012, depth * 0.25)]} />
          <meshStandardMaterial color="#e8ddac" emissive="#bba65a" emissiveIntensity={0.4} />
        </mesh>
      )}
    </group>
  );
}

function Editable({ node, selected, onSelect, onMove, onEnter }: { node: SpatialNode; selected: boolean; onSelect: () => void; onMove: (x: number, y: number, z: number) => void; onEnter: () => void }) {
  const child = (
    <group position={[cmToWorld(node.position.x), cmToWorld(node.position.y), cmToWorld(node.position.z)]} rotation={[0, node.rotation.y * Math.PI / 180, 0]}>
      <Visual node={node} selected={selected} onSelect={onSelect} onEnter={onEnter} />
    </group>
  );

  if (!selected) return child;

  return (
    <TransformControls
      mode="translate"
      onObjectChange={(event) => {
        const control = event?.target as { object?: Group } | undefined;
        const object = control?.object;
        if (!object) return;
        onMove(
          snapCm(object.position.x / 0.01),
          Math.max(0, snapCm(object.position.y / 0.01)),
          snapCm(object.position.z / 0.01),
        );
      }}
    >
      {child}
    </TransformControls>
  );
}

function wallMesh(wall: SpatialRoomWall, root: SpatialHabitatScene["root"]) {
  const sx = cmToWorld(wall.start.x - root.dimensions.width / 2);
  const sz = cmToWorld(wall.start.z - root.dimensions.depth / 2);
  const ex = cmToWorld(wall.end.x - root.dimensions.width / 2);
  const ez = cmToWorld(wall.end.z - root.dimensions.depth / 2);
  const length = Math.hypot(ex - sx, ez - sz);
  return {
    position: [(sx + ex) / 2, cmToWorld((wall.height ?? root.dimensions.height) / 2), (sz + ez) / 2] as [number, number, number],
    rotation: [0, -Math.atan2(ez - sz, ex - sx), 0] as [number, number, number],
    size: [length, cmToWorld(wall.height ?? root.dimensions.height), cmToWorld(wall.thickness ?? 8)] as [number, number, number],
  };
}

function SpatialFloor({ root }: { root: SpatialHabitatScene["root"] }) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    const points = root.floorPlan?.length ? root.floorPlan : [
      { x: 0, z: 0 },
      { x: root.dimensions.width, z: 0 },
      { x: root.dimensions.width, z: root.dimensions.depth },
      { x: 0, z: root.dimensions.depth },
    ];
    points.forEach((point, index) => {
      const x = cmToWorld(point.x - root.dimensions.width / 2);
      const y = cmToWorld(point.z - root.dimensions.depth / 2);
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();
    return new ShapeGeometry(shape);
  }, [root.dimensions.depth, root.dimensions.width, root.floorPlan]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial color="#292d30" roughness={1} />
    </mesh>
  );
}
function socketPosition(socket: SpatialRoomSocket, root: SpatialHabitatScene["root"]) {
  return [cmToWorld(socket.x - root.dimensions.width / 2), cmToWorld(socket.height), cmToWorld(socket.z - root.dimensions.depth / 2)] as [number, number, number];
}

function boundaryWallMesh(start: { x: number; z: number }, end: { x: number; z: number }, root: SpatialHabitatScene["root"]) {
  const sx = cmToWorld(start.x - root.dimensions.width / 2);
  const sz = cmToWorld(start.z - root.dimensions.depth / 2);
  const ex = cmToWorld(end.x - root.dimensions.width / 2);
  const ez = cmToWorld(end.z - root.dimensions.depth / 2);
  const length = Math.hypot(ex - sx, ez - sz);
  return {
    position: [(sx + ex) / 2, cmToWorld(root.dimensions.height / 2), (sz + ez) / 2] as [number, number, number],
    rotation: [0, -Math.atan2(ez - sz, ex - sx), 0] as [number, number, number],
    size: [length, cmToWorld(root.dimensions.height), cmToWorld(8)] as [number, number, number],
  };
}
function Content(props: Props) {
  const isRoot = props.containerId === "root";
  const container = isRoot ? props.scene.root : props.scene.nodes.find((node) => node.id === props.containerId);
  const dimensions = container?.dimensions ?? props.scene.root.dimensions;
  const width = cmToWorld(dimensions.width);
  const depth = cmToWorld(dimensions.depth);
  const height = cmToWorld(dimensions.height);

  return (
    <>
      <color attach="background" args={["#0c1013"]} />
      <fog attach="fog" args={["#0c1013", Math.max(width, depth) * 0.75, Math.max(width, depth) * 2.5]} />
      <ambientLight intensity={isRoot ? 0.48 : 0.62} />
      <hemisphereLight intensity={0.72} groundColor="#171a1c" color="#f5ede0" />
      <directionalLight position={[width * 0.7, Math.max(height * 1.7, 2), depth * 0.4]} intensity={1.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />

      {isRoot ? (
        <SpatialFloor root={props.scene.root} />
      ) : (
        <mesh position={[0, -0.02, 0]} receiveShadow>
          <boxGeometry args={[width, 0.04, depth]} />
          <meshStandardMaterial color="#5c4938" roughness={1} />
        </mesh>
      )}

      {isRoot && (
        <group>
          {(props.scene.root.walls ?? []).map((wall) => {
            const mesh = wallMesh(wall, props.scene.root);
            return (
              <mesh key={wall.id} position={mesh.position} rotation={mesh.rotation}>
                <boxGeometry args={mesh.size} />
                <meshStandardMaterial color={wall.colour ?? "#454a4d"} roughness={0.82} />
              </mesh>
            );
          })}
          {(props.scene.root.sockets ?? []).map((socket) => (
            <mesh key={socket.id} position={socketPosition(socket, props.scene.root)}>
              <boxGeometry args={[cmToWorld(7), cmToWorld(10), cmToWorld(2)]} />
              <meshStandardMaterial color="#202427" roughness={0.6} />
            </mesh>
          ))}
          {!props.scene.root.walls?.length && (() => {
            const points = props.scene.root.floorPlan?.length ? props.scene.root.floorPlan : [
              { x: 0, z: 0 },
              { x: props.scene.root.dimensions.width, z: 0 },
              { x: props.scene.root.dimensions.width, z: props.scene.root.dimensions.depth },
              { x: 0, z: props.scene.root.dimensions.depth },
            ];
            return (
              <group>
                {points.map((start, index) => {
                  const end = points[(index + 1) % points.length];
                  const mesh = boundaryWallMesh(start, end, props.scene.root);
                  return (
                    <mesh key={index} position={mesh.position} rotation={mesh.rotation}>
                      <boxGeometry args={mesh.size} />
                      <meshStandardMaterial color="#454a4d" roughness={0.82} />
                    </mesh>
                  );
                })}
              </group>
            );
          })()}
          {props.showCeiling && (
            <mesh position={[0, height, 0]}>
              <boxGeometry args={[width, 0.05, depth]} />
              <meshStandardMaterial color="#373b3d" transparent opacity={0.8} />
            </mesh>
          )}
        </group>
      )}

      {!isRoot && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width, height, depth]} />
          <meshPhysicalMaterial color="#b8cbd0" transparent opacity={0.07} roughness={0.14} />
        </mesh>
      )}

      {childrenOf(props.scene, props.containerId).map((node) => (
        <Editable
          key={node.id}
          node={node}
          selected={node.id === props.selectedId}
          onSelect={() => props.onSelect(node.id)}
          onMove={(x, y, z) => props.onMove(node.id, x, y, z)}
          onEnter={() => props.onEnter(node.id)}
        />
      ))}

      {props.showGrid && (
        <gridHelper
          args={[Math.max(width, depth) * 1.08, Math.max(8, Math.round(Math.max(dimensions.width, dimensions.depth) / 10)), "#596167", "#2b3034"]}
          position={[0, 0.006, 0]}
        />
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={Math.max(Math.min(width, depth) * 0.72, 0.3)}
        maxDistance={Math.max(width, depth, height) * 4.5}
        maxPolarAngle={Math.PI * 0.49}
      />
    </>
  );
}

export default function SpatialHabitatScene3D(props: Props) {
  const dimensions = props.containerId === "root"
    ? props.scene.root.dimensions
    : props.scene.nodes.find((node) => node.id === props.containerId)?.dimensions ?? props.scene.root.dimensions;

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{
        position: [
          Math.max(cmToWorld(dimensions.width) * 1.35, 1.2),
          Math.max(cmToWorld(dimensions.height) * 0.9, 0.7),
          Math.max(cmToWorld(dimensions.depth) * 1.45, 1.4),
        ],
        fov: 44,
        near: 0.01,
        far: 100,
      }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <Content {...props} />
    </Canvas>
  );
}