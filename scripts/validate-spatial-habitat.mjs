import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  "src/types/spatialHabitat.ts",
  "src/services/spatialHabitatService.ts",
  "src/services/spatialHabitatPersistenceService.ts",
  "src/services/spatialVivariumTwinBridge.ts",
  "src/components/reptile-room-3d/SpatialHabitatScene3D.tsx",
  "src/components/reptile-room-3d/SpatialHabitatBuilder.tsx",
  "src/components/reptile-room-3d/room3DScale.ts",
  "src/styles/spatial-habitat-builder.css",
];

const fail = [];
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) fail.push("Missing " + file);
}

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
if (!fail.length) {
  const typeText = read("src/types/spatialHabitat.ts");
  const service = read("src/services/spatialHabitatService.ts");
  const builder = read("src/components/reptile-room-3d/SpatialHabitatBuilder.tsx");
  const renderer = read("src/components/reptile-room-3d/SpatialHabitatScene3D.tsx");
  const persistence = read("src/services/spatialHabitatPersistenceService.ts");
  const twinBridge = read("src/services/spatialVivariumTwinBridge.ts");
  const scale = read("src/components/reptile-room-3d/room3DScale.ts");

  const contracts = [
    [typeText, 'SpatialHabitatScene', "spatial scene type"],
    [service, 'export function roomToSpatialScene', "room -> spatial conversion"],
    [service, 'export function sceneToRoom', "spatial -> legacy compatibility conversion"],
    [service, 'export function validateSpatialScene', "spatial validation"],
    [service, 'export function syncSceneRoomInfrastructure', "room infrastructure sync"],
    [service, 'export function mergeStoredSpatialSceneWithRoom', "stored scene reconciliation"],
    [service, 'floorPlan:', "floor-plan preservation"],
    [service, 'walls:', "wall geometry preservation"],
    [service, 'sockets:', "power socket preservation"],
    [service, 'export function duplicateNode', "nested duplication"],
    [service, 'linkedSnakeId', "snake linkage"],
    [builder, 'saveSpatialHabitat', "spatial persistence"],
    [builder, 'localStorage', "local draft recovery"],
    [builder, 'Undo', "undo control"],
    [builder, 'STRUCTURAL_ROOM_ASSETS', "room construction library"],
    [builder, 'STRUCTURAL_VIVARIUM_ASSETS', "vivarium construction library"],
    [renderer, 'TransformControls', "3D transform controls"],
    [renderer, 'OrbitControls', "3D camera controls"],
    [renderer, 'SpatialRoomWall', "typed room-wall rendering"],
    [renderer, 'SpatialRoomSocket', "typed socket rendering"],
    [persistence, 'spatialHabitats', "dedicated spatial collection"],
    [twinBridge, 'mergeSpatialNodesIntoVivariumTwin', "spatial -> twin synchronization"],
    [twinBridge, 'applyVivariumTwinToSpatialScene', "twin -> spatial synchronization"],
    [builder, 'beforeunload', "unsaved-change protection"],
    [scale, 'CM_TO_WORLD = 0.01', "centimetre-to-metre scale"],
  ];
  for (const [text, needle, label] of contracts) {
    if (!text.includes(needle)) fail.push("Missing contract: " + label);
  }

  const roomType = typeText.match(/export type SpatialHabitatScene[\s\S]*?\n};/);
  if (!roomType?.[0].includes('schemaVersion: 1')) fail.push("Spatial scene schema version contract missing.");

  if (!service.includes('sceneNodeIds.has(object.id)')) fail.push("Legacy object projection must remove deleted spatial objects.");

  if (!builder.includes('setMode("vivarium")') || !builder.includes('setMode("room")')) fail.push("Nested room/vivarium navigation contract missing.");
  if (!builder.includes('blockingIssues')) fail.push("Spatial save must block blocking layout errors.");
  if (!builder.includes('blueprintRoom')) fail.push("Room blueprint must consume the current spatial projection.");
  if (!builder.includes('rooms.length > 1')) fail.push("Multiple saved rooms must be selectable.");
}

if (fail.length) {
  console.error("Spatial habitat validation failed:");
  for (const item of fail) console.error(" - " + item);
  process.exit(1);
}

console.log("Spatial habitat validation passed: required files and architectural contracts are present.");