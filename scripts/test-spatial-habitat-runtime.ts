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
const heaterPreset: SpatialAssetPreset = {
  assetId: "runtime-test-heat",
  kind: "che",
  category: "heating",
  label: "Runtime CHE",
  width: 20,
  depth: 20,
  height: 18,
  capabilities: { heatSource: true, powerConsumer: true },
  config: { wattage: 20 },
};
const heater = createSpatialNode(heaterPreset, vivarium.id, vivarium.dimensions, 0);
const heaterScene = connectNodeToNearestPowerSocket({ ...scene, nodes: [...scene.nodes, heater] }, heater.id);
const spatialWithChild = {
  ...heaterScene,
  nodes: heaterScene.nodes.concat(nestedSensor),
};
const mergedTwin = mergeSpatialNodesIntoVivariumTwin(twin, spatialWithChild, vivarium.id);
assert.equal(mergedTwin.assets.length, 1, "spatial -> twin bridge did not import the nested asset");
assert.equal(mergedTwin.assets[0].config?.source, "spatial-habitat", "spatial provenance marker missing");
assert.ok(mergedTwin.checklist.heatingType === "che", "heating type was not derived from spatial equipment");
assert.equal(mergedTwin.checklist.heatingDeviceCount, 1, "heating count was not derived from spatial equipment");
assert.equal(mergedTwin.checklist.monitoring.includes("thermometer"), true, "monitoring was not derived from spatial equipment");

const overloadedScene = { ...heaterScene, nodes: heaterScene.nodes.map((node) => node.id === heater.id ? { ...node, config: { ...node.config, wattage: 70 } } : node) };
const powerErrors = validateSpatialScene(overloadedScene).filter((issue) => issue.code === "power-load" && issue.severity === "error");
assert.ok(powerErrors.length >= 1, "per-socket power validation did not detect an overloaded outlet");

const reverseScene = applyVivariumTwinToSpatialScene(spatialWithChild, vivarium.id, mergedTwin);
assert.ok(
  reverseScene.nodes.some((node) => node.parentId === vivarium.id && node.config?.twinAssetId === mergedTwin.assets[0].id),
  "twin -> spatial bridge did not recreate the nested asset",
);

console.log("Spatial Habitat runtime tests passed.");