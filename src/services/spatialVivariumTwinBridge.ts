import type { SpatialHabitatScene, SpatialNode } from "../types/spatialHabitat";
import { getRoomAssetPreset } from "../data/reptileRoomAssetCatalog";
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
    ])] as VivariumDigitalTwin["checklist"]["monitoring"],
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
function degrees(radians: number | undefined) {
  return Number.isFinite(radians) ? (radians as number) * 180 / Math.PI : 0;
}

function spatialNodeFromTwinAsset(asset: VivariumTwinAsset, vivariumId: string, existingId?: string): SpatialNode {
  const preset = getRoomAssetPreset(asset.assetId);
  const width = Math.max(1, preset?.width ?? 20);
  const depth = Math.max(1, preset?.depth ?? 20);
  const height = Math.max(1, preset?.height ?? 10);
  const category = categoryForNodeLikeAsset(asset);
  const kind = preset?.kind ?? "custom";
  return {
    id: existingId ?? `spatial-from-twin-${asset.id}`,
    parentId: vivariumId,
    kind,
    category,
    label: asset.label,
    assetId: asset.assetId,
    dimensions: { width, depth, height },
    position: { x: Number(asset.x || 0) * 100, y: Math.max(0, Number(asset.y || 0) * 100), z: Number(asset.z || 0) * 100 },
    rotation: { x: degrees(asset.rotationX), y: degrees(asset.rotationY), z: degrees(asset.rotationZ) },
    clearance: { front: 0, rear: 0, left: 0, right: 0, top: 0 },
    capabilities: {
      ...(kind === "vivarium" ? { container: true } : {}),
      ...(category === "heating" ? { powerConsumer: true, heatSource: true } : {}),
      ...(category === "lighting" ? { powerConsumer: true, lightSource: true, ceilingMountable: true } : {}),
      ...(category === "monitoring" ? { sensor: true, wallMountable: true } : {}),
      ...(category === "water" ? { waterSource: true } : {}),
      ...(["thermostat", "socket", "smart-plug", "timer"].includes(kind) ? { wallMountable: true } : {}),
    },
    config: { ...(asset.config ?? {}), source: SPATIAL_SOURCE, spatialNodeId: existingId ?? `spatial-from-twin-${asset.id}`, twinAssetId: asset.id },
    visible: true,
  };
}

function categoryForNodeLikeAsset(asset: VivariumTwinAsset): SpatialNode["category"] {
  if (asset.category === "heating") return "heating";
  if (asset.category === "lighting") return "lighting";
  if (asset.category === "monitoring") return "monitoring";
  if (asset.category === "water") return "water";
  if (asset.category === "enrichment") return "enrichment";
  if (asset.category === "substrate") return "construction";
  return "construction";
}

export function applyVivariumTwinToSpatialScene(scene: SpatialHabitatScene, vivariumId: string, twin: VivariumDigitalTwin): SpatialHabitatScene {
  const children = scene.nodes.filter((node) => node.parentId === vivariumId);
  const twinIds = new Set(twin.assets.map((asset) => asset.id));
  const sourceChildren = children.filter((node) => node.config?.source === SPATIAL_SOURCE || node.config?.source === "vivarium-twin");
  const preserved = scene.nodes.filter((node) => node.parentId !== vivariumId || (node.config?.source !== SPATIAL_SOURCE && node.config?.source !== "vivarium-twin"));
  const updated = twin.assets.map((asset) => {
    const existing = children.find((node) => node.config?.spatialNodeId === asset.config?.spatialNodeId && asset.config?.spatialNodeId)
      ?? children.find((node) => node.config?.twinAssetId === asset.id && node.config?.source === "vivarium-twin");
    return spatialNodeFromTwinAsset(asset, vivariumId, existing?.id);
  });
  const retainedNonSourceSpatial = children.filter((node) => node.config?.source !== SPATIAL_SOURCE && node.config?.source !== "vivarium-twin");
  const retainedSource = sourceChildren.filter((node) => {
    const twinAssetId = String(node.config?.twinAssetId ?? "");
    const spatialNodeId = String(node.config?.spatialNodeId ?? "");
    return twinIds.has(twinAssetId) || Boolean(spatialNodeId && twin.assets.some((asset) => asset.config?.source === SPATIAL_SOURCE && String(asset.config?.spatialNodeId ?? "") === spatialNodeId));
  });
  const deduped = new Map<string, SpatialNode>();
  for (const node of [...retainedNonSourceSpatial, ...retainedSource, ...updated]) deduped.set(node.id, node);
  return { ...scene, nodes: [...preserved.filter((node) => node.parentId !== vivariumId), ...deduped.values()], updatedAt: new Date().toISOString() };
}
