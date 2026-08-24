import { useMemo, useState } from "react";
import { ROOM_TEMPLATES, rackCapacity, rackDimensions, type RackSpec, type RoomTemplateId, type SpatialRoom, type SpatialUnit } from "../types/ReptileRoomSpatial";
import { createAndSaveSpatialRoom } from "../services/reptileRoomSpatialService";

type Props = { uid: string; onCreated?: (room: SpatialRoom) => void };

const units: SpatialUnit[] = ["mm", "cm", "m", "in", "ft"];

export default function ReptileRoomSpatialBuilder({ uid, onCreated }: Props) {
  const [template, setTemplate] = useState<RoomTemplateId>("blank");
  const [name, setName] = useState("My Reptile Room");
  const [width, setWidth] = useState(4);
  const [depth, setDepth] = useState(3);
  const [unit, setUnit] = useState<SpatialUnit>("m");
  const [rackMode, setRackMode] = useState(false);
  const [across, setAcross] = useState(5);
  const [down, setDown] = useState(6);
  const [levels, setLevels] = useState(5);
  const [tubWidth, setTubWidth] = useState(30);
  const [tubDepth, setTubDepth] = useState(45);
  const [tubHeight, setTubHeight] = useState(15);
  const [tubUnit, setTubUnit] = useState<SpatialUnit>("cm");

  const templateDefinition = useMemo(() => ROOM_TEMPLATES.find((item) => item.id === template) ?? ROOM_TEMPLATES[0], [template]);
  const rackSpec: RackSpec = { tubsAcross: across, tubsDown: down, levels, tubDimensions: { width: tubWidth, depth: tubDepth, height: tubHeight, unit: tubUnit }, calculateFrameFromTubs: true };
  const capacity = rackCapacity(rackSpec);
  const rack = rackDimensions(rackSpec);

  function applyTemplate(next: RoomTemplateId) {
    const selected = ROOM_TEMPLATES.find((item) => item.id === next) ?? ROOM_TEMPLATES[0];
    setTemplate(next);
    setWidth(selected.suggestedDimensions.width);
    setDepth(selected.suggestedDimensions.depth);
    setUnit(selected.suggestedDimensions.unit);
    if (name === "My Reptile Room") setName(selected.name);
  }

  function createRoom() {
    const room = createAndSaveSpatialRoom(name.trim() || "My Reptile Room", template);
    const updated: SpatialRoom = { ...room, dimensions: { width, depth, height: room.dimensions.height, unit }, walls: room.walls.map((wall) => ({ ...wall, length: wall.position === "north" || wall.position === "south" ? width : depth, height: room.dimensions.height, unit })) };
    if (rackMode) updated.objects = [...updated.objects, { id: `rack-${Date.now()}`, kind: "rack", label: `${capacity}-tub rack`, dimensions: rack, position: { x: 0.2, y: 0.2, unit: rack.unit }, metadata: { tubsAcross: across, tubsDown: down, levels, capacity, autoSized: true } }];
    try { localStorage.setItem("tinyTitans.reptileRooms.v1", JSON.stringify([...JSON.parse(localStorage.getItem("tinyTitans.reptileRooms.v1") || "[]").filter((item: SpatialRoom) => item.id !== room.id), updated])); } catch { /* optional local layout */ }
    onCreated?.(updated);
  }

  return <section className="tt-spatial-builder" aria-label="Build reptile room">
    <header><h2>Build your reptile room</h2><p>Set the real dimensions first. Tiny Titans handles the scale.</p></header>
    <div className="tt-spatial-template-grid">{ROOM_TEMPLATES.map((item) => <button key={item.id} type="button" aria-pressed={template === item.id} onClick={() => applyTemplate(item.id)}><strong>{item.name}</strong><span>{item.description}</span></button>)}</div>
    <div className="tt-spatial-form">
      <label>Room name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Width<input type="number" min="0.1" step="0.01" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
      <label>Depth<input type="number" min="0.1" step="0.01" value={depth} onChange={(event) => setDepth(Number(event.target.value))} /></label>
      <label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value as SpatialUnit)}>{units.map((item) => <option key={item}>{item}</option>)}</select></label>
    </div>
    <button type="button" onClick={() => setRackMode((value) => !value)} aria-expanded={rackMode}>+ Add a rack</button>
    {rackMode && <div className="tt-spatial-rack-builder">
      <h3>Rack builder</h3><p>Tell us the layout and tub size — the rack is dimensioned from the maths.</p>
      <div className="tt-spatial-form">
        <label>Tubs across<input type="number" min="1" value={across} onChange={(event) => setAcross(Math.max(1, Number(event.target.value)))} /></label>
        <label>Tubs down<input type="number" min="1" value={down} onChange={(event) => setDown(Math.max(1, Number(event.target.value)))} /></label>
        <label>Levels<input type="number" min="1" value={levels} onChange={(event) => setLevels(Math.max(1, Number(event.target.value)))} /></label>
        <label>Tub width<input type="number" min="1" value={tubWidth} onChange={(event) => setTubWidth(Math.max(1, Number(event.target.value)))} /></label>
        <label>Tub depth<input type="number" min="1" value={tubDepth} onChange={(event) => setTubDepth(Math.max(1, Number(event.target.value)))} /></label>
        <label>Tub height<input type="number" min="1" value={tubHeight} onChange={(event) => setTubHeight(Math.max(1, Number(event.target.value)))} /></label>
        <label>Tub unit<select value={tubUnit} onChange={(event) => setTubUnit(event.target.value as SpatialUnit)}>{units.map((item) => <option key={item}>{item}</option>)}</select></label>
      </div>
      <div className="tt-spatial-rack-result"><strong>{capacity} tubs</strong><span>Estimated rack footprint: {rack.width} × {rack.depth} × {rack.height} {rack.unit}</span></div>
    </div>}
    <button className="tt-primary-action" type="button" onClick={createRoom}>Build room</button>
    <small>{templateDefinition.name} · {width} × {depth} {unit} · local-first spatial layout</small>
  </section>;
}
