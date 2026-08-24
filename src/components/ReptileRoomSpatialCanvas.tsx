import { useMemo, useState } from "react";
import type { Dimension3D, SpatialObject, SpatialRoom, SpatialUnit } from "../types/ReptileRoomSpatial";
import { convertDimension, formatDimension, toMillimetres } from "../types/ReptileRoomSpatial";
import "../styles/reptile-room-spatial.css";

type Props = {
  room: SpatialRoom;
  onChange?: (room: SpatialRoom) => void;
  onRemoveObject?: (objectId: string) => void;
};

const DISPLAY_UNIT: SpatialUnit = "m";
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 2.4;

function toDisplay(value: number, unit: SpatialUnit): number {
  return convertDimension(value, unit, DISPLAY_UNIT);
}

function objectStyle(room: SpatialRoom, object: SpatialObject, zoom: number): React.CSSProperties {
  const roomWidth = Math.max(1, toDisplay(room.dimensions.width, room.dimensions.unit));
  const roomDepth = Math.max(1, toDisplay(room.dimensions.depth, room.dimensions.unit));
  const x = toDisplay(object.position.x, object.position.unit);
  const y = toDisplay(object.position.y, object.position.unit);
  const width = toDisplay(object.dimensions.width, object.dimensions.unit);
  const depth = toDisplay(object.dimensions.depth, object.dimensions.unit);
  return {
    left: `${(x / roomWidth) * 100}%`,
    top: `${(y / roomDepth) * 100}%`,
    width: `${Math.max(2.5, (width / roomWidth) * 100)}%`,
    height: `${Math.max(4, (depth / roomDepth) * 100)}%`,
    transform: `scale(${zoom})`,
  };
}

function dimensionText(dimensions: Dimension3D): string {
  return `${formatDimension(dimensions.width, dimensions.unit)} × ${formatDimension(dimensions.depth, dimensions.unit)} × ${formatDimension(dimensions.height, dimensions.unit)}`;
}

export default function ReptileRoomSpatialCanvas({ room, onChange, onRemoveObject }: Props) {
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(room.objects[0]?.id ?? null);
  const [showGrid, setShowGrid] = useState(true);

  const selected = room.objects.find((object) => object.id === selectedId) ?? null;
  const roomArea = useMemo(() => {
    const width = toMillimetres(room.dimensions.width, room.dimensions.unit) / 1_000_000;
    const depth = toMillimetres(room.dimensions.depth, room.dimensions.unit) / 1_000_000;
    return width * depth;
  }, [room.dimensions]);

  function updateSelected(patch: Partial<SpatialObject>) {
    if (!selected) return;
    onChange?.({
      ...room,
      updatedAt: new Date().toISOString(),
      objects: room.objects.map((object) => object.id === selected.id ? { ...object, ...patch } : object),
    });
  }

  return <section className="tt-spatial-canvas-shell" aria-label={`${room.name} scaled room editor`}>
    <header className="tt-spatial-canvas-toolbar">
      <div>
        <strong>{room.name}</strong>
        <span>{formatDimension(room.dimensions.width, room.dimensions.unit)} × {formatDimension(room.dimensions.depth, room.dimensions.unit)} · {roomArea.toFixed(2)} m²</span>
      </div>
      <div className="tt-spatial-canvas-actions">
        <button type="button" onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Hide grid" : "Show grid"}</button>
        <button type="button" onClick={() => setZoom((value) => Math.max(MIN_ZOOM, Number((value - 0.15).toFixed(2))))}>−</button>
        <output aria-label="Canvas zoom">{Math.round(zoom * 100)}%</output>
        <button type="button" onClick={() => setZoom((value) => Math.min(MAX_ZOOM, Number((value + 0.15).toFixed(2))))}>+</button>
      </div>
    </header>

    <div className={`tt-spatial-canvas${showGrid ? " is-gridded" : ""}`}>
      <div className="tt-spatial-room-plane">
        {room.objects.map((object) => <button
          key={object.id}
          type="button"
          className={`tt-spatial-object tt-object-${object.kind}${selectedId === object.id ? " is-selected" : ""}`}
          style={objectStyle(room, object, zoom)}
          onClick={() => setSelectedId(object.id)}
          aria-label={`${object.label}, ${dimensionText(object.dimensions)}`}
        >
          <strong>{object.label}</strong>
          <span>{formatDimension(object.dimensions.width, object.dimensions.unit)} × {formatDimension(object.dimensions.depth, object.dimensions.unit)}</span>
        </button>)}
        <span className="tt-spatial-scale-label tt-scale-top">{formatDimension(room.dimensions.width, room.dimensions.unit)}</span>
        <span className="tt-spatial-scale-label tt-scale-side">{formatDimension(room.dimensions.depth, room.dimensions.unit)}</span>
      </div>
    </div>

    <aside className="tt-spatial-inspector" aria-label="Selected room object">
      {!selected ? <div className="tt-spatial-inspector-empty"><strong>Select something</strong><span>Click a vivarium, rack, shelf or workbench to inspect its real dimensions.</span></div> : <>
        <div className="tt-spatial-inspector-heading"><div><span>{selected.kind}</span><h3>{selected.label}</h3></div><button type="button" onClick={() => onRemoveObject?.(selected.id)}>Remove</button></div>
        <div className="tt-spatial-dimension-grid">
          <label>Width<input type="number" min="0.01" step="0.01" value={selected.dimensions.width} onChange={(event) => updateSelected({ dimensions: { ...selected.dimensions, width: Number(event.target.value) } })} /></label>
          <label>Depth<input type="number" min="0.01" step="0.01" value={selected.dimensions.depth} onChange={(event) => updateSelected({ dimensions: { ...selected.dimensions, depth: Number(event.target.value) } })} /></label>
          <label>Height<input type="number" min="0.01" step="0.01" value={selected.dimensions.height} onChange={(event) => updateSelected({ dimensions: { ...selected.dimensions, height: Number(event.target.value) } })} /></label>
          <label>Unit<select value={selected.dimensions.unit} onChange={(event) => updateSelected({ dimensions: { ...selected.dimensions, unit: event.target.value as SpatialUnit } })}><option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option><option value="in">in</option><option value="ft">ft</option></select></label>
        </div>
        <p className="tt-spatial-inspector-readout">Physical size: <strong>{dimensionText(selected.dimensions)}</strong></p>
      </>}
    </aside>
  </section>;
}
