import type { ReptileSpace, ReptileSpaceTemplate, SpatialObjectBase, SpatialUnit } from "../types/ReptileSpace";
import { getReptileSpaceTemplate } from "../data/reptileSpaceTemplates";

const STORAGE_KEY = "tinyTitans.reptileSpaces.v2";
const ACTIVE_KEY = "tinyTitans.reptileSpaces.active.v2";

function now(): string { return new Date().toISOString(); }
function uid(prefix: string): string { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`; }

export function readReptileSpaces(): ReptileSpace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((space): space is ReptileSpace => Boolean(space) && typeof space === "object" && (space as ReptileSpace).version === 2 && typeof (space as ReptileSpace).id === "string");
  } catch {
    return [];
  }
}

export function writeReptileSpaces(spaces: ReptileSpace[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(spaces)); } catch { /* local-first preference; persistence is best effort */ }
}

export function getActiveReptileSpaceId(): string | null {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

export function setActiveReptileSpaceId(id: string): void {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch { /* best effort */ }
}

export function createReptileSpace(templateId = "blank-room", overrides?: Partial<Pick<ReptileSpace, "name" | "description" | "preferredUnit">>): ReptileSpace {
  const template: ReptileSpaceTemplate | undefined = getReptileSpaceTemplate(templateId);
  const selected = template ?? getReptileSpaceTemplate("blank-room")!;
  const created = now();
  return {
    id: uid("room"),
    name: overrides?.name ?? selected.name,
    description: overrides?.description ?? selected.description,
    templateId: selected.id,
    dimensions: { ...selected.defaultDimensions },
    preferredUnit: overrides?.preferredUnit ?? "m",
    walls: [],
    openings: [],
    objects: selected.objects.map((object, index) => ({ ...object, id: uid(`object-${index}`) })),
    version: 2,
    createdAt: created,
    updatedAt: created,
  };
}

export function saveReptileSpace(space: ReptileSpace): ReptileSpace {
  const next = { ...space, updatedAt: now() };
  const spaces = readReptileSpaces();
  const index = spaces.findIndex((item) => item.id === next.id);
  if (index >= 0) spaces[index] = next; else spaces.push(next);
  writeReptileSpaces(spaces);
  setActiveReptileSpaceId(next.id);
  return next;
}

export function removeReptileSpace(id: string): void {
  const spaces = readReptileSpaces().filter((space) => space.id !== id);
  writeReptileSpaces(spaces);
  if (getActiveReptileSpaceId() === id) {
    const replacement = spaces[0]?.id;
    try { if (replacement) localStorage.setItem(ACTIVE_KEY, replacement); else localStorage.removeItem(ACTIVE_KEY); } catch { /* best effort */ }
  }
}

export function updateSpaceDimensions(space: ReptileSpace, dimensions: ReptileSpace["dimensions"]): ReptileSpace {
  return saveReptileSpace({ ...space, dimensions: { ...dimensions } });
}

export function addSpatialObject(space: ReptileSpace, object: Omit<SpatialObjectBase, "id">): ReptileSpace {
  return saveReptileSpace({ ...space, objects: [...space.objects, { ...object, id: uid("object") }] });
}

export function removeSpatialObject(space: ReptileSpace, objectId: string): ReptileSpace {
  return saveReptileSpace({ ...space, objects: space.objects.filter((object) => object.id !== objectId) });
}

export function updateSpatialObject(space: ReptileSpace, objectId: string, patch: Partial<SpatialObjectBase>): ReptileSpace {
  return saveReptileSpace({ ...space, objects: space.objects.map((object) => object.id === objectId ? { ...object, ...patch } : object) });
}

export function migrateLegacyRoomIfNeeded(legacyKey: string, snakeObjects: SpatialObjectBase[] = []): ReptileSpace[] {
  const existing = readReptileSpaces();
  if (existing.length) return existing;
  try {
    const raw = localStorage.getItem(legacyKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const objects = snakeObjects.length ? snakeObjects : parsed.filter((item): item is SpatialObjectBase => Boolean(item) && typeof item === "object" && typeof (item as SpatialObjectBase).id === "string");
    const migrated = createReptileSpace("scaled-room", { name: "Main Reptile Room", preferredUnit: "m" });
    const withObjects = { ...migrated, objects: objects.map((object) => ({ ...object, id: object.id || uid("object") })) };
    writeReptileSpaces([withObjects]);
    setActiveReptileSpaceId(withObjects.id);
    return [withObjects];
  } catch {
    return [];
  }
}

export function ensureDefaultReptileSpace(): ReptileSpace[] {
  const existing = readReptileSpaces();
  if (existing.length) return existing;
  const space = createReptileSpace("blank-room");
  writeReptileSpaces([space]);
  setActiveReptileSpaceId(space.id);
  return [space];
}

export const DEFAULT_SPATIAL_UNIT: SpatialUnit = "m";
