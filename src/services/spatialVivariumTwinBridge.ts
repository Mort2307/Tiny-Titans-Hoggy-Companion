import type { SpatialHabitatScene, SpatialNode } from "../types/spatialHabitat";
import type { VivariumDigitalTwin, VivariumTwinAsset } from "../types/vivariumTwin";

const SPATIAL_SOURCE = "spatial-habitat";

function categoryForNode(node: SpatialNode): VivariumTwinAsset["category"] {
  if (node.category === "heating" || node.capabilities.heatSource) return "heating";
  if (node.category === "lighting" || node.capabilities.lightSource) return "lighting";
  if (node.category === "monitoring" || node.capabilities.sensor) return "monitoring";
  if (node.category === "water" || node.capabilities.waterSource) return "water";
  if (node.kind === "background" || node.kind === "partition" || node.category === "construction") return "other";
  return "enrichment";
}

function placementForNode(node: SpatialNode): VivariumTwinAsset["placement"] {
  if (node.capabilities.ceilingMountable || node.category === "lighting") return "ceiling";
  if (node.capabilities.wallMountable || node.kind === "background" || node.kind === "partition" || node.kind === "vent") return "wall";
  return "floor";
}

function sourceConfig(node: SpatialNode) {
  return {
    ...(node.config ?? {}),
    source: SPATIAL_SOURCE,
    spatialNodeId: node.id,
  };
}

function spatialAssetForNode(node: SpatialNode, existing?: VivariumTwinAsset): VivariumTwinAsset {
  return {
    id: existing?.id ?? `vt-spatial-${node.id}`,
    assetId: node.assetId ?? node.kind,
    label: node.label,
    category: categoryForNode(node),
    placement: placementForNode(node),
    x: Math.max(-0.46, Math.min(0.46, node.position.x / 100)),
    y: Math.max(0.01, node.position.y / 100),
    z: Math.max(-0.46, Math.min(0.46, node.position.z / 100)),
    rotationX: node.rotation.x * Math.PI / 180,
    rotationY: node.rotation.y * Math.PI / 180,
    rotationZ: node.rotation.z * Math.PI / 180,
    lockedToVivarium: true,
    config: sourceConfig(node),
  };
}

function existingKey(asset: VivariumTwinAsset) {
  const source = asset.config?.source === SPATIAL_SOURCE ? String(asset.config?.spatialNodeId ?? "") : "";
  return source || `${asset.assetId}|${asset.label}`;
}

export function mergeSpatialNodesIntoVivariumTwin(twin: VivariumDigitalTwin, scene: SpatialHabitatScene, vivariumId: string): VivariumDigitalTwin {
  const spatialNodes = scene.nodes.filter((node) => node.parentId === vivariumId && node.visible !== false);
  const spatialIds = new Set(spatialNodes.map((node) => node.id));
  const spatialAssets = spatialNodes.map((node) => spatialAssetForNode(node, twin.assets.find((asset) => asset.config?.source === SPATIAL_SOURCE && asset.config?.spatialNodeId === node.id)));
  const retained = twin.assets.filter((asset) => asset.config?.source !== SPATIAL_SOURCE || spatialIds.has(String(asset.config?.spatialNodeId ?? "")));
  const byKey = new Map(retained.map((asset) => [existingKey(asset), asset]));
  for (const asset of spatialAssets) byKey.set(existingKey(asset), asset);

  const assets = [...byKey.values()];
  const kinds = assets.map((asset) => asset.assetId.toLowerCase());
  const heatingAssets = assets.filter((asset) => asset.category === "heating");
  const monitoringAssets = assets.filter((asset) => asset.category === "monitoring");
  const lightingAssets = assets.filter((asset) => asset.category === "lighting");
  const nextChecklist = {
    ...twin.checklist,
    hideCount: kinds.filter((kind) => kind === "hide").length,
    waterBowlCount: kinds.filter((kind) => kind === "water-bowl").length,
    heatingDeviceCount: heatingAssets.length,
    thermostatPresent: kinds.includes("thermostat") || twin.checklist.thermostatPresent,
    monitoring: [...new Set([
      ...(monitoringAssets.some((asset) => asset.assetId === "thermometer") ? ["thermometer"] : []),
      ...(monitoringAssets.some((asset) => asset.assetId === "hygrometer") ? ["hygrometer"] : []),
      ...(monitoringAssets.some((asset) => asset.assetId === "temp-humidity") ? ["temp-humidity"] : []),
      ...twin.checklist.monitoring,
    ])],
    lightingType: lightingAssets.some((asset) => asset.assetId === "uvb") ? "uvb" : twin.checklist.lightingType,
    enrichmentCount: assets.filter((asset) => asset.category === "enrichment").length,
    plantCount: kinds.filter((kind) => kind === "plant").length,
    corkCount: kinds.filter((kind) => kind === "cork").length,
    branchCount: kinds.filter((kind) => kind === "branch").length,
    cleaningStationPresent: kinds.includes("cleaning-station") || twin.checklist.cleaningStationPresent,
    scalePresent: kinds.includes("scale") || twin.checklist.scalePresent,
  };

  return { ...twin, assets, checklist: nextChecklist, updatedAt: new Date().toISOString() };
}