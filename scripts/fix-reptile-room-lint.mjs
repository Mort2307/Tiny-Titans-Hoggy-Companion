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
    '  const updateActiveRoom = useCallback((updater: (room: ReptileRoomWorkspace) => ReptileRoomWorkspace, successMessage?: string) => { const current = roomsRef.current; const room = current.find((item) => item.id === activeRoomId); if (!room) return; void persistRooms(current.map((item) => item.id === room.id ? updater(room) : item), successMessage); }, [activeRoomId, persistRooms]);',
    '  const updateActiveRoom = useCallback((updater: (room: ReptileRoomWorkspace) => ReptileRoomWorkspace, successMessage?: string) => { const room = rooms.find((item) => item.id === activeRoomId); if (!room) return; void persistRooms(rooms.map((item) => item.id === room.id ? updater(room) : item), successMessage); }, [activeRoomId, persistRooms, rooms]);'
  ]
];

for (const [from, to] of replacements) {
  if (source.includes(from)) source = source.replace(from, to);
}

source = source.replaceAll("roomsRef.current", "rooms");

const moveItemLine = source.split("\n").find((line) => line.startsWith("  function moveItem("));
if (!moveItemLine) throw new Error("Expected moveItem implementation not found.");

const canonicalPointerDrag = '  function pointerDrag(event: ReactPointerEvent<HTMLElement>, id: string, isObject: boolean) { if (!editMode) return; const canvas = event.currentTarget.closest(".reptile-room-floor") as HTMLElement | null; if (!canvas) return; event.preventDefault(); event.stopPropagation(); setDragging(id); const rect = canvas.getBoundingClientRect(); let latestRooms = rooms; const onMove = (move: PointerEvent) => { latestRooms = moveItem(latestRooms, id, move.clientX, move.clientY, rect, isObject); replaceRooms(latestRooms); }; const onUp = () => { document.removeEventListener("pointermove", onMove); document.removeEventListener("pointerup", onUp); setDragging(null); void persistRooms(latestRooms); }; document.addEventListener("pointermove", onMove); document.addEventListener("pointerup", onUp); }';

const lines = source.split("\n").filter((line) => !line.startsWith("  function pointerDrag("));
const moveIndex = lines.findIndex((line) => line.startsWith("  function moveItem("));
if (moveIndex < 0) throw new Error("Expected moveItem implementation not found after normalization.");
lines.splice(moveIndex + 1, 0, canonicalPointerDrag);
source = lines.join("\n");

fs.writeFileSync(file, source);
console.log(`Repaired ${file}`);
