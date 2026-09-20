import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/useAuth";
import RoomBlueprintPanel from "./RoomBlueprintPanel";
import { getUserSnakes } from "../../services/snakeService";
import { loadReptileRooms, saveReptileRooms } from "../../services/reptileRoomService";
import { loadSpatialHabitat, saveSpatialHabitat } from "../../services/spatialHabitatPersistenceService";
import { loadVivariumTwin, saveVivariumTwin } from "../../services/vivariumTwinService";
import { mergeSpatialNodesIntoVivariumTwin } from "../../services/spatialVivariumTwinBridge";
import {
  ROOT_CONTAINER_ID,
  childrenOf,
  createSpatialNode,
  duplicateNode,
  findNode,
  normalizeScene,
  parentDimensions,
  removeNode,
  roomToSpatialScene,
  sceneToRoom,
  syncSceneRoomInfrastructure,
  snapCm,
  snapNodeToNearestWall,
  snapNodeToFloor,
  snapNodeToCeiling,
  updateNode,
  validateSpatialScene,
} from "../../services/spatialHabitatService";
import { REPTILE_ROOM_ASSETS } from "../../data/reptileRoomAssetCatalog";
import type { Room3DAssetPreset } from "../../types/reptileRoom3D";
import type { Snake } from "../../types/Snake";
import type { SpatialAssetPreset, SpatialBuilderMode, SpatialHabitatScene, SpatialNode } from "../../types/spatialHabitat";
import SpatialHabitatScene3D from "./SpatialHabitatScene3D";
import "../../styles/spatial-habitat-builder.css";

const DRAFT_PREFIX = "tinyTitans.spatialHabitatDraft.v1:";

const STRUCTURAL_ROOM_ASSETS: SpatialAssetPreset[] = [
  { assetId: "room-door-builder", kind: "door", category: "construction", label: "Room door", icon: "🚪", width: 90, depth: 10, height: 205, capabilities: { wallMountable: true } },
  { assetId: "room-window-builder", kind: "window", category: "construction", label: "Window", icon: "🪟", width: 120, depth: 10, height: 100, capabilities: { wallMountable: true } },
  { assetId: "room-vent-builder", kind: "vent", category: "construction", label: "Wall vent", icon: "▦", width: 30, depth: 8, height: 20, capabilities: { wallMountable: true } },
];

const STRUCTURAL_VIVARIUM_ASSETS: SpatialAssetPreset[] = [
  { assetId: "viv-background-builder", kind: "background", category: "construction", label: "Background panel", icon: "🧱", width: 100, depth: 3, height: 50, capabilities: { wallMountable: true } },
  { assetId: "viv-partition-builder", kind: "partition", category: "construction", label: "Partition panel", icon: "▥", width: 60, depth: 2, height: 35, capabilities: { wallMountable: true } },
  { assetId: "viv-vent-builder", kind: "vent", category: "construction", label: "Enclosure vent", icon: "▦", width: 20, depth: 3, height: 20, capabilities: { wallMountable: true } },
];

const toPreset = (preset: Room3DAssetPreset): SpatialAssetPreset => {
  let category: SpatialAssetPreset["category"] = "construction";
  if (preset.kind === "vivarium") category = "enclosure";
  else if (["rack", "shelving", "storage-cabinet", "cabinet"].includes(preset.kind)) category = "storage";
  else if (["workbench", "equipment-station", "quarantine-area", "table", "chair"].includes(preset.kind)) category = "keeper";
  else if (["che", "halogen", "dhp", "rhp", "heat-mat", "thermostat", "basking-light"].includes(preset.kind)) category = "heating";
  else if (["ceiling-light", "led-bar", "uvb", "lamp"].includes(preset.kind)) category = "lighting";
  else if (["socket", "switched-socket", "power-strip", "timer", "smart-plug"].includes(preset.kind)) category = "power";
  else if (["thermometer", "hygrometer", "temp-humidity"].includes(preset.kind)) category = "monitoring";
  else if (["hide", "cork", "branch", "plant", "cleaning-station", "scale"].includes(preset.kind)) category = "enrichment";
  else if (preset.kind === "water-bowl") category = "water";

  const powerConsumer = Boolean(preset.config?.wattage) || ["heating", "lighting"].includes(category);
  return {
    assetId: preset.assetId ?? preset.kind,
    kind: preset.kind as SpatialAssetPreset["kind"],
    category,
    label: preset.label,
    icon: preset.icon,
    width: preset.width,
    depth: preset.depth,
    height: preset.height,
    capabilities: {
      ...(category === "enclosure" ? { container: true } : {}),
      ...(powerConsumer ? { powerConsumer: true } : {}),
      ...(category === "heating" && preset.kind !== "thermostat" ? { heatSource: true } : {}),
      ...(category === "lighting" ? { lightSource: true, ceilingMountable: true } : {}),
      ...(preset.kind === "uvb" ? { uvbSource: true } : {}),
      ...(category === "monitoring" ? { sensor: true } : {}),
      ...(category === "water" ? { waterSource: true } : {}),
      ...(["thermostat", "thermometer", "hygrometer", "temp-humidity", "socket", "smart-plug", "timer", "vent", "window", "door"].includes(preset.kind) ? { wallMountable: true } : {}),
    },
    config: preset.config as SpatialAssetPreset["config"],
    description: preset.description,
  };
};

function presetsFor(mode: SpatialBuilderMode) {
  const all = REPTILE_ROOM_ASSETS.map(toPreset);
  if (mode === "room") {
    return [...STRUCTURAL_ROOM_ASSETS, ...all.filter((preset) => !["hide", "cork", "branch", "plant", "water-bowl", "vivarium"].includes(preset.kind))];
  }
  return [...STRUCTURAL_VIVARIUM_ASSETS, ...all.filter((preset) => preset.kind !== "vivarium")];
}

function groupsFor(mode: SpatialBuilderMode) {
  const icons: Record<string, string> = {
    construction: "🧱",
    enclosure: "🏠",
    storage: "📦",
    keeper: "🛠️",
    heating: "🔥",
    lighting: "💡",
    power: "🔌",
    monitoring: "📟",
    enrichment: "🌿",
    water: "💧",
  };
  const map = new Map<string, { id: string; label: string; icon: string; items: SpatialAssetPreset[] }>();
  for (const preset of presetsFor(mode)) {
    const current = map.get(preset.category) ?? {
      id: preset.category,
      label: preset.category[0].toUpperCase() + preset.category.slice(1),
      icon: icons[preset.category] ?? "◈",
      items: [],
    };
    current.items.push(preset);
    map.set(preset.category, current);
  }
  return [...map.values()];
}

function addSnakeVivarium(scene: SpatialHabitatScene, snake: Snake) {
  const existing = scene.nodes.find((node) => node.kind === "vivarium" && node.config.linkedSnakeId === snake.id);
  if (existing) return { scene, id: existing.id };

  const preset: SpatialAssetPreset = {
    assetId: "vivarium-front-opening",
    kind: "vivarium",
    category: "enclosure",
    label: snake.name + "'s Vivarium",
    icon: "🏠",
    width: 120,
    depth: 60,
    height: 60,
    capabilities: { container: true },
  };
  const node = createSpatialNode(preset, ROOT_CONTAINER_ID, scene.root.dimensions, childrenOf(scene, ROOT_CONTAINER_ID).length);
  const next = updateNode(
    { ...scene, nodes: [...scene.nodes, node] },
    node.id,
    {
      label: snake.name + "'s Vivarium",
      config: { ...node.config, linkedSnakeId: snake.id },
    },
  );
  return { scene: next, id: node.id };
}

function displayDimension(value: number, units: "metric" | "imperial") {
  if (units === "metric") return Math.round(value) + " cm";
  return (value / 2.54).toFixed(value >= 100 ? 0 : 1) + " in";
}

export default function SpatialHabitatBuilder() {
  const { user, loading, profileLoading } = useAuth();
  type RoomWorkspace = Awaited<ReturnType<typeof loadReptileRooms>>[number];
  const [rooms, setRooms] = useState<RoomWorkspace[]>([]);
  const [room, setRoom] = useState<RoomWorkspace | null>(null);
  const [scene, setScene] = useState<SpatialHabitatScene | null>(null);
  const [containerId, setContainerId] = useState(ROOT_CONTAINER_ID);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<SpatialBuilderMode>("room");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ enclosure: true, keeper: true });
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [grid, setGrid] = useState(true);
  const [ceiling, setCeiling] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [history, setHistory] = useState<SpatialHabitatScene[]>([]);
  const [future, setFuture] = useState<SpatialHabitatScene[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [blueprintOpen, setBlueprintOpen] = useState(false);

  const selected = useMemo(() => scene ? findNode(scene, selectedId) : null, [scene, selectedId]);
  const active = useMemo(() => {
    if (!scene) return null;
    return containerId === ROOT_CONTAINER_ID ? scene.root : findNode(scene, containerId);
  }, [containerId, scene]);
  const groups = useMemo(() => groupsFor(mode), [mode]);
  const issues = useMemo(() => scene ? validateSpatialScene(scene) : [], [scene]);
  const blueprintRoom = useMemo(() => (scene && room ? sceneToRoom(scene, room) : room), [room, scene]);
  const draftKey = room ? DRAFT_PREFIX + room.id : "";

  useEffect(() => {
    if (!user || loading || profileLoading) return;
    let cancelled = false;

    void Promise.all([loadReptileRooms(user.uid), getUserSnakes(user.uid)])
      .then(async ([rooms, nextSnakes]) => {
        if (cancelled) return;
        const nextRoom = rooms[0] ?? null;
        setRooms(rooms);
        setRoom(nextRoom);
        setSnakes(nextSnakes);
        if (!nextRoom) return;

        const stored = await loadSpatialHabitat(user.uid, nextRoom.id).catch(() => null);
        let nextScene = normalizeScene(stored ?? roomToSpatialScene(nextRoom));

        try {
          const draft = localStorage.getItem(DRAFT_PREFIX + nextRoom.id);
          if (draft) {
            const parsed = JSON.parse(draft) as SpatialHabitatScene | { scene?: SpatialHabitatScene; savedAt?: string };
            const draftScene = "scene" in parsed ? parsed.scene : parsed;
            const draftSavedAt = "scene" in parsed ? parsed.savedAt : undefined;
            const draftIsNewer = !draftSavedAt || !nextRoom.updatedAt || Date.parse(draftSavedAt) > Date.parse(nextRoom.updatedAt);
            if (draftIsNewer && draftScene?.schemaVersion === 1 && Array.isArray(draftScene.nodes)) nextScene = normalizeScene(draftScene);
          }
        } catch {
          // Local draft is an optional recovery layer.
        }

        setScene(nextScene);
      })
      .catch((error) => {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "Unable to load spatial habitat.");
      });

    return () => { cancelled = true; };
  }, [loading, profileLoading, user]);

  useEffect(() => {
    if (!scene || !draftKey || !dirty) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ scene, savedAt: new Date().toISOString() }));
    } catch {
      // Cloud save remains the durable store.
    }
  }, [dirty, draftKey, scene]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const commit = useCallback((next: SpatialHabitatScene, message?: string) => {
    setScene((current) => {
      if (current && JSON.stringify(current) === JSON.stringify(next)) return current;
      if (current) setHistory((items) => [...items, current].slice(-40));
      setFuture([]);
      return { ...next, updatedAt: new Date().toISOString() };
    });
    setDirty(true);
    if (message) setNotice(message);
  }, []);

  const updateRoot = useCallback((patch: Partial<SpatialHabitatScene["root"]>) => {
    if (!scene) return;
    commit({
      ...scene,
      root: {
        ...scene.root,
        ...patch,
        dimensions: { ...scene.root.dimensions, ...(patch.dimensions ?? {}) },
      },
    });
  }, [commit, scene]);

  const update = useCallback((id: string, patch: Partial<SpatialNode>) => {
    if (scene) commit(updateNode(scene, id, patch));
  }, [commit, scene]);

  const move = useCallback((id: string, x: number, y: number, z: number) => {
    if (!scene) return;