import type { ReptileSpace, ReptileSpaceTemplate, SpatialUnit } from "../types/ReptileSpace";
import { getReptileSpaceTemplate } from "../data/reptileSpaceTemplates";

const STORAGE_PREFIX = "tinyTitans.reptileSpaces.v2";

function storageKey(uid: string): string {
  return `${STORAGE_PREFIX}:${uid}`;
}

function readSpaces(uid: string): ReptileSpace[] {
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ReptileSpace[]) : [];
  } catch {
    return [];
  }
}

function writeSpaces(uid: string, spaces: ReptileSpace[]): void {
  window.localStorage.setItem(storageKey(uid), JSON.stringify(spaces));
}

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listReptileSpaces(uid: string): ReptileSpace[] {
  if (!uid || typeof window === "undefined") return [];
  return readSpaces(uid);
}

export function createReptileSpace(
  uid: string,
  templateId: string,
  overrides?: {
    name?: string;
    dimensions?: ReptileSpace["dimensions"];
    preferredUnit?: SpatialUnit;
  },
): ReptileSpace {
  const template = getReptileSpaceTemplate(templateId);
  if (!template) throw new Error("Tiny Titans could not find that reptile space template.");

  const now = new Date().toISOString();
  const space: ReptileSpace = {
    id: id("space"),
    name: overrides?.name?.trim() || template.name,
    description: template.description,
    templateId: template.id,
    dimensions: overrides?.dimensions ?? { ...template.defaultDimensions },
    preferredUnit: overrides?.preferredUnit ?? "cm",
    walls: [],
    openings: [],
    objects: template.objects.map((item) => ({ ...item, id: id(item.kind) })),
    version: 2,
    createdAt: now,
    updatedAt: now,
  };

  const spaces = readSpaces(uid);
  writeSpaces(uid, [...spaces, space]);
  return space;
}

export function saveReptileSpace(uid: string, space: ReptileSpace): ReptileSpace {
  const next = { ...space, updatedAt: new Date().toISOString(), version: 2 as const };
  const spaces = readSpaces(uid);
  const index = spaces.findIndex((item) => item.id === next.id);
  if (index < 0) writeSpaces(uid, [...spaces, next]);
  else {
    const copy = [...spaces];
    copy[index] = next;
    writeSpaces(uid, copy);
  }
  return next;
}

export function removeReptileSpace(uid: string, spaceId: string): void {
  writeSpaces(uid, readSpaces(uid).filter((space) => space.id !== spaceId));
}

export function cloneTemplate(template: ReptileSpaceTemplate, name?: string): ReptileSpaceTemplate {
  return {
    ...template,
    id: id("template"),
    name: name?.trim() || `${template.name} Copy`,
    category: "custom",
    objects: template.objects.map((item) => ({ ...item, metadata: item.metadata ? { ...item.metadata } : undefined })),
  };
}
