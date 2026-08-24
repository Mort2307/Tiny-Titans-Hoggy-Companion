import fs from "node:fs";
import path from "node:path";

const file = path.resolve("src/pages/ReptileRoom.tsx");
let source = fs.readFileSync(file, "utf8");

const replacements = [
  [
    'import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";',
    'import { useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";'
  ],
  [
    'const [snakes, setSnakes] = useState<Snake[]>([]); const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]); const roomsRef = useRef<ReptileRoomWorkspace[]>([]);',
    'const [snakes, setSnakes] = useState<Snake[]>([]); const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);'
  ],
  [
    'const replaceRooms = useCallback((next: ReptileRoomWorkspace[]) => { roomsRef.current = next; setRooms(next); }, []);',
    'const replaceRooms = useCallback((next: ReptileRoomWorkspace[]) => { setRooms(next); }, []);'
  ],
  [
    'const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0] ?? null; const roomUnit = activeRoom?.unit ?? "metric"; const slots = activeRoom?.slots ?? []; const storedSlots = activeRoom?.storedSlots ?? []; const objects = activeRoom?.objects ?? [];',
    'const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId) ?? rooms[0] ?? null, [rooms, activeRoomId]); const roomUnit = activeRoom?.unit ?? "metric"; const slots = useMemo(() => activeRoom?.slots ?? [], [activeRoom]); const storedSlots = useMemo(() => activeRoom?.storedSlots ?? [], [activeRoom]); const objects = useMemo(() => activeRoom?.objects ?? [], [activeRoom]);'
  ],
  [
    'const snakeById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]); const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) ?? null; const selectedSnake = selectedSlot?.snakeId ? snakeById.get(selectedSlot.snakeId) ?? null : null; const selectedObject = objects.find((object) => object.id === selectedObjectId) ?? null;',
    'const snakeById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]); const selectedSlot = useMemo(() => slots.find((slot) => slot.id === selectedSlotId) ?? null, [slots, selectedSlotId]); const selectedSnake = selectedSlot?.snakeId ? snakeById.get(selectedSlot.snakeId) ?? null : null; const selectedObject = useMemo(() => objects.find((object) => object.id === selectedObjectId) ?? null, [objects, selectedObjectId]);'
  ],
  [
    '  useEffect(() => { if (!activeRoom) return; setRoomNameDraft(activeRoom.name); setRoomDraft(roomDraftFor(activeRoom, activeRoom.unit ?? "metric")); }, [activeRoom?.id, activeRoom?.unit]);',
    '  useEffect(() => { if (!activeRoom) return; setRoomNameDraft(activeRoom.name); setRoomDraft(roomDraftFor(activeRoom, activeRoom.unit ?? "metric")); }, [activeRoom]);'
  ],
  [
    '  useEffect(() => { if (selectedSlot) setAssetDraft(assetDraftFor(selectedSlot, roomUnit)); else setAssetDraft(null); }, [selectedSlotId, selectedSlot?.w, selectedSlot?.h, selectedSlot?.height, roomUnit]);',
    '  useEffect(() => { if (selectedSlot) setAssetDraft(assetDraftFor(selectedSlot, roomUnit)); else setAssetDraft(null); }, [selectedSlot, roomUnit]);'
  ],
  [
    '  useEffect(() => { if (selectedObject) setObjectDraft(objectDraftFor(selectedObject, roomUnit)); else setObjectDraft(null); }, [selectedObjectId, selectedObject?.width, selectedObject?.depth, selectedObject?.height, selectedObject?.rotation, selectedObject?.openingType, roomUnit]);',
    '  useEffect(() => { if (selectedObject) setObjectDraft(objectDraftFor(selectedObject, roomUnit)); else setObjectDraft(null); }, [selectedObject, roomUnit]);'
  ],
  [
    '  const updateActiveRoom = useCallback((updater: (room: ReptileRoomWorkspace) => ReptileRoomWorkspace, successMessage?: string) => { const current = rooms.find((item) => item.id === activeRoomId); const room = current; if (!room) return; void persistRooms(rooms.map((item) => item.id === room.id ? updater(room) : item), successMessage); }, [activeRoomId, persistRooms]);',
    '  const updateActiveRoom = useCallback((updater: (room: ReptileRoomWorkspace) => ReptileRoomWorkspace, successMessage?: string) => { const room = rooms.find((item) => item.id === activeRoomId); if (!room) return; void persistRooms(rooms.map((item) => item.id === room.id ? updater(room) : item), successMessage); }, [activeRoomId, persistRooms, rooms]);'
  ]
];

for (const [from, to] of replacements) {
  if (!source.includes(from)) throw new Error(`Expected source pattern not found: ${from.slice(0, 100)}`);
  source = source.replace(from, to);
}

source = source.replaceAll("roomsRef.current", "rooms");

const oldMoveAndDrag = `  function moveItem(id: string, clientX: number, clientY: number, rect: DOMRect, isObject: boolean) { const room = rooms.find((item) => item.id === activeRoomId); if (!room || !rect.width || !rect.height) return; const roomW = room.width ?? DEFAULT_ROOM.width; const roomD = room.depth ?? DEFAULT_ROOM.depth; if (isObject) { const object = room.objects?.find((item) => item.id === id); if (!object) return; const rawX = ((clientX - rect.left) / rect.width) * roomW - object.width / 2; const rawY = ((clientY - rect.top) / rect.height) * roomD - object.depth / 2; const snapped = snapItem(rawX, rawY, object.width, object.depth, object); replaceRooms(rooms.map((item) => item.id === room.id ? { ...item, objects: (item.objects ?? []).map((entry) => entry.id === id ? { ...entry, x: snapped.x, y: snapped.y, wall: snapped.wall, rotation: snapped.rotation } : entry) } : item)); } else { const slot = room.slots.find((item) => item.id === id); if (!slot) return; const rawX = ((clientX - rect.left) / rect.width) * roomW - slot.w / 2; const rawY = ((clientY - rect.top) / rect.height) * roomD - slot.h / 2; const snapped = snapItem(rawX, rawY, slot.w, slot.h); replaceRooms(rooms.map((item) => item.id === room.id ? { ...item, slots: item.slots.map((entry) => entry.id === id ? { ...entry, x: snapped.x, y: snapped.y } : entry) } : item)); } }`;

const newMoveAndDrag = `  function moveItem(currentRooms: ReptileRoomWorkspace[], id: string, clientX: number, clientY: number, rect: DOMRect, isObject: boolean) { const room = currentRooms.find((item) => item.id === activeRoomId); if (!room || !rect.width || !rect.height) return currentRooms; const roomW = room.width ?? DEFAULT_ROOM.width; const roomD = room.depth ?? DEFAULT_ROOM.depth; if (isObject) { const object = room.objects?.find((item) => item.id === id); if (!object) return currentRooms; const rawX = ((clientX - rect.left) / rect.width) * roomW - object.width / 2; const rawY = ((clientY - rect.top) / rect.height) * roomD - object.depth / 2; const snapped = snapItem(rawX, rawY, object.width, object.depth, object); return currentRooms.map((item) => item.id === room.id ? { ...item, objects: (item.objects ?? []).map((entry) => entry.id === id ? { ...entry, x: snapped.x, y: snapped.y, wall: snapped.wall, rotation: snapped.rotation } : entry) } : item); } const slot = room.slots.find((item) => item.id === id); if (!slot) return currentRooms; const rawX = ((clientX - rect.left) / rect.width) * roomW - slot.w / 2; const rawY = ((clientY - rect.top) / rect.height) * roomD - slot.h / 2; const snapped = snapItem(rawX, rawY, slot.w, slot.h); return currentRooms.map((item) => item.id === room.id ? { ...item, slots: item.slots.map((entry) => entry.id === id ? { ...entry, x: snapped.x, y: snapped.y } : entry) } : item); }\n  function pointerDrag(event: ReactPointerEvent<HTMLElement>, id: string, isObject: boolean) { if (!editMode) return; const canvas = event.currentTarget.closest(".reptile-room-floor") as HTMLElement | null; if (!canvas) return; event.preventDefault(); event.stopPropagation(); setDragging(id); const rect = canvas.getBoundingClientRect(); let latestRooms = rooms; const onMove = (move: PointerEvent) => { latestRooms = moveItem(latestRooms, id, move.clientX, move.clientY, rect, isObject); replaceRooms(latestRooms); }; const onUp = () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); setDragging(null); void persistRooms(latestRooms); }; document.addEventListener("pointermove", onMove); document.addEventListener("pointerup", onUp); }`;

if (!source.includes(oldMoveAndDrag)) throw new Error("Expected moveItem/pointerDrag source pattern not found.");
source = source.replace(oldMoveAndDrag, newMoveAndDrag);

fs.writeFileSync(file, source);
console.log(`Repaired ${file}`);
