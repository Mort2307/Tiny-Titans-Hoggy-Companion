import assert from "node:assert/strict";
import {
  ROOT_CONTAINER_ID,
  createSpatialNode,
  duplicateNode,
  findNode,
  snapNodeToCeiling,
  snapNodeToFloor,
  snapNodeToNearestWall,
  validateSpatialScene,
} from "../src/services/spatialHabitatService.ts";
import {
  applyVivariumTwinToSpatialScene,
  mergeSpatialNodesIntoVivariumTwin,
} from "../src/services/spatialVivariumTwinBridge.ts";
import { DEFAULT_VIVARIUM_TWIN } from "../src/types/vivariumTwin.ts";
import type { SpatialAssetPreset, SpatialHabitatScene } from "../src/types/spatialHabitat.ts";

const dimensions = { width: 400, depth: 300, height: 240 };
const roomPreset: SpatialAssetPreset = {
  assetId: "runtime-test-vivarium",
  kind: "vivarium",
  category: "enclosure",
  label: "Runtime Vivarium",
  width: 120,
  depth: 60,
  height: 60,
  capabilities: { container: true },
};
const lampPreset: SpatialAssetPreset = {
  assetId: "runtime-test-uvb",
  kind: "uvb",
  category: "lighting",
  label: "Runtime UVB",
  width: 90,
  depth: 12,
  height: 5,
  capabilities: { lightSource: true, uvbSource: true, powerConsumer: true, ceilingMountable: true },
};
const sensorPreset: SpatialAssetPreset = {
  assetId: "runtime-test-sensor",
  kind: "thermometer",
  category: "monitoring",
  label: "Runtime Thermometer",
  width: 6,
  depth: 3,
  height: 8,
  capabilities: { sensor: true, wallMountable: true },
};

let scene: SpatialHabitatScene = {
  schemaVersion: 1,
  units: "metric",
  root: {
    id: "root",
    kind: "room",
    label: "Runtime Test Room",
    dimensions,
    floorPlan: [
      { x: 0, z: 0 },
      { x: 400, z: 0 },
      { x: 400, z: 300 },
      { x: 0, z: 300 },
    ],
    walls: [],
    sockets: [],
  },
  nodes: [],
  updatedAt: new Date().toISOString(),
};

const vivarium = createSpatialNode(roomPreset, ROOT_CONTAINER_ID, dimensions, 0);
scene = { ...scene, nodes: [...scene.nodes, vivarium] };
assert.equal(findNode(scene, vivarium.id)?.kind, "vivarium", "vivarium creation failed");

const lamp = createSpatialNode(lampPreset, ROOT_CONTAINER_ID, dimensions, 1);
scene = { ...scene, nodes: [...scene.nodes, lamp] };
scene = snapNodeToCeiling(scene, lamp.id);
assert.equal(findNode(scene, lamp.id)?.position.y, dimensions.height - lamp.dimensions.height, "ceiling snap failed");

scene = snapNodeToFloor(scene, lamp.id);
assert.equal(findNode(scene, lamp.id)?.position.y, 0, "floor snap failed");

const sensor = createSpatialNode(sensorPreset, ROOT_CONTAINER_ID, dimensions, 2);
scene = { ...scene, nodes: [...scene.nodes, sensor] };
scene = snapNodeToNearestWall(scene, sensor.id);
const snappedSensor = findNode(scene, sensor.id);
assert.ok(snappedSensor?.capabilities.wallMountable, "wall-mountable sensor lost capability");
assert.ok(
  Math.abs(Math.abs(snappedSensor!.position.x) - dimensions.width / 2) < 4
  || Math.abs(Math.abs(snappedSensor!.position.z) - dimensions.depth / 2) < 4,
  "wall snap did not place the sensor on a room wall",
);

const duplicated = duplicateNode(scene, vivarium.id);
const duplicatedRoot = duplicated.nodes.filter((node) => node.label === "Runtime Vivarium Copy");
assert.equal(duplicatedRoot.length, 1, "nested vivarium duplication failed");

const invalid = {
  ...scene,
  nodes: scene.nodes.concat({
    ...sensor,
    id: "outside-floor-plan",
    label: "Outside Floor Plan",
    position: { x: 190, y: 0, z: 145 },
    dimensions: { width: 40, depth: 40, height: 20 },
  }),
};
const invalidErrors = validateSpatialScene(invalid).filter((issue) => issue.severity === "error");
assert.ok(invalidErrors.some((issue) => issue.code === "outside-container"), "floor-plan/boundary validation did not reject an out-of-bounds node");

const twin = {
  ...DEFAULT_VIVARIUM_TWIN,
  assets: [],
};
const nestedSensor = {
  ...snappedSensor!,
  parentId: vivarium.id,
  config: { ...snappedSensor!.config, source: "spatial-habitat", spatialNodeId: snappedSensor!.id },
};
const spatialWithChild = {
  ...scene,
  nodes: scene.nodes.concat(nestedSensor),
};
const mergedTwin = mergeSpatialNodesIntoVivariumTwin(twin, spatialWithChild, vivarium.id);
assert.equal(mergedTwin.assets.length, 1, "spatial -> twin bridge did not import the nested asset");
assert.equal(mergedTwin.assets[0].config?.source, "spatial-habitat", "spatial provenance marker missing");

const reverseScene = applyVivariumTwinToSpatialScene(spatialWithChild, vivarium.id, mergedTwin);
assert.ok(
  reverseScene.nodes.some((node) => node.parentId === vivarium.id && node.config?.twinAssetId === mergedTwin.assets[0].id),
  "twin -> spatial bridge did not recreate the nested asset",
);

console.log("Spatial Habitat runtime tests passed.");
