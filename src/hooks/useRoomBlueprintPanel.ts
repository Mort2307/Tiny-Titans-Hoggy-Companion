import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { loadReptileRooms, saveReptileRooms, setRoomFloorPlan, type ReptileRoomPoint, type ReptileRoomWorkspace } from "../services/reptileRoomService";
import { uploadReptileRoomAsset, type ReptileRoomAssetKind } from "../services/reptileRoomAssetService";
import { createRoomPowerSocket, roomBlueprintPoints } from "../lib/roomBlueprint";

export function useRoomBlueprintPanel() {
  const { user } = useAuth();
  const [room, setRoom] = useState<ReptileRoomWorkspace | null>(null);
  const [points, setPoints] = useState<ReptileRoomPoint[]>([]);
  const [wallId, setWallId] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const rooms = await loadReptileRooms(user.uid);
      const next = rooms[0] ?? null;
      setRoom(next);
      setPoints(next ? roomBlueprintPoints(next) : []);
      setWallId(next?.walls?.[0]?.id ?? "");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to load room settings.");
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const walls = useMemo(() => room?.walls ?? [], [room]);

  const save = useCallback(async (nextRoom: ReptileRoomWorkspace) => {
    if (!user) return;
    setBusy(true);
    try {
      await saveReptileRooms(user.uid, [{ ...nextRoom, updatedAt: new Date().toISOString() }]);
      setRoom(nextRoom);
      setPoints(roomBlueprintPoints(nextRoom));
      setWallId(nextRoom.walls?.[0]?.id ?? wallId);
      setNotice("Room blueprint saved.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to save room blueprint.");
    } finally {
      setBusy(false);
    }
  }, [user, wallId]);

  const saveShape = useCallback(() => {
    if (!room) return;
    try { void save(setRoomFloorPlan(room, points)); }
    catch (reason) { setNotice(reason instanceof Error ? reason.message : "Invalid room shape."); }
  }, [points, room, save]);

  const updatePoint = useCallback((index: number, key: "x" | "z", value: number) => {
    setPoints((current) => current.map((point, pointIndex) => pointIndex === index ? { ...point, [key]: Number.isFinite(value) ? value : 0 } : point));
  }, []);

  const addPoint = useCallback(() => {
    const last = points[points.length - 1] ?? { x: 0, z: 0 };
    setPoints((current) => [...current, { x: last.x + 50, z: last.z }]);
  }, [points]);

  const removePoint = useCallback((index: number) => {
    setPoints((current) => current.length > 3 ? current.filter((_, pointIndex) => pointIndex !== index) : current);
  }, []);

  const addSocket = useCallback(() => {
    if (!room) return;
    const wall = walls.find((item) => item.id === wallId) ?? walls[0];
    if (!wall) return;
    void save({ ...room, sockets: [...(room.sockets ?? []), createRoomPowerSocket(wall)] });
  }, [room, save, wallId, walls]);

  const removeSocket = useCallback((id: string) => {
    if (!room) return;
    void save({ ...room, sockets: (room.sockets ?? []).filter((socket) => socket.id !== id) });
  }, [room, save]);

  const upload = useCallback(async (kind: ReptileRoomAssetKind, file: File) => {
    if (!user || !room) return;
    setBusy(true);
    try {
      const url = await uploadReptileRoomAsset(user.uid, room.id, kind, file);
      if (kind === "room-photo") await save({ ...room, roomPhotoUrl: url });
      else if (kind === "logo") await save({ ...room, logoUrl: url });
      else {
        const wall = walls.find((item) => item.id === wallId) ?? walls[0];
        if (wall) await save({ ...room, walls: walls.map((item) => item.id === wall.id ? { ...item, imageUrl: url } : item) });
      }
      setNotice("Room visual uploaded.");
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Unable to upload room visual.");
    } finally {
      setBusy(false);
    }
  }, [room, save, user, wallId, walls]);

  return { user, room, points, setPoints, wallId, setWallId, notice, busy, walls, updatePoint, addPoint, removePoint, saveShape, addSocket, removeSocket, upload };
}
