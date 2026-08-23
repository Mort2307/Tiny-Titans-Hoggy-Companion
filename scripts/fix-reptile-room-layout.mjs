import fs from "node:fs";

const path = "src/pages/ReptileRoom.tsx";
let source = fs.readFileSync(path, "utf8");

const originalKey = 'const ROOM_STORAGE_KEY = "tinyTitans.reptileRoom.layout.v5";';
if (!source.includes(originalKey)) {
  throw new Error("Expected ReptileRoom.tsx layout key was not found; refusing to patch an unexpected file.");
}

source = source.replace(
  originalKey,
  'const ROOM_STORAGE_KEY = "tinyTitans.reptileRoom.layout.v6";\nconst ROOM_LEGACY_STORAGE_KEYS = ["tinyTitans.reptileRoom.layout.v5"];',
);

const oldNormalize = `function normalizeSlots(slots: RoomSlot[], snakes: Snake[]): RoomSlot[] {
  const scale = roomScale(snakes);
  return slots.map((slot, index) => {
    const snake = slot.snakeId
      ? (snakes.find((item) => item.id === slot.snakeId) ?? null)
      : null;
    const size = snake ? slotSize(snake, scale) : { w: slot.w, h: slot.h };
    const x = Number.isFinite(slot.x) ? slot.x : 3 + (index % 3) * 32;
    const y = Number.isFinite(slot.y) ? slot.y : 4 + Math.floor(index / 3) * 43;
    return {
      ...slot,
      snakeId: snake ? snake.id : null,
      x: clamp(x, 1, 99 - size.w),
      y: clamp(y, 1, 99 - size.h),
      w: size.w,
      h: size.h,
      lockX: undefined,
      lockY: undefined,
    };
  });
}`;

const newNormalize = `function normalizeSlots(slots: RoomSlot[], snakes: Snake[]): RoomSlot[] {
  const scale = roomScale(snakes);
  return slots.map((slot, index) => {
    const snake = slot.snakeId
      ? (snakes.find((item) => item.id === slot.snakeId) ?? null)
      : null;
    const size = snake ? slotSize(snake, scale) : { w: slot.w, h: slot.h };
    const x = Number.isFinite(slot.x) ? slot.x : 3 + (index % 3) * 32;
    const y = Number.isFinite(slot.y) ? slot.y : 4 + Math.floor(index / 3) * 43;
    return {
      ...slot,
      snakeId: snake ? snake.id : null,
      x: clamp(x, 1, 99 - size.w),
      y: clamp(y, 1, 99 - size.h),
      w: size.w,
      h: size.h,
      // IMPORTANT: never clear lock state while normalising persisted layouts.
      // A locked edge is part of the user's formation and must survive reloads.
      lockX: Number.isFinite(slot.lockX) ? slot.lockX : undefined,
      lockY: Number.isFinite(slot.lockY) ? slot.lockY : undefined,
    };
  });
}`;

if (!source.includes(oldNormalize)) {
  throw new Error("Expected normalizeSlots implementation was not found; refusing to patch.");
}
source = source.replace(oldNormalize, newNormalize);

const oldReload = `      setSnakes(loaded);
      setSlots((current) => {
        const base = current.length ? current : defaultSlots(loaded);
        const normalized = normalizeSlots(base, loaded);
        const next = mergeMissingSnakes(normalized, loaded);
        saveLayout(next);
        return next;
      });`;

const newReload = `      setSnakes(loaded);
      setSlots((current) => {
        // React state starts empty after navigation/reload. Restore the user's
        // saved formation before falling back to the automatic layout.
        let stored: RoomSlot[] = [];
        try {
          const raw = localStorage.getItem(ROOM_STORAGE_KEY);
          const legacyRaw = raw
            ? null
            : ROOM_LEGACY_STORAGE_KEYS
                .map((key) => localStorage.getItem(key))
                .find(Boolean);
          const parsed = JSON.parse(raw ?? legacyRaw ?? "[]");
          if (Array.isArray(parsed)) stored = parsed as RoomSlot[];
        } catch {
          stored = [];
        }

        const base = current.length
          ? current
          : stored.length
            ? stored
            : defaultSlots(loaded);
        const normalized = normalizeSlots(base, loaded);
        const next = mergeMissingSnakes(normalized, loaded);
        saveLayout(next);
        return next;
      });`;

if (!source.includes(oldReload)) {
  throw new Error("Expected reload layout block was not found; refusing to patch.");
}
source = source.replace(oldReload, newReload);

fs.writeFileSync(path, source, "utf8");
console.log(`Patched ${path}: persistent formation restore + lock preservation enabled.`);
