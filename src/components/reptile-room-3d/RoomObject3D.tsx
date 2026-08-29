import { Edges } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useState } from "react";
import type {
  ReptileRoomObject,
  ReptileRoomSlot,
  ReptileRoomWorkspace,
} from "../../services/reptileRoomService";
import type { VivariumTelemetry } from "../../types/reptileRoom3D";
import { getRoomAssetPreset } from "../../data/reptileRoomAssetCatalog";
import { cmToWorld } from "./room3DScale";

type RoomObject3DProps = {
  room: ReptileRoomWorkspace;
  object: ReptileRoomObject | ReptileRoomSlot;
  selected: boolean;
  onSelect: (id: string) => void;
  isSlot?: boolean;
  photoUrl?: string;
  telemetry?: VivariumTelemetry;
};

type SlotWithRotation = ReptileRoomSlot & { rotation?: number };

const wood = {
  dark: "#41291d",
  medium: "#6a4328",
  light: "#895c34",
  metal: "#667078",
};

function dimensions(object: ReptileRoomObject | ReptileRoomSlot) {
  if ("width" in object) {
    return { width: object.width, depth: object.depth, height: object.height };
  }
  return {
    width: object.w,
    depth: object.depth ?? object.h,
    height: object.height ?? 40,
  };
}

function rotationFor(object: ReptileRoomObject | ReptileRoomSlot) {
  return "width" in object ? object.rotation ?? 0 : (object as SlotWithRotation).rotation ?? 0;
}

function useWoodTexture(colour: string) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    context.fillStyle = colour;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < 180; index += 1) {
      const y = (index / 180) * canvas.height;
      context.beginPath();
      context.strokeStyle = `rgba(25,15,9,${0.06 + (index % 7) * 0.01})`;
      context.lineWidth = 1 + (index % 4) * 0.4;
      context.moveTo(-30, y);
      context.bezierCurveTo(220, y - 24, 500, y + 20, 1050, y - 10);
      context.stroke();
    }

    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.wrapS = THREE.RepeatWrapping;
    next.wrapT = THREE.RepeatWrapping;
    next.repeat.set(1.7, 1);
    next.anisotropy = 8;
    setTexture(next);

    return () => next.dispose();
  }, [colour]);

  return texture;
}

function WoodMaterial({ colour }: { colour: string }) {
  const texture = useWoodTexture(colour);
  return (
    <meshStandardMaterial
      color={colour}
      map={texture ?? undefined}
      roughness={0.66}
      metalness={0.02}
    />
  );
}

function SimpleFixture({
  kind,
  width,
  depth,
  height,
  selected,
}: {
  kind: string;
  width: number;
  depth: number;
  height: number;
  selected: boolean;
}) {
  const accent = selected ? "#efbd55" : "#8a949a";

  if (["thermostat", "thermometer", "hygrometer", "temp-humidity"].includes(kind)) {
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#1f2528" roughness={0.38} metalness={0.22} />
        </mesh>
        <mesh position={[0, 0, depth / 2 + 0.002]}>
          <planeGeometry args={[width * 0.76, height * 0.62]} />
          <meshBasicMaterial color={kind === "hygrometer" ? "#cfe7db" : "#c9e4ef"} />
        </mesh>
        <mesh position={[0, 0, depth / 2 + 0.008]}>
          <ringGeometry args={[Math.min(width, height) * 0.34, Math.min(width, height) * 0.39, 32]} />
          <meshBasicMaterial color={accent} transparent opacity={0.72} />
        </mesh>
      </group>
    );
  }

  if (["socket", "switched-socket", "smart-plug"].includes(kind)) {
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#f0ece4" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0, depth / 2 + 0.004]}>
          <planeGeometry args={[width * 0.64, height * 0.35]} />
          <meshStandardMaterial color="#1e2327" roughness={0.75} />
        </mesh>
      </group>
    );
  }

  if (kind === "power-strip") {
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#20262a" roughness={0.58} metalness={0.18} />
        </mesh>
        {Array.from({ length: 6 }).map((_, index) => (
          <mesh key={index} position={[(index - 2.5) * width * 0.12, 0, depth / 2 + 0.01]}>
            <circleGeometry args={[Math.min(width, height) * 0.07, 16]} />
            <meshStandardMaterial color="#0d1113" />
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === "timer") {
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#f1eee8" roughness={0.48} />
        </mesh>
        <mesh position={[0, 0, depth / 2 + 0.004]}>
          <planeGeometry args={[width * 0.72, height * 0.38]} />
          <meshStandardMaterial color="#24292d" emissive="#0e161a" emissiveIntensity={0.2} />
        </mesh>
      </group>
    );
  }

  if (["ceiling-light", "led-bar", "uvb", "basking-light", "halogen", "dhp", "che"].includes(kind)) {
    return (
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[Math.max(width, depth) * 0.45, Math.max(width, depth) * 0.52, height, 24]} />
          <meshStandardMaterial color="#31383e" roughness={0.3} metalness={0.68} />
        </mesh>
        <mesh position={[0, -height * 0.46, 0]}>
          <circleGeometry args={[Math.max(width, depth) * 0.33, 32]} />
          <meshStandardMaterial
            color="#fff1c8"
            emissive="#fff1c8"
            emissiveIntensity={selected ? 2.3 : 0.7}
            roughness={0.16}
          />
        </mesh>
        <pointLight distance={1.8} intensity={selected ? 0.35 : 0.08} color="#ffe8b0" />
      </group>
    );
  }

  if (["heat-mat", "rhp"].includes(kind)) {
    return (
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#1e2327" roughness={0.8} metalness={0.08} />
      </mesh>
    );
  }

  if (kind === "hide") {
    return (
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <dodecahedronGeometry args={[Math.max(width, depth) * 0.48, 1]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.96} />
      </mesh>
    );
  }

  if (kind === "water-bowl") {
    return (
      <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[Math.min(width, depth) * 0.34, Math.min(width, depth) * 0.1, 18, 32]} />
        <meshStandardMaterial color="#59636a" roughness={0.34} metalness={0.16} />
      </mesh>
    );
  }

  if (kind === "cork") {
    return (
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[Math.max(width, depth) * 0.28, Math.max(width, depth) * 0.36, height, 14]} />
        <meshStandardMaterial color="#745234" roughness={1} />
      </mesh>
    );
  }

  if (kind === "branch") {
    return (
      <mesh castShadow rotation={[0.18, 0, -0.52]}>
        <cylinderGeometry args={[Math.max(width, depth) * 0.07, Math.max(width, depth) * 0.1, Math.max(width, depth) * 1.2, 10]} />
        <meshStandardMaterial color="#67472e" roughness={1} />
      </mesh>
    );
  }

  if (kind === "plant") {
    return (
      <group>
        <mesh castShadow position={[0, height * 0.15, 0]}>
          <cylinderGeometry args={[width * 0.16, width * 0.22, height * 0.25, 12]} />
          <meshStandardMaterial color="#41332a" roughness={1} />
        </mesh>
        {Array.from({ length: 7 }, (_, index) => {
          const angle = index * 0.9;
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * width * 0.3, height * 0.52 + (index % 2) * 0.05, Math.sin(angle) * depth * 0.3]}
              rotation={[0.3 * Math.sin(angle), angle, 0.55]}
            >
              <planeGeometry args={[width * 0.36, height * 0.22]} />
              <meshStandardMaterial color="#57734d" side={THREE.DoubleSide} roughness={0.95} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (kind === "scale") {
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#252b2f" roughness={0.38} metalness={0.35} />
        </mesh>
        <mesh position={[0, height / 2 + 0.006, 0]}>
          <boxGeometry args={[width * 0.8, 0.008, depth * 0.8]} />
          <meshStandardMaterial color="#e1e4df" roughness={0.46} />
        </mesh>
      </group>
    );
  }

  if (kind === "cleaning-station") {
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <WoodMaterial colour={wood.medium} />
        </mesh>
        <mesh position={[0, height * 0.72, depth / 2 + 0.008]}>
          <boxGeometry args={[width * 0.72, height * 0.1, 0.02]} />
          <meshStandardMaterial color="#d5ddd9" roughness={0.5} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <WoodMaterial colour={wood.dark} />
    </mesh>
  );
}

function makePhotoPlaceholderTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(20,30,34,.42)";
  context.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
  context.strokeStyle = "rgba(190,225,232,.62)";
  context.lineWidth = 5;
  context.setLineDash([16, 12]);
  context.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  context.setLineDash([]);
  context.fillStyle = "rgba(230,245,247,.92)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "800 34px Arial";
  context.fillText("ADD VIVARIUM PHOTO", canvas.width / 2, canvas.height / 2 - 10);
  context.font = "600 20px Arial";
  context.fillStyle = "rgba(210,232,236,.72)";
  context.fillText("Select this glass to personalise it", canvas.width / 2, canvas.height / 2 + 34);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function VivariumPhoto({
  url,
  width,
  height,
  z,
}: {
  url: string;
  width: number;
  height: number;
  z: number;
}) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let active = true;
    setTexture(null);
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");
    loader.load(
      url,
      (loaded) => {
        if (!active) {
          loaded.dispose();
          return;
        }

        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.wrapS = THREE.ClampToEdgeWrapping;
        loaded.wrapT = THREE.ClampToEdgeWrapping;
        loaded.minFilter = THREE.LinearFilter;
        loaded.magFilter = THREE.LinearFilter;
        loaded.anisotropy = 8;
        loaded.needsUpdate = true;
        setTexture(loaded);
      },
      undefined,
      () => {
        if (active) setTexture(null);
      },
    );

    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => () => texture?.dispose(), [texture]);

  if (!texture) return null;

  return (
    <mesh
      position={[0, 0, z]}
      renderOrder={3}
      userData={{ vivariumFaceImage: true }}
    >
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial
        map={texture}
        toneMapped={false}
        depthWrite={false}
        depthTest
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function VivariumModel({
  width,
  depth,
  height,
  selected,
  photoUrl,
  onSelectGlass,
}: {
  width: number;
  depth: number;
  height: number;
  selected: boolean;
  photoUrl?: string;
  onSelectGlass: () => void;
}) {
  const frame = Math.max(Math.min(width, height) * 0.046, 0.026);
  const glassWidth = Math.max(0.01, width - frame * 2);
  const glassHeight = Math.max(0.01, height - frame * 2);
  const frontZ = depth / 2;
  const trim = selected ? "#e2ad4f" : wood.dark;
  const placeholderTexture = useMemo(() => makePhotoPlaceholderTexture(), []);

  useEffect(() => () => placeholderTexture?.dispose(), [placeholderTexture]);

  const stopAndSelectGlass = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelectGlass();
  };

  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0, -depth / 2 + frame / 2]}>
        <boxGeometry args={[width, height, frame]} />
        <WoodMaterial colour={wood.dark} />
      </mesh>
      <mesh castShadow receiveShadow position={[-width / 2 + frame / 2, 0, 0]}>
        <boxGeometry args={[frame, height, depth]} />
        <WoodMaterial colour={wood.dark} />
      </mesh>
      <mesh castShadow receiveShadow position={[width / 2 - frame / 2, 0, 0]}>
        <boxGeometry args={[frame, height, depth]} />
        <WoodMaterial colour={wood.dark} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, height / 2 - frame / 2, 0]}>
        <boxGeometry args={[width, frame, depth]} />
        <WoodMaterial colour={wood.dark} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, -height / 2 + frame / 2, 0]}>
        <boxGeometry args={[width, frame, depth]} />
        <WoodMaterial colour={wood.dark} />
      </mesh>
      <mesh position={[0, 0, frontZ + 0.002]} renderOrder={1}>
        <planeGeometry args={[glassWidth, glassHeight]} />
        <meshPhysicalMaterial
          color="#c6e6eb"
          transparent
          opacity={photoUrl ? 0.045 : 0.16}
          roughness={0.018}
          metalness={0.04}
          transmission={0.1}
          thickness={0.015}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        position={[0, 0, frontZ + 0.008]}
        renderOrder={2}
        onPointerDown={stopAndSelectGlass}
        onClick={stopAndSelectGlass}
        userData={{ vivariumGlassHitArea: true }}
      >
        <planeGeometry args={[glassWidth, glassHeight]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {photoUrl ? (
        <VivariumPhoto
          url={photoUrl}
          width={glassWidth * 0.985}
          height={glassHeight * 0.985}
          z={frontZ + 0.014}
        />
      ) : placeholderTexture ? (
        <mesh
          position={[0, 0, frontZ + 0.012]}
          renderOrder={2}
          userData={{ vivariumPhotoPlaceholder: true }}
          onPointerDown={stopAndSelectGlass}
          onClick={stopAndSelectGlass}
        >
          <planeGeometry args={[glassWidth * 0.985, glassHeight * 0.985]} />
          <meshBasicMaterial
            map={placeholderTexture}
            transparent
            opacity={0.72}
            depthWrite={false}
            depthTest
            side={THREE.DoubleSide}
          />
        </mesh>
      ) : null}
      <mesh position={[0, height / 2 - frame / 2, frontZ + 0.026]}>
        <boxGeometry args={[width, frame, frame * 1.5]} />
        <meshStandardMaterial color={trim} roughness={0.54} />
      </mesh>
      <mesh position={[0, -height / 2 + frame / 2, frontZ + 0.026]}>
        <boxGeometry args={[width, frame, frame * 1.5]} />
        <meshStandardMaterial color={trim} roughness={0.54} />
      </mesh>
      <mesh position={[-width / 2 + frame / 2, 0, frontZ + 0.026]}>
        <boxGeometry args={[frame, height, frame * 1.5]} />
        <meshStandardMaterial color={trim} roughness={0.54} />
      </mesh>
      <mesh position={[width / 2 - frame / 2, 0, frontZ + 0.026]}>
        <boxGeometry args={[frame, height, frame * 1.5]} />
        <meshStandardMaterial color={trim} roughness={0.54} />
      </mesh>
      <mesh position={[width * 0.39, 0, frontZ + 0.05]} castShadow>
        <boxGeometry args={[frame * 0.48, height * 0.2, frame * 0.72]} />
        <meshStandardMaterial color="#515a61" metalness={0.82} roughness={0.2} />
      </mesh>
      <mesh position={[width * 0.39, 0, frontZ + 0.092]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[frame * 0.55, frame * 0.15, 16, 28]} />
        <meshStandardMaterial color="#c9ced2" metalness={0.9} roughness={0.16} />
      </mesh>
    </group>
  );
}

export function RoomObject3D({
  room,
  object,
  selected,
  onSelect,
  isSlot = false,
  photoUrl,
}: RoomObject3DProps) {
  const size = dimensions(object);
  const position = useMemo<[number, number, number]>(
    () => [
      cmToWorld(object.x + size.width / 2) - cmToWorld(room.width ?? 0) / 2,
      cmToWorld((object.z ?? 0) + size.height / 2),
      cmToWorld(object.y + size.depth / 2) - cmToWorld(room.depth ?? 0) / 2,
    ],
    [object.x, object.y, object.z, room.width, room.depth, size.width, size.depth, size.height],
  );
  const rotationY = (rotationFor(object) * Math.PI) / 180;
  const bodyHeight = Math.max(0.01, cmToWorld(size.height));
  const bodyWidth = Math.max(0.01, cmToWorld(size.width));
  const bodyDepth = Math.max(0.01, cmToWorld(size.depth));

  const select = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    onSelect(object.id);
  };

  const kind = isSlot ? "vivarium" : (object as ReptileRoomObject).kind;
  const preset = !isSlot ? getRoomAssetPreset((object as ReptileRoomObject).assetId) : undefined;
  const selectGlass = () => onSelect(object.id);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      userData={{ roomObjectId: object.id, isVivarium: isSlot, magLocked: Boolean(object.stackGroupId) }}
    >
      <mesh onPointerDown={select} onClick={select} visible={false}>
        <boxGeometry args={[bodyWidth * 1.04, bodyHeight * 1.04, bodyDepth * 1.04]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {isSlot ? (
        <VivariumModel
          width={bodyWidth}
          depth={bodyDepth}
          height={bodyHeight}
          selected={selected}
          photoUrl={photoUrl}
          onSelectGlass={selectGlass}
        />
      ) : preset ? (
        <SimpleFixture
          kind={kind}
          width={bodyWidth}
          depth={bodyDepth}
          height={bodyHeight}
          selected={selected}
        />
      ) : (
        <FurnitureModel
          kind={kind}
          width={bodyWidth}
          depth={bodyDepth}
          height={bodyHeight}
          selected={selected}
        />
      )}
      {selected && (
        <>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[bodyWidth * 1.02, bodyHeight * 1.02, bodyDepth * 1.02]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            <Edges color="#e2ad4f" lineWidth={2.5} />
          </mesh>
          <pointLight
            position={[0, bodyHeight * 0.45, 0]}
            intensity={0.28}
            distance={Math.max(bodyWidth, bodyDepth) * 2.5}
            color="#e2ad4f"
          />
        </>
      )}
    </group>
  );
}

function FurnitureModel({
  kind,
  width,
  depth,
  height,
  selected,
}: {
  kind: string;
  width: number;
  depth: number;
  height: number;
  selected: boolean;
}) {
  const colour = kind === "table" || kind === "workbench"
    ? wood.light
    : kind === "cabinet" || kind === "storage-cabinet"
      ? wood.medium
      : wood.dark;
  const texture = useWoodTexture(colour);

  if (kind === "table" || kind === "workbench") {
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, height - 0.05, 0]}>
          <boxGeometry args={[width, 0.1, depth]} />
          <meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.68} />
        </mesh>
        {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
          <mesh
            key={`${x}-${z}`}
            castShadow
            receiveShadow
            position={[x * width * 0.4, height * 0.43, z * depth * 0.4]}
          >
            <boxGeometry args={[0.07, height * 0.86, 0.07]} />
            <meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.72} />
          </mesh>
        )))}
      </group>
    );
  }

  if (kind === "shelving" || kind === "rack") {
    return (
      <group>
        {[0.08, 0.31, 0.54, 0.77, 0.96].map((level) => (
          <mesh key={level} castShadow receiveShadow position={[0, height * level, 0]}>
            <boxGeometry args={[width, 0.045, depth]} />
            <meshStandardMaterial
              color={kind === "rack" ? "#343a3f" : colour}
              roughness={0.76}
              metalness={kind === "rack" ? 0.25 : 0.02}
            />
          </mesh>
        ))}
        <mesh position={[-width * 0.45, height / 2, 0]}>
          <boxGeometry args={[0.045, height, 0.045]} />
          <meshStandardMaterial
            color={selected ? "#e2ad4f" : wood.metal}
            metalness={0.55}
            roughness={0.28}
          />
        </mesh>
        <mesh position={[width * 0.45, height / 2, 0]}>
          <boxGeometry args={[0.045, height, 0.045]} />
          <meshStandardMaterial
            color={selected ? "#e2ad4f" : wood.metal}
            metalness={0.55}
            roughness={0.28}
          />
        </mesh>
      </group>
    );
  }

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.73} metalness={0.02} />
    </mesh>
  );
}
