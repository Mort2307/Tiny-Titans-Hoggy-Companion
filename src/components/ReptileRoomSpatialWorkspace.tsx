import { useCallback, useEffect, useState } from "react";
import type { SpatialRoom, RoomTemplateId } from "../types/ReptileRoomSpatial";
import { duplicateSpatialRoom, listSpatialRooms, removeSpatialRoom, saveSpatialRoom } from "../services/reptileRoomSpatialService";
import ReptileRoomSpatialBuilder from "./ReptileRoomSpatialBuilder";
import ReptileRoomSpatialCanvas from "./ReptileRoomSpatialCanvas";

type Props = { uid: string };

const TEMPLATE_LABELS: Record<RoomTemplateId, string> = {
  blank: "Blank",
  breeding: "Breeding",
  hatchling: "Hatchling",
  medical: "Medical",
  brumation: "Brumation",
  bioactive: "Bioactive",
};

export default function ReptileRoomSpatialWorkspace({ uid }: Props) {
  const [rooms, setRooms] = useState<SpatialRoom[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  const reload = useCallback(() => {
    const next = listSpatialRooms();
    setRooms(next);
    setActiveId((current) => current && next.some((room) => room.id === current) ? current : next[0]?.id ?? null);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const active = rooms.find((room) => room.id === activeId) ?? null;

  function handleCreated(room: SpatialRoom) {
    setRooms(listSpatialRooms());
    setActiveId(room.id);
    setShowBuilder(false);
  }

  function handleRoomChange(room: SpatialRoom) {
    const saved = saveSpatialRoom(room);
    setRooms((current) => current.map((item) => item.id === saved.id ? saved : item));
  }

  function removeObject(objectId: string) {
    if (!active) return;
    handleRoomChange({ ...active, objects: active.objects.filter((object) => object.id !== objectId) });
  }

  function deleteRoom(roomId: string) {
    const room = rooms.find((item) => item.id === roomId);
    if (!room || !window.confirm(`Remove ${room.name}? This removes the room layout only; it does not delete snakes or husbandry records.`)) return;
    removeSpatialRoom(roomId);
    reload();
  }

  function duplicateRoom(roomId: string) {
    const source = rooms.find((item) => item.id === roomId);
    if (!source) return;
    const copy = duplicateSpatialRoom(roomId, `${source.name} Copy`);
    if (copy) { setRooms(listSpatialRooms()); setActiveId(copy.id); }
  }

  return <section className="tt-spatial-workspace" aria-label="Tiny Titans spatial reptile rooms">
    <div className="tt-spatial-room-tabs" role="tablist" aria-label="Reptile rooms">
      {rooms.map((room) => <button key={room.id} type="button" role="tab" aria-selected={active?.id === room.id} onClick={() => setActiveId(room.id)}>{room.name}<small>{TEMPLATE_LABELS[room.templateId]}</small></button>)}
      <button type="button" className="tt-spatial-add-room" onClick={() => setShowBuilder((value) => !value)}>＋ New room</button>
    </div>

    {showBuilder && <ReptileRoomSpatialBuilder uid={uid} onCreated={handleCreated} />}

    {!active && !showBuilder && <div className="tt-spatial-empty"><strong>No room built yet.</strong><span>Create a blank scaled room or start from a Breeding, Hatchling, Medical, Brumation or Bioactive template.</span><button type="button" onClick={() => setShowBuilder(true)}>Build your first room</button></div>}

    {active && !showBuilder && <>
      <div className="tt-spatial-room-actions"><span>{active.objects.length} room object{active.objects.length === 1 ? "" : "s"}</span><button type="button" onClick={() => duplicateRoom(active.id)}>Duplicate room</button><button type="button" onClick={() => setShowBuilder(true)}>＋ Add another room</button><button type="button" onClick={() => deleteRoom(active.id)}>Remove room</button></div>
      <ReptileRoomSpatialCanvas room={active} onChange={handleRoomChange} onRemoveObject={removeObject} />
    </>}
  </section>;
}
