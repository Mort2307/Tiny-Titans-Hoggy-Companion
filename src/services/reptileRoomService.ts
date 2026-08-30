import { collection, deleteDoc, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export type ReptileRoomTemplate = "blank" | "hatchling" | "breeding" | "medical" | "brumation" | "bioactive" | "custom";
export type ReptileRoomUnit = "metric" | "imperial";
export type VivariumLifecycleStatus = "active" | "stored" | "empty" | "reserved" | "retired" | "quarantine" | "breeding" | "occupied";
export type VivariumCondition = "excellent" | "good" | "fair" | "needs-repair" | "retired";
export type VivariumAvailability = "available" | "occupied";
export type ReptileFurnitureKind = "rack" | "shelving" | "shelf" | "workbench" | "storage-cabinet" | "cabinet" | "equipment-station" | "quarantine-area" | "door" | "window" | "vent" | "table" | "sofa" | "plant" | "chair" | "lamp" | "socket" | "thermostat" | "heat-mat" | "che" | "halogen" | "dhp" | "rhp" | "ceiling-light" | "led-bar" | "uvb" | "basking-light" | "switched-socket" | "power-strip" | "timer" | "smart-plug" | "thermometer" | "hygrometer" | "temp-humidity" | "hide" | "water-bowl" | "cork" | "branch" | "cleaning-station" | "scale";
export type ReptileWall = "north" | "east" | "south" | "west" | string;
export type ReptileDoorType = "swing" | "sliding";
export type ReptileSwingDirection = "inward-left" | "inward-right" | "outward-left" | "outward-right";
export type ReptileRoomAssetType = "furniture" | "vivarium" | "decor" | "equipment";
export type ReptileClearance = { front: number; rear: number; left: number; right: number; top: number };
export type ReptileRoomPoint = { x: number; z: number };
export type ReptileRoomWall = { id: string; start: ReptileRoomPoint; end: ReptileRoomPoint; height?: number; thickness?: number; material?: string; colour?: string; textureUrl?: string; imageUrl?: string };
export type ReptileRoomSocket = { id: string; wallId: string | null; x: number; z: number; height: number; outlets: number; label?: string; switchable?: boolean; enabled?: boolean; circuit?: string; maxLoadWatts?: number };
export type ReptileRoomAssetConfig = { enabled?: boolean; linkedSlotId?: string | null; linkedSnakeId?: string | null; targetTemperatureC?: number; currentTemperatureC?: number; humidity?: number; wattage?: number; outlets?: number; maxLoadWatts?: number; circuit?: string; switchable?: boolean; mode?: "heat" | "cool" | "off"; photoperiodHours?: number; scheduleStart?: string; scheduleEnd?: string; enclosureStyle?: string; probeLocation?: string; notes?: string; photoUrl?: string };
export type ReptileRoomObject = { id: string; kind: ReptileFurnitureKind; label: string; x: number; y: number; z: number; width: number; depth: number; height: number; rotation: number; wall?: ReptileWall | null; openingType?: ReptileDoorType; swingDirection?: ReptileSwingDirection; swingAngle?: number; sillHeight?: number; stackGroupId?: string | null; stackIndex?: number; parentAssetId?: string | null; clearance?: Partial<ReptileClearance>; notes?: string; assetType?: ReptileRoomAssetType; assetId?: string; intelligenceRole?: string; config?: ReptileRoomAssetConfig };
export type ReptileRoomSlot = { id: string; snakeId: string | null; label: string; x: number; y: number; z: number; w: number; h: number; depth?: number; height?: number; lifecycleStatus?: VivariumLifecycleStatus; condition?: VivariumCondition; availability?: VivariumAvailability; storageLocation?: string; storageNote?: string; notes?: string; maintenanceNote?: string; photoUrl?: string; stackGroupId?: string | null; stackIndex?: number; parentSlotId?: string | null; clearance?: Partial<ReptileClearance>; assetId?: string; intelligenceRole?: string; config?: ReptileRoomAssetConfig };
export type ReptileRoomWorkspace = { id: string; name: string; template: ReptileRoomTemplate; unit?: ReptileRoomUnit; width?: number; depth?: number; height?: number; storageCapacity?: number; ceilingVisible?: boolean; floorPlan?: ReptileRoomPoint[]; walls?: ReptileRoomWall[]; sockets?: ReptileRoomSocket[]; roomPhotoUrl?: string; logoUrl?: string; slots: ReptileRoomSlot[]; storedSlots: ReptileRoomSlot[]; objects?: ReptileRoomObject[]; roomVersion?: number; createdAt: string; updatedAt: string };

export const REPTILE_ROOM_VERSION = 4;
const LOCAL_CACHE_PREFIX = "tinyTitans.reptileRooms.v2";
export const DEFAULT_ROOM = { width: 360, depth: 300, height: 240, storageCapacity: 12 };
export const DEFAULT_CLEARANCE: ReptileClearance = { front: 30, rear: 5, left: 5, right: 5, top: 10 };
function cacheKey(uid: string) { return `${LOCAL_CACHE_PREFIX}:${uid}`; }
function numberOr(value: unknown, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? value : fallback; }
function clampAngle(value: number) { return Math.min(180, Math.max(0, value)); }
function normalizeClearance(value: unknown): Partial<ReptileClearance> { if (!value || typeof value !== "object") return {}; const input = value as Partial<ReptileClearance>; return Object.fromEntries((Object.keys(DEFAULT_CLEARANCE) as Array<keyof ReptileClearance>).filter((key) => typeof input[key] === "number" && Number.isFinite(input[key])).map((key) => [key, Math.max(0, input[key] as number)])); }
function isPoint(value: unknown): value is ReptileRoomPoint { return Boolean(value && typeof value === "object" && typeof (value as ReptileRoomPoint).x === "number" && Number.isFinite((value as ReptileRoomPoint).x) && typeof (value as ReptileRoomPoint).z === "number" && Number.isFinite((value as ReptileRoomPoint).z)); }
function normalizePoint(value: unknown): ReptileRoomPoint | null { return isPoint(value) ? { x: value.x, z: value.z } : null; }
export function roomWallLengthCm(wall: ReptileRoomWall): number { return Math.hypot(wall.end.x - wall.start.x, wall.end.z - wall.start.z); }
export function isValidRoomPolygon(points: ReptileRoomPoint[]): boolean { return points.length >= 3 && points.every(isPoint) && Math.abs(points.reduce((area, point, index) => { const next = points[(index + 1) % points.length]; return area + point.x * next.z - next.x * point.z; }, 0)) >= 100; }
export function wallsFromFloorPlan(points: ReptileRoomPoint[], height: number): ReptileRoomWall[] { return points.map((start, index) => ({ id: `wall-${index + 1}`, start: { ...start }, end: { ...points[(index + 1) % points.length] }, height, thickness: 10, material: "paint", colour: "#6d6257" })); }
