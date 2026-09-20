import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

const room = read("src/pages/StableReptileRoomBuilder.tsx");
const canonicalRoom = read("src/pages/ReptileRoom.tsx");
const spatialBuilder = read("src/components/reptile-room-3d/SpatialHabitatBuilder.tsx");
const spatialRenderer = read("src/components/reptile-room-3d/SpatialHabitatScene3D.tsx");
const spatialTwinBridge = read("src/services/spatialVivariumTwinBridge.ts");
const spatialService = read("src/services/spatialHabitatService.ts");
const room3d = read("src/components/reptile-room-3d/Room3D.tsx");
const roomShell = read("src/components/reptile-room-3d/RoomEditorShell3D.tsx");
const blueprint = read("src/components/reptile-room-3d/RoomBlueprintPanel.tsx");
const spatial = read("src/services/reptileRoomSpatialService.ts");
const vivariumBuilder = read("src/components/reptile-room-3d/VivariumBuilder3D.tsx");
const firstPerson = read("src/pages/ReptileRoomFirstPerson3D.tsx");
const mySnakes = read("src/pages/MySnakes.tsx");
const router = read("src/routes/AppRouter.tsx");
const roomObject = read("src/components/reptile-room-3d/RoomObject3D.tsx");
const magnet = read("src/services/vivariumMagnetService.ts");

const checks = [
  ["Canonical Reptile Room uses Spatial Habitat Builder", canonicalRoom.includes("SpatialHabitatBuilder")],
  ["Spatial builder remains the canonical room source", spatialBuilder.includes("saveSpatialHabitat") && spatialBuilder.includes("sceneToRoom")],
  ["Canonical room surfaces the blueprint/infrastructure panel", spatialBuilder.includes("RoomBlueprintPanel")],
  ["Canonical room exposes first-person exploration", canonicalRoom.includes("SpatialHabitatBuilder") && router.includes('path="/reptile-room/first-person"')],
  ["Canonical room exposes dedicated vivarium editing", spatialBuilder.includes("Open {node.label}") && router.includes('path="/reptile-room/vivarium/:id/3d"')],
  ["Spatial builder exposes numeric transforms and 5 cm snapping", spatialBuilder.includes("snapCm") && spatialRenderer.includes("TransformControls")],
  ["Legacy placement engine remains available", spatial.includes("snapArchitecturalObject") && spatial.includes("stackZ")],
  ["Spatial child nodes bridge into Vivarium Digital Twin", spatialTwinBridge.includes("mergeSpatialNodesIntoVivariumTwin") && spatialTwinBridge.includes('source: SPATIAL_SOURCE')],
  ["Vivarium Digital Twin edits bridge back into Spatial Habitat", spatialTwinBridge.includes("applyVivariumTwinToSpatialScene")],
  ["Spatial asset placement models wall, floor and ceiling mounts", spatialBuilder.includes("snapNodeToNearestWall") && spatialBuilder.includes("snapNodeToFloor") && spatialBuilder.includes("snapNodeToCeiling")],
  ["Spatial scene supports nested containers", spatialService.includes("parentId") && spatialService.includes("duplicateNode")],
  ["Blueprint editor supports custom floor plans", blueprint.includes('setRoomFloorPlan') && blueprint.includes('+ Wall')],
  ["Blueprint editor supports room power sockets", blueprint.includes('ReptileRoomSocket') && blueprint.includes('+ Socket')],
  ["Blueprint editor reports spatial layout issues", blueprint.includes('validateSpatialLayout')],
  ["Spatial engine provides boundary/collision/clearance validation", spatial.includes('validateSpatialLayout') && spatial.includes('validateObjectPlacement')],
  ["Spatial engine provides wall and power helpers", spatial.includes('snapArchitecturalObject') && spatial.includes('nearestPowerSocket')],
  ["Dedicated vivarium builder auto-loads existing twins", vivariumBuilder.includes('loadVivariumTwin') && vivariumBuilder.includes('useEffect')],
  ["First-person room has edit-room navigation", firstPerson.includes('navigate("/reptile-room")')],
  ["First-person room exposes keeper quick logs", firstPerson.includes('/feeding') && firstPerson.includes('/shedding') && firstPerson.includes('/weights')],
  ["First-person room exposes dedicated vivarium builder", firstPerson.includes('/reptile-room/vivarium/')],
  ["First-person room consumes stored wall geometry", firstPerson.includes("room.walls?.length") && firstPerson.includes("RoomWall")],
  ["My Snakes room Edit button reaches canonical builder", mySnakes.includes('navigate("/reptile-room")')],
  ["My Snakes passes the dedicated vivarium builder callback", mySnakes.includes('onOpenVivariumBuilder={openVivariumBuilder}')],
  ["Router exposes first-person room", router.includes('path="/reptile-room/first-person"')],
  ["Router exposes dedicated vivarium builder", router.includes('path="/reptile-room/vivarium/:id/3d"')],
  ["Room renderer consumes linked/equipment photo and telemetry data", room3d.includes('photoForSlot') && room3d.includes('telemetryForSlot')],
  ["Room renderer contains a full-screen editing surface", room3d.includes('FullscreenTools') && room3d.includes('toggleFullscreen')],
  ["Legacy vivarium magnet service remains available to the 3D subsystem", magnet.includes('magnetiseObjectToVivarium') && magnet.includes('reanchorVivariumChildren')],
  ["3D asset renderer has explicit architectural and enrichment support", roomObject.includes('FurnitureModel') && roomObject.includes('VivariumModel')],
  ["Spatial renderer follows custom floor plans", spatialRenderer.includes("SpatialFloor") && spatialRenderer.includes("floorPlan")],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);
console.log("REPTILE ROOM 3D CONTRACT REPORT");
console.table(checks.map(([check, passed]) => ({ check, status: passed ? "PASS" : "FAIL" })));
if (failures.length) {
  console.error(`3D room contract failures: ${failures.join("; ")}`);
  process.exitCode = 1;
} else {
  console.log(`All ${checks.length} Reptile Room 3D contracts passed.`);
}