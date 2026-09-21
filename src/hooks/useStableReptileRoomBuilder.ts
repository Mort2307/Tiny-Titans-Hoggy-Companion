import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import {
  loadReptileRooms,
  saveReptileRooms,
  type ReptileRoomAssetConfig,
  type ReptileRoomSlot,
  type ReptileRoomWorkspace,
} from "../services/reptileRoomService";
import {
  uploadReptileRoomAssetPhoto,
  deleteReptileRoomAssetPhoto,
} from "../services/reptileRoomAssetPhotoService";
import {
  uploadReptileRoomVivariumPhoto,
  deleteReptileRoomVivariumPhoto,
} from "../services/reptileRoomPhotoService";
import type { Room3DAssetPreset, Room3DSelection, Room3DTransformPatch } from "../types/reptileRoom3D";
import type { Snake } from "../types/Snake";
import {
  DEFAULT_STABLE_VIVARIUM,
  makeStableObject,
  makeStableSlot,
  stableIdFor,
} from "../lib/stableReptileRoomBuilder";

export function useStableReptileRoomBuilder() {
  const { user, loading, profileLoading } = useAuth();
  const [rooms, setRooms] = useState<ReptileRoomWorkspace[]>([]);
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selected, setSelected] = useState<Room3DSelection>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showCeiling, setShowCeiling] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"library" | "inspector" | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"edit" | "occupant">("edit");
  const [photoBusy, setPhotoBusy] = useState(false);

  const room = useMemo(() => rooms[0] ?? null, [rooms]);
  const objects = room?.objects ?? [];
  const slots = room?.slots ?? [];
  const selectedObject = selected?.type === "object" ? objects.find((item) => item.id === selected.id) ?? null : null;
  const selectedSlot = selected?.type === "slot" ? slots.find((item) => item.id === selected.id) ?? null : null;
  const snakesById = useMemo(() => new Map(snakes.map((snake) => [snake.id, snake])), [snakes]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [nextRooms, nextSnakes] = await Promise.all([
        loadReptileRooms(user.uid),
        getUserSnakes(user.uid),
      ]);
      setRooms(nextRooms);
      setSnakes(nextSnakes);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load your reptile room.");
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !profileLoading && user) void load();
  }, [loading, profileLoading, user, load]);

  const replaceRoom = useCallback((next: ReptileRoomWorkspace, message?: string) => {
    setRooms((current) => current.map((item) => (item.id === next.id ? next : item)));
    if (message) setNotice(message);
  }, []);

  const updateSelected = useCallback(
    (patch: Room3DTransformPatch) => {
      if (!room || !selected) return;
      replaceRoom(
        selected.type === "object"
          ? { ...room, objects: objects.map((item) => item.id === selected.id ? { ...item, ...patch } : item) }
          : { ...room, slots: slots.map((item) => item.id === selected.id ? ({ ...item, ...patch } as ReptileRoomSlot) : item) },
      );
    },
    [objects, replaceRoom, room, selected, slots],
  );

  const updateRoom = useCallback(
    (patch: Partial<ReptileRoomWorkspace>) => {
      if (room) replaceRoom({ ...room, ...patch });
    },
    [replaceRoom, room],
  );

  const saveRoom = useCallback(async () => {
    if (!user || !room) return;
    setSaving(true);
    try {
      await saveReptileRooms(user.uid, [{ ...room, roomVersion: 4, updatedAt: new Date().toISOString() }]);
      setNotice("Room saved to cloud.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Room save failed.");
    } finally {
      setSaving(false);
    }
  }, [room, user]);

  const addAsset = useCallback((preset: Room3DAssetPreset) => {
    if (!room) return;
    if (preset.kind === "vivarium") {
      const slot = makeStableSlot(room, preset);
      replaceRoom({ ...room, slots: [...slots, slot] }, `${preset.label} added.`);
      setSelected({ type: "slot", id: slot.id });
    } else {
      const object = makeStableObject(room, preset);
      replaceRoom({ ...room, objects: [...objects, object] }, `${preset.label} added.`);
      setSelected({ type: "object", id: object.id });
    }
    setMobilePanel(null);
  }, [objects, replaceRoom, room, slots]);

  const addSnakeVivarium = useCallback((snake: Snake) => {
    if (!room) return;
    const existing = slots.find((slot) => slot.snakeId === snake.id);
    if (existing) {
      setSelected({ type: "slot", id: existing.id });
      setInspectorTab("occupant");
      setMobilePanel("inspector");
      return;
    }
    const slot = makeStableSlot(
      room,
      {
        kind: "vivarium",
        label: "Vivarium",
        width: DEFAULT_STABLE_VIVARIUM.width,
        depth: DEFAULT_STABLE_VIVARIUM.depth,
        height: DEFAULT_STABLE_VIVARIUM.height,
      },
      snake,
    );
    replaceRoom({ ...room, slots: [...slots, slot] }, `${snake.name}'s vivarium added.`);
    setSelected({ type: "slot", id: slot.id });
    setInspectorTab("occupant");
    setMobilePanel("inspector");
  }, [replaceRoom, room, slots]);

  const deleteSelected = useCallback(() => {
    if (!room || !selected) return;
    const next = selected.type === "object"
      ? {
          ...room,
          objects: objects.filter((item) => item.id !== selected.id),
          slots: slots.map((slot) => slot.parentSlotId === selected.id ? { ...slot, parentSlotId: null } : slot),
        }
      : { ...room, slots: slots.filter((item) => item.id !== selected.id) };
    replaceRoom(next, "Selection removed.");
    setSelected(null);
    setMobilePanel(null);
  }, [objects, replaceRoom, room, selected, slots]);

  const duplicateSelected = useCallback(() => {
    if (!room || !selectedObject) return;
    const copy = {
      ...selectedObject,
      id: stableIdFor("asset"),
      label: `${selectedObject.label} Copy`,
      x: selectedObject.x + 10,
      y: selectedObject.y + 10,
      stackGroupId: null,
      parentAssetId: null,
    };
    replaceRoom({ ...room, objects: [...objects, copy] }, "Asset duplicated.");
    setSelected({ type: "object", id: copy.id });
  }, [objects, replaceRoom, room, selectedObject]);

  const uploadPhoto = useCallback(async (file: File) => {
    if (!user || !room || !selected) return;
    setPhotoBusy(true);
    try {
      if (selected.type === "slot" && selectedSlot) {
        const url = await uploadReptileRoomVivariumPhoto(user.uid, room.id, selectedSlot.id, file);
        replaceRoom({ ...room, slots: slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: url } : slot) }, "Vivarium photo saved.");
      } else if (selected.type === "object" && selectedObject) {
        const url = await uploadReptileRoomAssetPhoto(user.uid, room.id, selectedObject.id, file);
        replaceRoom({ ...room, objects: objects.map((item) => item.id === selectedObject.id ? { ...item, config: { ...(item.config ?? {}), photoUrl: url } as ReptileRoomAssetConfig } : item) }, "Asset photo saved.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      setPhotoBusy(false);
    }
  }, [objects, replaceRoom, room, selected, selectedObject, selectedSlot, slots, user]);

  const removePhoto = useCallback(async () => {
    if (!user || !room || !selected) return;
    setPhotoBusy(true);
    try {
      if (selected.type === "slot" && selectedSlot) {
        await deleteReptileRoomVivariumPhoto(user.uid, room.id, selectedSlot.id);
        replaceRoom({ ...room, slots: slots.map((slot) => slot.id === selectedSlot.id ? { ...slot, photoUrl: "" } : slot) }, "Vivarium photo removed.");
      } else if (selected.type === "object" && selectedObject) {
        await deleteReptileRoomAssetPhoto(user.uid, room.id, selectedObject.id);
        replaceRoom({ ...room, objects: objects.map((item) => item.id === selectedObject.id ? { ...item, config: { ...(item.config ?? {}), photoUrl: undefined } as ReptileRoomAssetConfig } : item) }, "Asset photo removed.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Photo removal failed.");
    } finally {
      setPhotoBusy(false);
    }
  }, [objects, replaceRoom, room, selected, selectedObject, selectedSlot, slots, user]);

  return {
    user, loading, profileLoading, snakes, room, objects, slots, selected, setSelected, notice, saving,
    showGrid, setShowGrid, showCeiling, setShowCeiling, mobilePanel, setMobilePanel,
    inspectorTab, setInspectorTab, photoBusy, selectedObject, selectedSlot, snakesById,
    saveRoom, addAsset, addSnakeVivarium, deleteSelected, duplicateSelected, uploadPhoto,
    removePhoto, updateSelected, updateRoom,
  };
}
