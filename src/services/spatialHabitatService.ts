import type { ReptileRoomObject, ReptileRoomSlot, ReptileRoomWorkspace } from "./reptileRoomService";
import type { SpatialAssetPreset, SpatialDimensionsCm, SpatialHabitatScene, SpatialNode, SpatialNodeCapabilities, SpatialNodeKind, SpatialValidationIssue } from "../types/spatialHabitat";

export const SPATIAL_SNAP_CM = 5;
export const ROOT_CONTAINER_ID = "root";
const EPS = 0.01;
const DEFAULT_CLEARANCE = { front: 30, rear: 5, left: 5, right: 5, top: 10 };

export function spatialId(prefix = "node") {
  const uuid = globalThis.crypto?.randomUUID?.();
  return uuid ? prefix + "-" + uuid : prefix + "-" + Date.now().toString(36);
}
export function snapCm(value: number) {
  return Number.isFinite(value) ? Math.round(value / SPATIAL_SNAP_CM) * SPATIAL_SNAP_CM : 0;
}
export function clamp(value: number, min: number, max: number) {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}
export function findNode(scene: SpatialHabitatScene, id: string | null) {
  return id ? scene.nodes.find((n) => n.id === id) ?? null : null;
}
export function childrenOf(scene: SpatialHabitatScene, parentId: string) {
  return scene.nodes.filter((n) => n.parentId === parentId && n.visible !== false);
}
export function parentDimensions(scene: SpatialHabitatScene, parentId: string): SpatialDimensionsCm {
  return parentId === ROOT_CONTAINER_ID ? scene.root.dimensions : findNode(scene, parentId)?.dimensions ?? scene.root.dimensions;
}

function category(kind: string): SpatialNode["category"] {
  if (kind === "vivarium") return "enclosure";
  if (["rack", "shelving", "shelf", "storage-cabinet", "cabinet"].includes(kind)) return "storage";
  if (["workbench", "equipment-station", "quarantine-area", "table", "chair"].includes(kind)) return "keeper";
  if (["che", "halogen", "dhp", "rhp", "heat-mat", "thermostat", "basking-light"].includes(kind)) return "heating";
  if (["ceiling-light", "led-bar", "uvb", "lamp"].includes(kind)) return "lighting";
  if (["socket", "switched-socket", "power-strip", "timer", "smart-plug"].includes(kind)) return "power";
  if (["thermometer", "hygrometer", "temp-humidity"].includes(kind)) return "monitoring";
  if (["hide", "cork", "branch", "plant", "cleaning-station", "scale"].includes(kind)) return "enrichment";
  if (kind === "water-bowl") return "water";
  return "construction";
}

function caps(object: ReptileRoomObject): SpatialNodeCapabilities {
  const role = object.intelligenceRole ?? "";
  return {
    powerConsumer: Boolean(object.config?.wattage) || ["heating", "lighting"].includes(role),
    heatSource: role === "heating",
    lightSource: role === "lighting",
    uvbSource: object.kind === "uvb",
    sensor: role === "sensor",
    waterSource: role === "water",
    wallMountable: ["socket", "switched-socket", "thermostat", "thermometer", "hygrometer", "temp-humidity", "timer", "smart-plug"].includes(object.kind),
  };
}

export function roomToSpatialScene(room: ReptileRoomWorkspace): SpatialHabitatScene {
  const width = Math.max(100, room.width ?? 360);
  const depth = Math.max(100, room.depth ?? 300);
  const height = Math.max(100, room.height ?? 240);
  const nodes: SpatialNode[] = [];

  for (const slot of room.slots ?? []) {
    const w = Math.max(1, slot.w);
    const d = Math.max(1, slot.depth ?? slot.h);
    const h = Math.max(1, slot.height ?? 45);
    nodes.push({
      id: slot.id,
      parentId: ROOT_CONTAINER_ID,
      kind: "vivarium",
      category: "enclosure",
      label: slot.label || "Vivarium",
      assetId: slot.assetId || "vivarium-front-opening",
      dimensions: { width: w, depth: d, height: h },
      position: {
        x: slot.x + w / 2 - width / 2,
        y: Math.max(0, slot.z ?? 0),
        z: slot.y + d / 2 - depth / 2,
      },
      rotation: {
        x: 0,
        y: Number((slot as ReptileRoomSlot & { rotation?: number }).rotation) || 0,
        z: 0,
      },
      clearance: { ...DEFAULT_CLEARANCE, ...(slot.clearance ?? {}) },
      capabilities: { container: true },
      config: {
        ...(slot.config ?? {}),
        linkedSlotId: slot.id,
        linkedSnakeId: slot.snakeId,
      },
      notes: slot.notes,
      visible: true,
    });
  }

  for (const object of room.objects ?? []) {
    const w = Math.max(1, object.width);
    const d = Math.max(1, object.depth);
    const parentId =
      object.parentAssetId && (room.slots ?? []).some((slot) => slot.id === object.parentAssetId)
        ? object.parentAssetId
        : ROOT_CONTAINER_ID;

    nodes.push({
      id: object.id,
      parentId,
      kind: object.kind as SpatialNodeKind,
      category: category(object.kind),
      label: object.label || "Asset",
      assetId: object.assetId,
      dimensions: { width: w, depth: d, height: Math.max(1, object.height) },
      position: {
        x: object.x + w / 2 - width / 2,
        y: Math.max(0, object.z),
        z: object.y + d / 2 - depth / 2,
      },
      rotation: { x: 0, y: Number(object.rotation) || 0, z: 0 },
      clearance: { ...DEFAULT_CLEARANCE, ...(object.clearance ?? {}) },
      capabilities: caps(object),
      config: { ...(object.config ?? {}) },
      notes: object.notes,
      visible: true,
    });
  }

  return {
    schemaVersion: 1,
    units: room.unit === "imperial" ? "imperial" : "metric",
    root: {
      id: ROOT_CONTAINER_ID,
      kind: "room",
      label: room.name || "Reptile Room",
      dimensions: { width, depth, height },
    },
    nodes,
    updatedAt: room.updatedAt || new Date().toISOString(),
  };
}

export function normalizeScene(scene: SpatialHabitatScene): SpatialHabitatScene {
  const dimensions = scene.root?.dimensions ?? { width: 360, depth: 300, height: 240 };
  return {
    schemaVersion: 1,
    units: scene.units === "imperial" ? "imperial" : "metric",
    root: {
      id: ROOT_CONTAINER_ID,
      kind: "room",
      label: scene.root?.label || "Reptile Room",
      dimensions,
    },
    nodes: Array.isArray(scene.nodes)
      ? scene.nodes.map((node) => ({
          ...node,
          dimensions: {
            width: Math.max(1, Number(node.dimensions?.width) || 1),
            depth: Math.max(1, Number(node.dimensions?.depth) || 1),
            height: Math.max(1, Number(node.dimensions?.height) || 1),
          },
          position: {
            x: Number(node.position?.x) || 0,
            y: Math.max(0, Number(node.position?.y) || 0),
            z: Number(node.position?.z) || 0,
          },
          rotation: {
            x: Number(node.rotation?.x) || 0,
            y: Number(node.rotation?.y) || 0,
            z: Number(node.rotation?.z) || 0,
          },
          clearance: { ...DEFAULT_CLEARANCE, ...(node.clearance ?? {}) },
          capabilities: node.capabilities ?? {},
          config: node.config ?? {},
          visible: node.visible !== false,
        }))
      : [],
    updatedAt: scene.updatedAt || new Date().toISOString(),
  };
}

export function createSpatialNode(
  preset: SpatialAssetPreset,
  parentId: string,
  dimensions: SpatialDimensionsCm,
  index: number,
): SpatialNode {
  const w = Math.min(preset.width, dimensions.width);
  const d = Math.min(preset.depth, dimensions.depth);
  const h = Math.min(preset.height, dimensions.height);
  const stepX = Math.max(40, w + SPATIAL_SNAP_CM);
  const stepZ = Math.max(40, d + SPATIAL_SNAP_CM);
  const cols = Math.max(1, Math.floor(dimensions.width / stepX));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const x = clamp(
    snapCm((col + 0.5) * stepX - dimensions.width / 2),
    -dimensions.width / 2 + w / 2,
    dimensions.width / 2 - w / 2,
  );
  const z = clamp(
    snapCm((row + 0.5) * stepZ - dimensions.depth / 2),
    -dimensions.depth / 2 + d / 2,
    dimensions.depth / 2 - d / 2,
  );
  const y = preset.capabilities?.ceilingMountable ? Math.max(0, dimensions.height - h) : 0;
  return {
    id: spatialId(),
    parentId,
    kind: preset.kind,
    category: preset.category,
    label: preset.label,
    assetId: preset.assetId,
    dimensions: { width: w, depth: d, height: h },
    position: { x, y, z },
    rotation: { x: 0, y: 0, z: 0 },
    clearance: { ...DEFAULT_CLEARANCE },
    capabilities: { ...(preset.capabilities ?? {}) },
    config: { ...(preset.config ?? {}) },
    visible: true,
  };
}

export function updateNode(scene: SpatialHabitatScene, id: string, patch: Partial<SpatialNode>): SpatialHabitatScene {
  return {
    ...scene,
    nodes: scene.nodes.map((node) =>
      node.id !== id
        ? node
        : {
            ...node,
            ...patch,
            dimensions: patch.dimensions ? { ...node.dimensions, ...patch.dimensions } : node.dimensions,
            position: patch.position ? { ...node.position, ...patch.position } : node.position,
            rotation: patch.rotation ? { ...node.rotation, ...patch.rotation } : node.rotation,
            clearance: patch.clearance ? { ...node.clearance, ...patch.clearance } : node.clearance,
            capabilities: patch.capabilities ? { ...node.capabilities, ...patch.capabilities } : node.capabilities,
            config: patch.config ? { ...node.config, ...patch.config } : node.config,
          },
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function removeNode(scene: SpatialHabitatScene, id: string): SpatialHabitatScene {
  const ids = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of scene.nodes) {
      if (ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return {
    ...scene,
    nodes: scene.nodes.filter((node) => !ids.has(node.id)),
    updatedAt: new Date().toISOString(),
  };
}

export function duplicateNode(scene: SpatialHabitatScene, id: string): SpatialHabitatScene {
  const original = findNode(scene, id);
  if (!original) return scene;

  const rootCopyId = spatialId();
  const map = new Map<string, string>([[id, rootCopyId]]);
  const rootCopy: SpatialNode = {
    ...original,
    id: rootCopyId,
    label: original.label + " Copy",
    position: {
      ...original.position,
      x: original.position.x + SPATIAL_SNAP_CM,
      z: original.position.z + SPATIAL_SNAP_CM,
    },
    config: { ...original.config },
    capabilities: { ...original.capabilities },
  };

  const copies: SpatialNode[] = [rootCopy];
  const pending = scene.nodes.filter((node) => node.parentId === id);
  let queue = [...pending];

  while (queue.length) {
    const current = queue.shift()!;
    const copyId = spatialId();
    map.set(current.id, copyId);
    copies.push({
      ...current,
      id: copyId,
      parentId: map.get(current.parentId) ?? rootCopyId,
      config: { ...current.config },
      capabilities: { ...current.capabilities },
    });
    queue = queue.concat(scene.nodes.filter((node) => node.parentId === current.id));
  }

  return { ...scene, nodes: [...scene.nodes, ...copies], updatedAt: new Date().toISOString() };
}

function aabb(node: SpatialNode) {
  return {
    l: node.position.x - node.dimensions.width / 2,
    r: node.position.x + node.dimensions.width / 2,
    f: node.position.z - node.dimensions.depth / 2,
    b: node.position.z + node.dimensions.depth / 2,
    bo: node.position.y,
    t: node.position.y + node.dimensions.height,
  };
}

function intersects(a: SpatialNode, b: SpatialNode) {
  const x = aabb(a);
  const y = aabb(b);
  return x.l < y.r - EPS && x.r > y.l + EPS && x.f < y.b - EPS && x.b > y.f + EPS && x.bo < y.t - EPS && x.t > y.bo + EPS;
}

export function validateSpatialScene(scene: SpatialHabitatScene): SpatialValidationIssue[] {
  const issues: SpatialValidationIssue[] = [];

  for (const node of scene.nodes) {
    const parent = parentDimensions(scene, node.parentId);
    const bounds = aabb(node);
    if (
      bounds.l < -parent.width / 2 ||
      bounds.r > parent.width / 2 ||
      bounds.f < -parent.depth / 2 ||
      bounds.b > parent.depth / 2 ||
      bounds.bo < 0 ||
      bounds.t > parent.height
    ) {
      issues.push({
        severity: "error",
        code: "outside-container",
        message: node.label + " extends outside its parent space.",
        nodeIds: [node.id],
      });
    }
  }

  for (const parentId of new Set(scene.nodes.map((node) => node.parentId))) {
    const list = childrenOf(scene, parentId);
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        if (["socket", "vent"].includes(a.kind) || ["socket", "vent"].includes(b.kind)) continue;
        if (a.config.allowOverlap === true || b.config.allowOverlap === true) continue;
        if (intersects(a, b)) {
          issues.push({
            severity: "warning",
            code: "collision",
            message: a.label + " overlaps " + b.label + ".",
            nodeIds: [a.id, b.id],
          });
        }
      }
    }
  }

  const watts = scene.nodes
    .filter((node) => node.capabilities.powerConsumer)
    .reduce((sum, node) => sum + Math.max(0, Number(node.config.wattage) || 0), 0);
  const limit = scene.nodes.reduce((max, node) => Math.max(max, Number(node.config.maxLoadWatts) || 0), 0);
  if (limit > 0 && watts > limit) {
    issues.push({
      severity: "error",
      code: "power-load",
      message: "Configured equipment load is " + watts + " W, above the planning limit of " + limit + " W.",
      nodeIds: scene.nodes.filter((node) => node.capabilities.powerConsumer).map((node) => node.id),
    });
  }

  for (const vivarium of scene.nodes.filter((node) => node.kind === "vivarium")) {
    const child = childrenOf(scene, vivarium.id);
    if (!child.length) {
      issues.push({
        severity: "info",
        code: "empty-vivarium",
        message: vivarium.label + " has no internal build items yet.",
        nodeIds: [vivarium.id],
      });
    }
    if (child.some((node) => node.capabilities.heatSource) && !child.some((node) => node.capabilities.sensor)) {
      issues.push({
        severity: "warning",
        code: "missing-monitoring",
        message: vivarium.label + " has configured heating but no environmental sensor in the enclosure.",
        nodeIds: [vivarium.id],
      });
    }
  }

  return issues;
}

export function sceneToRoom(scene: SpatialHabitatScene, source: ReptileRoomWorkspace): ReptileRoomWorkspace {
  const root = scene.root.dimensions;
  const slots = [...(source.slots ?? [])];
  const objects: ReptileRoomObject[] = [];

  for (const node of scene.nodes) {
    if (node.parentId !== ROOT_CONTAINER_ID) continue;

    const width = node.dimensions.width;
    const depth = node.dimensions.depth;

    if (node.kind === "vivarium") {
      const old = slots.find((slot) => slot.id === node.id);
      const slot: ReptileRoomSlot = {
        ...(old ?? {
          id: node.id,
          snakeId: null,
          label: node.label,
          x: 0,
          y: 0,
          z: 0,
          w: width,
          h: depth,
          depth,
          height: node.dimensions.height,
        }),
        id: node.id,
        label: node.label,
        x: node.position.x + root.width / 2 - width / 2,
        y: node.position.z + root.depth / 2 - depth / 2,
        z: node.position.y,
        w: width,
        h: depth,
        depth,
        height: node.dimensions.height,
        assetId: node.assetId,
        stackGroupId: old?.stackGroupId ?? null,
        stackIndex: old?.stackIndex ?? 0,
        parentSlotId: null,
        clearance: { ...node.clearance },
        config: { ...(old?.config ?? {}), ...node.config },
      };
      const index = slots.findIndex((candidate) => candidate.id === slot.id);
      if (index >= 0) slots[index] = slot;
      else slots.push(slot);
    } else {
      const old = source.objects?.find((object) => object.id === node.id);
      objects.push({
        ...(old ?? {}),
        id: node.id,
        kind: node.kind as ReptileRoomObject["kind"],
        label: node.label,
        x: node.position.x + root.width / 2 - width / 2,
        y: node.position.z + root.depth / 2 - depth / 2,
        z: node.position.y,
        width,
        depth,
        height: node.dimensions.height,
        rotation: node.rotation.y,
        wall: null,
        parentAssetId: null,
        clearance: { ...node.clearance },
        notes: node.notes ?? "",
        assetType: node.category === "enrichment" || node.category === "water" ? "decor" : node.category === "construction" ? "furniture" : "equipment",
        assetId: node.assetId,
        intelligenceRole: old?.intelligenceRole,
        config: { ...(old?.config ?? {}), ...node.config },
      });
    }
  }

  const rootIds = new Set(scene.nodes.filter((node) => node.parentId === ROOT_CONTAINER_ID).map((node) => node.id));
  return {
    ...source,
    width: root.width,
    depth: root.depth,
    height: root.height,
    name: scene.root.label,
    unit: scene.units,
    slots: slots.filter((slot) => rootIds.has(slot.id)),
    objects: [
      ...objects,
      ...(source.objects ?? []).filter((object) => !rootIds.has(object.id) && !objects.some((node) => node.id === object.id)),
    ],
    updatedAt: new Date().toISOString(),
  };
}