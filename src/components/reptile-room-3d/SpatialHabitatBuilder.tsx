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
  mergeStoredSpatialSceneWithRoom,
  parentDimensions,
  removeNode,
  roomToSpatialScene,
  sceneToRoom,
  syncSceneRoomInfrastructure,
  snapCm,
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
  { assetId: "room-door-builder", kind: "door", category: "construction", label: "Room door", icon: "🚪", width: 90, depth: 10, height: 205 },
  { assetId: "room-window-builder", kind: "window", category: "construction", label: "Window", icon: "🪟", width: 120, depth: 10, height: 100 },
  { assetId: "room-vent-builder", kind: "vent", category: "construction", label: "Wall vent", icon: "▦", width: 30, depth: 8, height: 20 },
];

const STRUCTURAL_VIVARIUM_ASSETS: SpatialAssetPreset[] = [
  { assetId: "viv-background-builder", kind: "background", category: "construction", label: "Background panel", icon: "🧱", width: 100, depth: 3, height: 50 },
  { assetId: "viv-partition-builder", kind: "partition", category: "construction", label: "Partition panel", icon: "▥", width: 60, depth: 2, height: 35 },
  { assetId: "viv-vent-builder", kind: "vent", category: "construction", label: "Enclosure vent", icon: "▦", width: 20, depth: 3, height: 20 },
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
      ...(category === "lighting" ? { lightSource: true } : {}),
      ...(preset.kind === "uvb" ? { uvbSource: true } : {}),
      ...(category === "monitoring" ? { sensor: true } : {}),
      ...(category === "water" ? { waterSource: true } : {}),
      ...(["thermostat", "thermometer", "hygrometer", "temp-humidity", "socket", "smart-plug", "timer"].includes(preset.kind) ? { wallMountable: true } : {}),
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
        let nextScene = stored
          ? mergeStoredSpatialSceneWithRoom(stored, nextRoom)
          : roomToSpatialScene(nextRoom);

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
    commit(updateNode(scene, id, {
      position: { x: snapCm(x), y: Math.max(0, snapCm(y)), z: snapCm(z) },
    }));
  }, [commit, scene]);

  const add = useCallback((preset: SpatialAssetPreset) => {
    if (!scene) return;
    const dimensions = active?.dimensions ?? scene.root.dimensions;
    const node = createSpatialNode(preset, containerId, dimensions, childrenOf(scene, containerId).length);
    commit({ ...scene, nodes: [...scene.nodes, node] }, preset.label + " added.");
    setSelectedId(node.id);
    setLibraryOpen(false);
    setInspectorOpen(true);
  }, [active, commit, containerId, scene]);

  const addSnake = useCallback((snake: Snake) => {
    if (!scene) return;
    const result = addSnakeVivarium(scene, snake);
    commit(result.scene, snake.name + "'s vivarium ready.");
    setSelectedId(result.id);
    setInspectorOpen(true);
  }, [commit, scene]);

  const open = useCallback((id: string) => {
    if (!scene) return;
    const node = findNode(scene, id);
    if (!node?.capabilities.container) return;
    setContainerId(id);
    setMode("vivarium");
    setSelectedId(null);
    setInspectorOpen(false);
  }, [scene]);

  const back = useCallback(() => {
    setContainerId(ROOT_CONTAINER_ID);
    setMode("room");
    setSelectedId(null);
    setInspectorOpen(false);
  }, []);

  const undo = useCallback(() => {
    setHistory((items) => {
      const previous = items[items.length - 1];
      if (!previous) return items;
      setFuture((next) => scene ? [scene, ...next].slice(0, 40) : next);
      setScene(previous);
      setDirty(true);
      return items.slice(0, -1);
    });
  }, [scene]);

  const redo = useCallback(() => {
    setFuture((items) => {
      const next = items[0];
      if (!next) return items;
      setHistory((current) => scene ? [...current, scene].slice(-40) : current);
      setScene(next);
      setDirty(true);
      return items.slice(1);
    });
  }, [scene]);

  const removeSelected = useCallback(() => {
    if (!scene || !selected) return;
    if (selected.id === containerId) {
      back();
      commit(removeNode(scene, selected.id), selected.label + " removed.");
      return;
    }
    commit(removeNode(scene, selected.id), selected.label + " removed.");
    setSelectedId(null);
  }, [back, commit, containerId, scene, selected]);

  const duplicateSelected = useCallback(() => {
    if (!scene || !selected) return;
    commit(duplicateNode(scene, selected.id), selected.label + " duplicated.");
  }, [commit, scene, selected]);

  const save = useCallback(async () => {
    if (!user || !room || !scene) return;
    const blockingIssues = issues.filter((issue) => issue.severity === "error");
    if (blockingIssues.length) {
      setNotice("Resolve " + blockingIssues.length + " blocking spatial issue" + (blockingIssues.length === 1 ? "" : "s") + " before saving.");
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      await saveSpatialHabitat(user.uid, room.id, scene);
      const vivariums = scene.nodes.filter((node) => node.kind === "vivarium" && node.parentId === ROOT_CONTAINER_ID);
      await Promise.all(vivariums.map(async (vivarium) => {
        const twin = await loadVivariumTwin(user.uid, vivarium.id);
        await saveVivariumTwin(user.uid, vivarium.id, mergeSpatialNodesIntoVivariumTwin(twin, scene, vivarium.id));
      }));
      const compatibilityRoom = sceneToRoom(scene, room);
      await saveReptileRooms(user.uid, [compatibilityRoom]);
      setRoom(compatibilityRoom);
      setRooms((current) => current.map((item) => item.id === compatibilityRoom.id ? compatibilityRoom : item));
      setDirty(false);
      try { localStorage.removeItem(DRAFT_PREFIX + room.id); } catch { /* optional */ }
      setNotice("Spatial habitat saved.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Spatial habitat save failed.");
    } finally {
      setSaving(false);
    }
  }, [issues, room, scene, user]);

  const handleBlueprintChange = useCallback((nextRoom: RoomWorkspace) => {
    setRoom(nextRoom);
    setRooms((current) => current.map((item) => item.id === nextRoom.id ? nextRoom : item));
    setScene((current) => current ? syncSceneRoomInfrastructure(current, nextRoom) : current);
    setDirty(true);
    setNotice("Room blueprint updated. Save the spatial habitat to commit it.");
  }, []);

  const selectRoom = useCallback(async (nextRoomId: string) => {
    if (!nextRoomId || !room || nextRoomId === room.id) return;
    if (dirty) {
      setNotice("Save the current spatial habitat before switching rooms.");
      return;
    }
    const nextRoom = rooms.find((item) => item.id === nextRoomId);
    if (!nextRoom || !user) return;
    setSaving(true);
    try {
      const stored = await loadSpatialHabitat(user.uid, nextRoom.id).catch(() => null);
      setRoom(nextRoom);
      setScene(stored
        ? mergeStoredSpatialSceneWithRoom(stored, nextRoom)
        : roomToSpatialScene(nextRoom));
      setContainerId(ROOT_CONTAINER_ID);
      setSelectedId(null);
      setHistory([]);
      setFuture([]);
      setBlueprintOpen(false);
      setNotice("Switched to " + nextRoom.name + ".");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to switch rooms.");
    } finally {
      setSaving(false);
    }
  }, [dirty, room, rooms, user]);

  if (loading || profileLoading || !scene || !room) {
    return <main className="spatial-builder-loading">{notice || "Loading your spatial habitat…"}</main>;
  }

  return (
    <main className="spatial-builder">
      <header className="spatial-header">
        <div>
          <span>TINY TITANS · SPATIAL HABITAT BUILDER</span>
          <h1>{active?.label || "Reptile Room"}</h1>
          <div className="spatial-room-heading">
            <p>
            {displayDimension(active?.dimensions.width ?? 0, scene.units)}
            {" × "}
            {displayDimension(active?.dimensions.depth ?? 0, scene.units)}
            {" × "}
            {displayDimension(active?.dimensions.height ?? 0, scene.units)}
            {" · "}
            {childrenOf(scene, containerId).length} items
            </p>
            {rooms.length > 1 && (
              <label className="spatial-room-picker">Room
                <select value={room.id} onChange={(event) => void selectRoom(event.target.value)}>
                  {rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>
        <div className="spatial-actions">
          {mode === "vivarium" && <button type="button" onClick={back}>← Room</button>}
          <button type="button" onClick={() => setGrid((value) => !value)}>{grid ? "Hide grid" : "Grid"}</button>
          {mode === "room" && <button type="button" onClick={() => setCeiling((value) => !value)}>{ceiling ? "Hide ceiling" : "Ceiling"}</button>}
          <button type="button" onClick={undo} disabled={!history.length} aria-label="Undo">↶</button>
          <button type="button" onClick={redo} disabled={!future.length} aria-label="Redo">↷</button>
          <button type="button" className="save" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : dirty ? "Save" : "Saved"}</button>
        </div>
      </header>

      <nav className="spatial-breadcrumb" aria-label="Builder location">
        <button type="button" onClick={back}>Room</button>
        {mode === "vivarium" && <><span>›</span><strong>{active?.label}</strong></>}
      </nav>

      {notice && <div className="spatial-notice" role="status">{notice}</div>}

      <section className="spatial-layout">
        <aside className="spatial-panel spatial-library">
          <div className="spatial-panel-title">BUILD<strong>{mode === "room" ? "Room assets" : "Vivarium assets"}</strong></div>
          <div className="spatial-scroll">
            {mode === "room" && snakes.length > 0 && (
              <div className="spatial-snake-pick">
                <b>Your Snakes</b>
                {snakes.map((snake) => <button type="button" key={snake.id} onClick={() => addSnake(snake)}>🐍 {snake.name}</button>)}
              </div>
            )}
            {groups.map((group) => {
              const isOpen = openGroups[group.id] ?? group.id === "enclosure";
              return (
                <div className="spatial-group" key={group.id}>
                  <button type="button" onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !isOpen }))}>
                    {group.icon} {group.label}<span>{group.items.length}</span>
                  </button>
                  {isOpen && <div>{group.items.map((preset) => (
                    <button type="button" className="spatial-asset" key={preset.assetId} onClick={() => add(preset)}>
                      <span>{preset.icon ?? "◈"}</span>
                      <div><b>{preset.label}</b><small>{preset.width} × {preset.depth} × {preset.height} cm</small></div>
                      <b>＋</b>
                    </button>
                  ))}</div>}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="spatial-scene" aria-label={mode === "room" ? "3D reptile room builder" : "3D vivarium builder"}>
          <SpatialHabitatScene3D
            scene={scene}
            containerId={containerId}
            selectedId={selectedId}
            showGrid={grid}
            showCeiling={ceiling}
            onSelect={(id) => { setSelectedId(id); if (id) setInspectorOpen(true); }}
            onMove={move}
            onEnter={open}
          />
          <div className="spatial-hud">
            <b>{mode === "room" ? "ROOM" : "VIVARIUM"}</b>
            <span>Real-world cm · 5 cm snap · double-click an enclosure to enter</span>
          </div>
          <div className="spatial-mobile-actions">
            <button type="button" onClick={() => setLibraryOpen(true)}>＋ Add</button>
            <button type="button" onClick={() => { setSelectedId(null); setInspectorOpen(true); }}>{mode === "room" ? "Room" : "Container"}</button>
            {mode === "room" && <button type="button" onClick={() => { setLibraryOpen(false); setInspectorOpen(false); setBlueprintOpen(true); }}>Blueprint</button>}
            {selected && <button type="button" onClick={() => setInspectorOpen(true)}>Edit</button>}
          </div>
        </section>

        <aside className="spatial-panel spatial-inspector">
          {selected ? (
            <Inspector
              node={selected}
              parent={parentDimensions(scene, selected.parentId)}
              onPatch={(patch) => update(selected.id, patch)}
              onDuplicate={duplicateSelected}
              onDelete={removeSelected}
              onEnter={() => open(selected.id)}
            />
          ) : (
            <ContainerInspector
              container={active}
              onPatch={mode === "room"
                ? updateRoot
                : (patch) => { if (active && "id" in active) update(active.id, patch as Partial<SpatialNode>); }}
            />
          )}
          <div className="spatial-checks">
            <b>LAYOUT CHECKS · {issues.length}</b>
            {issues.slice(0, 8).map((issue, index) => (
              <div className={"issue " + issue.severity} key={issue.code + index}>
                <strong>{issue.severity}</strong><span>{issue.message}</span>
              </div>