import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "src", "components", "reptile-room-3d", "RoomObject3D.tsx");
const source = fs.readFileSync(target, "utf8");

const replacement = String.raw`function SimpleFixture({
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
  const front = Math.max(depth / 2, 0.01);
  const maxSize = Math.max(width, depth, height, 0.01);
  const dark = "#20262a";
  const darker = "#11171a";
  const metal = "#5d666c";
  const screen = "#b9d7c7";
  const warm = "#fff1c8";

  if (kind === "thermostat") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#242a2e" roughness={0.34} metalness={0.32} />
        </mesh>
        <mesh position={[0, height * 0.16, front + 0.004]}>
          <planeGeometry args={[width * 0.72, height * 0.34]} />
          <meshStandardMaterial color={screen} emissive="#9bc9b6" emissiveIntensity={0.2} roughness={0.22} />
        </mesh>
        {[-0.23, 0, 0.23].map((x) => (
          <mesh key={x} position={[x * width, -height * 0.29, front + 0.006]}>
            <circleGeometry args={[Math.min(width, height) * 0.06, 18]} />
            <meshStandardMaterial color={x === 0 ? accent : metal} />
          </mesh>
        ))}
        <mesh position={[0, -height * 0.02, front + 0.01]}>
          <boxGeometry args={[width * 0.06, height * 0.12, 0.008]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={selected ? 0.8 : 0.18} />
        </mesh>
      </group>
    );
  }

  if (["thermometer", "hygrometer", "temp-humidity"].includes(kind)) {
    const hasHumidity = kind !== "thermometer";
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#252c30" roughness={0.4} metalness={0.22} />
        </mesh>
        <mesh position={[0, 0, front + 0.005]}>
          <planeGeometry args={[width * 0.75, height * 0.52]} />
          <meshStandardMaterial color={hasHumidity ? "#cfe7db" : "#c9e4ef"} emissive={hasHumidity ? "#80a993" : "#77a7bb"} emissiveIntensity={0.12} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, front + 0.01]} rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={[Math.min(width, height) * 0.28, Math.min(width, height) * 0.34, 32]} />
          <meshBasicMaterial color={hasHumidity ? "#7fb594" : "#79aabd"} transparent opacity={0.9} />
        </mesh>
        {hasHumidity && kind === "temp-humidity" && (
          <mesh position={[0, -height * 0.31, front + 0.012]}>
            <boxGeometry args={[width * 0.42, height * 0.035, 0.01]} />
            <meshBasicMaterial color="#7c9e8b" />
          </mesh>
        )}
      </group>
    );
  }

  if (["socket", "switched-socket"].includes(kind)) {
    const switched = kind === "switched-socket";
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#e8e4dc" roughness={0.5} />
        </mesh>
        {[-0.22, 0.22].map((x) => (
          <mesh key={x} position={[x * width, 0, front + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[Math.min(width, height) * 0.11, Math.min(width, height) * 0.11, 0.018, 24]} />
            <meshStandardMaterial color="#20272b" roughness={0.55} />
          </mesh>
        ))}
        {switched && (
          <mesh position={[0, height * 0.29, front + 0.006]}>
            <boxGeometry args={[width * 0.13, height * 0.12, 0.02]} />
            <meshStandardMaterial color="#d4d0c8" roughness={0.44} />
          </mesh>
        )}
        <mesh position={[0, -height * 0.36, front + 0.007]}>
          <boxGeometry args={[width * 0.08, height * 0.08, 0.018]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.15} />
        </mesh>
      </group>
    );
  }

  if (kind === "smart-plug") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#ece8df" roughness={0.46} />
        </mesh>
        <mesh position={[0, height * 0.05, front + 0.005]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[Math.min(width, height) * 0.18, Math.min(width, height) * 0.18, 0.02, 24]} />
          <meshStandardMaterial color="#1b2124" roughness={0.5} />
        </mesh>
        <mesh position={[0, -height * 0.31, front + 0.007]}>
          <circleGeometry args={[Math.min(width, height) * 0.055, 16]} />
          <meshStandardMaterial color="#80d48b" emissive="#80d48b" emissiveIntensity={selected ? 1.6 : 0.45} />
        </mesh>
      </group>
    );
  }

  if (kind === "power-strip") {
    const outletXs = Array.from({ length: 6 }, (_, index) => (index - 2.5) * width * 0.145);
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#252b2f" roughness={0.58} metalness={0.2} />
        </mesh>
        {outletXs.map((x) => (
          <mesh key={x} position={[x, 0, front + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[Math.min(width, height) * 0.065, Math.min(width, height) * 0.065, 0.02, 18]} />
            <meshStandardMaterial color="#0d1113" />
          </mesh>
        ))}
        <mesh position={[-width * 0.42, 0, front + 0.012]}>
          <boxGeometry args={[width * 0.045, height * 0.42, 0.02]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={selected ? 0.8 : 0.12} />
        </mesh>
      </group>
    );
  }

  if (kind === "timer") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#eeeae2" roughness={0.48} />
        </mesh>
        <mesh position={[0, height * 0.13, front + 0.006]}>
          <planeGeometry args={[width * 0.7, height * 0.35]} />
          <meshStandardMaterial color="#242c30" emissive="#172328" emissiveIntensity={0.35} roughness={0.28} />
        </mesh>
        {[-0.2, 0, 0.2].map((x) => (
          <mesh key={x} position={[x * width, -height * 0.31, front + 0.008]}>
            <circleGeometry args={[Math.min(width, height) * 0.055, 16]} />
            <meshStandardMaterial color={x === 0 ? accent : "#646c71"} />
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === "heat-mat") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#1b2023" roughness={0.86} />
        </mesh>
        <mesh position={[0, height / 2 + 0.006, 0]}>
          <planeGeometry args={[width * 0.9, depth * 0.9]} />
          <meshStandardMaterial color="#252c30" roughness={0.92} />
        </mesh>
        {[-0.28, 0, 0.28].map((x) => (
          <mesh key={x} position={[x * width, height / 2 + 0.009, 0]}>
            <boxGeometry args={[width * 0.025, 0.004, depth * 0.76]} />
            <meshBasicMaterial color="#343c40" />
          </mesh>
        ))}
        <mesh position={[width * 0.44, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[Math.max(depth * 0.13, 0.015), Math.max(depth * 0.018, 0.003), 10, 18]} />
          <meshStandardMaterial color="#22282c" />
        </mesh>
      </group>
    );
  }

  if (kind === "rhp") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#252b2e" roughness={0.74} />
        </mesh>
        {[-0.3, -0.1, 0.1, 0.3].map((x) => (
          <mesh key={x} position={[x * width, -height * 0.01, depth / 2 + 0.004]}>
            <boxGeometry args={[width * 0.035, height * 0.74, 0.008]} />
            <meshStandardMaterial color="#3d454a" metalness={0.2} roughness={0.52} />
          </mesh>
        ))}
        <mesh position={[0, height * 0.26, depth / 2 + 0.009]}>
          <circleGeometry args={[Math.min(width, height) * 0.055, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={selected ? 1.4 : 0.2} />
        </mesh>
      </group>
    );
  }

  if (["ceiling-light", "led-bar"].includes(kind)) {
    if (kind === "led-bar") {
      return (
        <group>
          <mesh castShadow>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#343c41" roughness={0.32} metalness={0.6} />
          </mesh>
          {Array.from({ length: 12 }, (_, index) => (
            <mesh key={index} position={[(index - 5.5) * width * 0.078, -height * 0.52, 0]}>
              <boxGeometry args={[width * 0.038, 0.012, depth * 0.72]} />
              <meshStandardMaterial color={warm} emissive={warm} emissiveIntensity={selected ? 3 : 1.4} />
            </mesh>
          ))}
        </group>
      );
    }
    return (
      <group>
        <mesh castShadow>
          <cylinderGeometry args={[width * 0.45, width * 0.5, height, 24]} />
          <meshStandardMaterial color="#3a4146" roughness={0.34} metalness={0.62} />
        </mesh>
        <mesh position={[0, -height * 0.52, 0]}>
          <circleGeometry args={[width * 0.36, 32]} />
          <meshStandardMaterial color={warm} emissive={warm} emissiveIntensity={selected ? 3.2 : 1.1} roughness={0.16} />
        </mesh>
        <pointLight distance={2} intensity={selected ? 0.35 : 0.1} color="#ffe8b0" />
      </group>
    );
  }

  if (kind === "uvb") {
    return (
      <group>
        <mesh castShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#20262a" roughness={0.38} metalness={0.62} />
        </mesh>
        <mesh position={[0, -height * 0.56, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[depth * 0.32, depth * 0.32, width * 0.84, 24]} />
          <meshStandardMaterial color="#e8f6e9" emissive="#c5e8d1" emissiveIntensity={selected ? 1.7 : 0.75} roughness={0.18} />
        </mesh>
        {[-0.39, 0.39].map((x) => (
          <mesh key={x} position={[x * width, -height * 0.56, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[depth * 0.39, depth * 0.39, width * 0.06, 24]} />
            <meshStandardMaterial color="#4f575d" metalness={0.7} roughness={0.26} />
          </mesh>
        ))}
      </group>
    );
  }

  if (["basking-light", "halogen", "dhp", "che"].includes(kind)) {
    const isChe = kind === "che";
    const isDhp = kind === "dhp";
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, height * 0.12, 0]}>
          <cylinderGeometry args={[width * 0.46, width * 0.3, height * 0.65, 24]} />
          <meshStandardMaterial color="#31383e" roughness={0.3} metalness={0.64} />
        </mesh>
        {isChe ? (
          <group position={[0, -height * 0.38, 0]}>
            <mesh>
              <cylinderGeometry args={[width * 0.24, width * 0.27, height * 0.22, 18]} />
              <meshStandardMaterial color="#bfc2bd" roughness={0.82} />
            </mesh>
            {[-0.08, 0, 0.08].map((x) => (
              <mesh key={x} position={[x * width * 2.4, -height * 0.14, 0]}>
                <boxGeometry args={[width * 0.018, height * 0.25, depth * 0.34]} />
                <meshStandardMaterial color="#6c7478" metalness={0.5} roughness={0.45} />
              </mesh>
            ))}
          </group>
        ) : (
          <mesh position={[0, -height * 0.4, 0]}>
            {isDhp ? (
              <cylinderGeometry args={[width * 0.25, width * 0.31, height * 0.24, 18]} />
            ) : (
              <sphereGeometry args={[width * 0.24, 20, 14]} />
            )}
            <meshStandardMaterial color={isDhp ? "#5b6062" : warm} emissive={isDhp ? "#d5a66f" : warm} emissiveIntensity={selected ? 2.6 : 0.9} roughness={isDhp ? 0.62 : 0.18} />
          </mesh>
        )}
        <pointLight distance={1.8} intensity={selected ? 0.42 : 0.1} color="#ffe6ac" />
      </group>
    );
  }

  if (kind === "hide") {
    const caveWidth = Math.max(width * 0.78, 0.03);
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, height * 0.12, 0]}>
          <boxGeometry args={[caveWidth, height * 0.3, depth * 0.78]} />
          <meshStandardMaterial color="#5f4c3d" roughness={0.98} />
        </mesh>
        <mesh castShadow receiveShadow position={[0, height * 0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[caveWidth * 0.42, caveWidth * 0.5, depth * 0.82, 20, 1, false, 0, Math.PI]} />
          <meshStandardMaterial color="#6c5847" roughness={0.98} />
        </mesh>
        <mesh position={[0, height * 0.12, depth * 0.41]}>
          <planeGeometry args={[caveWidth * 0.56, height * 0.22]} />
          <meshStandardMaterial color="#151719" roughness={1} />
        </mesh>
      </group>
    );
  }

  if (kind === "water-bowl") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.43, width * 0.35, height * 0.5, 28]} />
          <meshStandardMaterial color="#777f82" roughness={0.34} metalness={0.1} />
        </mesh>
        <mesh position={[0, height * 0.26, 0]}>
          <cylinderGeometry args={[width * 0.34, width * 0.34, height * 0.035, 28]} />
          <meshStandardMaterial color="#87a9bc" roughness={0.12} metalness={0.02} />
        </mesh>
        <mesh position={[0, height * 0.3, 0]}>
          <torusGeometry args={[width * 0.38, width * 0.055, 14, 32]} />
          <meshStandardMaterial color="#8d9497" roughness={0.32} />
        </mesh>
      </group>
    );
  }

  if (kind === "cork") {
    return (
      <group rotation={[0.08, 0.18, -0.12]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[width * 0.27, width * 0.35, Math.max(height, depth) * 0.9, 18]} />
          <meshStandardMaterial color="#765235" roughness={1} />
        </mesh>
        {[-0.28, 0, 0.3].map((ratio) => (
          <mesh key={ratio} position={[0, ratio * height, 0]}>
            <torusGeometry args={[width * (0.28 + Math.abs(ratio) * 0.04), width * 0.025, 10, 22]} />
            <meshStandardMaterial color="#593c28" roughness={1} />
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === "branch") {
    return (
      <group rotation={[0.2, 0.05, -0.48]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[maxSize * 0.06, maxSize * 0.1, maxSize * 0.95, 12]} />
          <meshStandardMaterial color="#65442e" roughness={1} />
        </mesh>
        {[-0.16, 0.18].map((offset, index) => (
          <mesh key={index} position={[offset * maxSize, index ? maxSize * 0.2 : -maxSize * 0.02, 0]} rotation={[0.2, index * 0.5, index ? 0.72 : -0.64]}>
            <cylinderGeometry args={[maxSize * 0.028, maxSize * 0.045, maxSize * 0.42, 10]} />
            <meshStandardMaterial color="#6d4b32" roughness={1} />
          </mesh>
        ))}
      </group>
    );
  }

  if (kind === "plant") {
    return (
      <group>
        <mesh castShadow position={[0, height * 0.14, 0]}>
          <cylinderGeometry args={[width * 0.18, width * 0.24, height * 0.26, 14]} />
          <meshStandardMaterial color="#3f3024" roughness={1} />
        </mesh>
        {Array.from({ length: 9 }, (_, index) => {
          const angle = index * 0.72;
          const leafHeight = height * (0.42 + (index % 3) * 0.035);
          return (
            <mesh
              key={index}
              position={[Math.cos(angle) * width * 0.3, leafHeight, Math.sin(angle) * depth * 0.24]}
              rotation={[0.28 * Math.sin(angle), angle, 0.56]}
            >
              <planeGeometry args={[width * 0.42, height * 0.2]} />
              <meshStandardMaterial color={index % 2 ? "#527447" : "#5f824e"} side={THREE.DoubleSide} roughness={0.92} />
            </mesh>
          );
        })}
      </group>
    );
  }

  if (kind === "scale") {
    return (
      <group>
        <mesh castShadow receiveShadow position={[0, height * 0.18, 0]}>
          <boxGeometry args={[width, height * 0.38, depth]} />
          <meshStandardMaterial color="#272d31" roughness={0.4} metalness={0.32} />
        </mesh>
        <mesh position={[0, height * 0.4, 0]}>
          <boxGeometry args={[width * 0.82, height * 0.07, depth * 0.82]} />
          <meshStandardMaterial color="#dfe3df" roughness={0.42} />
        </mesh>
        <mesh position={[0, height * 0.55, depth * 0.22]}>
          <boxGeometry args={[width * 0.42, height * 0.05, depth * 0.05]} />
          <meshStandardMaterial color="#0e1416" roughness={0.62} />
        </mesh>
        <mesh position={[0, height * 0.55, depth * 0.225]}>
          <planeGeometry args={[width * 0.34, height * 0.035]} />
          <meshStandardMaterial color="#9bc5b1" emissive="#86ac98" emissiveIntensity={0.18} />
        </mesh>
      </group>
    );
  }

  if (kind === "cleaning-station") {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#6a4328" roughness={0.7} />
        </mesh>
        <mesh position={[width * 0.16, height * 0.46, depth * 0.34]}>
          <cylinderGeometry args={[width * 0.075, width * 0.085, height * 0.26, 14]} />
          <meshStandardMaterial color="#d8e2df" roughness={0.35} />
        </mesh>
        <mesh position={[width * 0.16, height * 0.62, depth * 0.34]}>
          <cylinderGeometry args={[width * 0.04, width * 0.055, height * 0.08, 12]} />
          <meshStandardMaterial color="#8d9b98" roughness={0.28} />
        </mesh>
        <mesh position={[-width * 0.22, height * 0.48, depth * 0.34]}>
          <cylinderGeometry args={[width * 0.095, width * 0.11, height * 0.22, 16]} />
          <meshStandardMaterial color="#efe9dc" roughness={0.48} />
        </mesh>
        <mesh position={[-width * 0.22, height * 0.62, depth * 0.34]}>
          <torusGeometry args={[width * 0.08, width * 0.018, 10, 20]} />
          <meshStandardMaterial color="#c9c3b6" roughness={0.62} />
        </mesh>
      </group>
    );
  }

  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial color={dark} roughness={0.72} metalness={0.08} />
    </mesh>
  );
}`;

const pattern = /function SimpleFixture\([\s\S]*?\n}\n\nfunction makePhotoPlaceholderTexture\(\)/;
if (!pattern.test(source)) {
  throw new Error("Could not locate the SimpleFixture renderer boundary in RoomObject3D.tsx.");
}

const next = source.replace(pattern, `${replacement}\n\nfunction makePhotoPlaceholderTexture()`);
fs.writeFileSync(target, next, "utf8");
console.log(`Keeper toolkit renderer upgraded: ${target}`);
