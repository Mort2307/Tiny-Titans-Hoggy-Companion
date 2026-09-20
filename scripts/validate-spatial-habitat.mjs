  if (!builder.includes('setMode("vivarium")') || !builder.includes('setMode("room")')) fail.push("Nested room/vivarium navigation contract missing.");
  if (!builder.includes('blockingIssues')) fail.push("Spatial save must block blocking layout errors.");
  if (!builder.includes('blueprintRoom')) fail.push("Room blueprint must consume the current spatial projection.");
  if (!builder.includes('rooms.length > 1')) fail.push("Multiple saved rooms must be selectable.");

  const featureMatrix = {
    spatialRoom: {
      exists: Boolean(builder && renderer && persistence),
      connected: builder.includes("SpatialHabitatScene3D") && builder.includes("RoomBlueprintPanel"),
      persisted: builder.includes("saveSpatialHabitat") && builder.includes("loadSpatialHabitat"),
      mobile: builder.includes("spatial-mobile-actions") && builder.includes("setLibraryOpen(true)"),
      desktop: builder.includes("spatial-layout") && builder.includes("spatial-library"),
      tested: runtimeTest.includes("Spatial Habitat runtime tests passed."),
    },
    blueprint: {
      exists: builder.includes("RoomBlueprintPanel") && builder.includes("const blueprintRoom"),
      connected: builder.includes("handleBlueprintChange") && builder.includes("syncSceneRoomInfrastructure"),
      persisted: builder.includes("saveSpatialHabitat") && builder.includes("sceneToRoom"),
      mobile: builder.includes("setBlueprintOpen(true)") && builder.includes("spatial-sheet"),
      desktop: builder.includes("spatial-blueprint") && builder.includes("RoomBlueprintPanel"),
      tested: runtimeTest.includes("floorPlan") && runtimeTest.includes("outside-floor-plan"),
    },
    firstPerson: {
      exists: firstPerson.includes("ReptileRoomFirstPerson3D"),
      connected: firstPerson.includes("loadSpatialHabitat") && firstPerson.includes("mergeStoredSpatialSceneWithRoom"),
      persisted: firstPerson.includes("loadSpatialHabitat") && firstPerson.includes("sceneToRoom"),
      mobile: firstPersonCss.includes("@media(max-width:700px)") && firstPersonCss.includes("@media(max-width:430px)"),
      desktop: firstPersonCss.includes(".rrfp-header-actions") && firstPersonCss.includes(".rrfp-viewport"),
      tested: runtimeTest.includes("snapNodeToNearestWall"),
    },
    vivarium3D: {
      exists: vivariumBuilder.includes("VivariumBuilder3D"),
      connected: vivariumBuilder.includes("loadVivariumTwin") && twinBridge.includes("applyVivariumTwinToSpatialScene"),
      persisted: vivariumBuilder.includes("saveVivariumTwin") && twinBridge.includes("mergeSpatialNodesIntoVivariumTwin"),
      mobile: vivariumCss.includes("@media (max-width:1000px)") && vivariumCss.includes("@media (max-width:600px)"),
      desktop: vivariumCss.includes("grid-template-columns:minmax(0,1.55fr) minmax(360px,.75fr)"),
      tested: runtimeTest.includes("applyVivariumTwinToSpatialScene") && runtimeTest.includes("mergeSpatialNodesIntoVivariumTwin"),
    },
    equipment: {
      exists: builder.includes("REPTILE_ROOM_ASSETS") && renderer.includes("heat-mat") && renderer.includes("thermometer"),
      connected: service.includes("connectNodeToNearestPowerSocket") && builder.includes("connectNodeToNearestPowerSocket"),
      persisted: builder.includes("saveSpatialHabitat") && twinBridge.includes("source: SPATIAL_SOURCE"),
      mobile: builder.includes("spatial-sheet-content") && builder.includes("groups.map"),
      desktop: builder.includes("spatial-library") && builder.includes("groups.map"),
      tested: runtimeTest.includes("power socket connection failed") && runtimeTest.includes("per-socket power validation"),
    },
    husbandryIntelligence: {
      exists: vivariumBuilder.includes("evaluateVivariumTwin") && twinBridge.includes("mergeSpatialNodesIntoVivariumTwin"),
      connected: twinBridge.includes("inferredHeatingType") && twinBridge.includes("inferredLightingType"),
      persisted: vivariumBuilder.includes("saveVivariumTwin") && builder.includes("saveVivariumTwin"),
      mobile: vivariumCss.includes("@media (max-width:600px)") && vivariumBuilder.includes("tab === \"intelligence\""),
      desktop: vivariumCss.includes(".vtb-score") && vivariumBuilder.includes("Linked intelligence"),
      tested: runtimeTest.includes("heating type was not derived") && runtimeTest.includes("monitoring was not derived"),
    },
  };
  const matrixFailures = Object.entries(featureMatrix).flatMap(([feature, checks]) => Object.entries(checks).filter(([, passed]) => !passed).map(([dimension]) => feature + ":" + dimension));
  if (matrixFailures.length) fail.push("Spatial feature matrix failures: " + matrixFailures.join(", "));
  console.log("SPATIAL FEATURE MATRIX");
  console.table(Object.entries(featureMatrix).map(([feature, checks]) => ({ Feature: feature, Exists: checks.exists ? "✅" : "🟡", Connected: checks.connected ? "✅" : "🟡", Persisted: checks.persisted ? "✅" : "🟡", Mobile: checks.mobile ? "✅" : "🟡", Desktop: checks.desktop ? "✅" : "🟡", Tested: checks.tested ? "✅" : "🟡" })));
}

if (fail.length) {
  console.error("Spatial habitat validation failed:");
  for (const item of fail) console.error(" - " + item);
  process.exit(1);
}

console.log("Spatial habitat validation passed: required files and architectural contracts are present.");