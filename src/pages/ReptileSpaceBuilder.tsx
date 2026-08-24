import { useMemo, useState } from "react";
import { REPTILE_SPACE_TEMPLATES } from "../data/reptileSpaceTemplates";
import { fromMillimetres, formatMeasurement, toMillimetres } from "../services/spatialEngine";
import type { ReptileSpaceTemplate, SpatialUnit } from "../types/ReptileSpace";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/reptile-space-builder.css";

const UNITS: SpatialUnit[] = ["mm", "cm", "m", "in", "ft"];

export default function ReptileSpaceBuilder() {
  const [templateId, setTemplateId] = useState("scaled-room");
  const [unit, setUnit] = useState<SpatialUnit>("m");
  const [width, setWidth] = useState(3);
  const [depth, setDepth] = useState(2.5);
  const [height, setHeight] = useState(2.4);
  const [spaceName, setSpaceName] = useState("My Reptile Room");
  const template = useMemo<ReptileSpaceTemplate>(() => REPTILE_SPACE_TEMPLATES.find((item) => item.id === templateId) ?? REPTILE_SPACE_TEMPLATES[0], [templateId]);
  const templateDimensions = template.defaultDimensions;
  const objectCount = template.objects.length;
  const roomWidthMm = toMillimetres(width, unit);
  const roomDepthMm = toMillimetres(depth, unit);
  const roomHeightMm = toMillimetres(height, unit);
  const previewWidth = 720;
  const previewHeight = 420;
  const scale = Math.min((previewWidth - 48) / Math.max(roomWidthMm, 1), (previewHeight - 48) / Math.max(roomDepthMm, 1));

  function chooseTemplate(next: ReptileSpaceTemplate) {
    setTemplateId(next.id);
    setWidth(Number(fromMillimetres(next.defaultDimensions.width, unit).toFixed(2)));
    setDepth(Number(fromMillimetres(next.defaultDimensions.depth, unit).toFixed(2)));
    setHeight(Number(fromMillimetres(next.defaultDimensions.height, unit).toFixed(2)));
  }

  return (
    <main className="reptile-space-builder page-container">
      <BackHomeButton />
      <header className="space-builder-header">
        <div>
          <span className="space-builder-eyebrow">TINY TITANS · SPATIAL SYSTEM</span>
          <h1>🏠 Build Your Reptile Space</h1>
          <p>Start blank, use a keeper preset, or build a true-to-scale room from your real dimensions.</p>
        </div>
      </header>

      <section className="space-builder-grid">
        <div className="space-builder-panel">
          <h2>1. Choose a starting point</h2>
          <div className="space-template-grid">
            {REPTILE_SPACE_TEMPLATES.map((item) => (
              <button type="button" key={item.id} className={`space-template-card ${templateId === item.id ? "selected" : ""}`} onClick={() => chooseTemplate(item)}>
                <span className="space-template-icon">{item.icon}</span>
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="space-builder-panel">
          <h2>2. Make it yours</h2>
          <label>Space name<input value={spaceName} onChange={(event) => setSpaceName(event.target.value)} /></label>
          <div className="space-dimension-row">
            <label>Width<input type="number" min="0.01" step="0.01" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></label>
            <label>Depth<input type="number" min="0.01" step="0.01" value={depth} onChange={(event) => setDepth(Number(event.target.value))} /></label>
            <label>Height<input type="number" min="0.01" step="0.01" value={height} onChange={(event) => setHeight(Number(event.target.value))} /></label>
            <label>Unit<select value={unit} onChange={(event) => setUnit(event.target.value as SpatialUnit)}>{UNITS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
          <div className="space-builder-summary">
            <strong>{spaceName || "Unnamed space"}</strong>
            <span>{formatMeasurement(roomWidthMm, unit)} × {formatMeasurement(roomDepthMm, unit)} × {formatMeasurement(roomHeightMm, unit)}</span>
            <span>{objectCount} starter object{objectCount === 1 ? "" : "s"} from {template.name}</span>
          </div>
        </div>
      </section>

      <section className="space-builder-panel space-preview-panel">
        <div className="space-preview-heading">
          <div><h2>3. True-scale preview</h2><p>Every object is stored in millimetres internally. The preview simply scales that geometry to your screen.</p></div>
          <span className="space-scale-badge">{Math.round(scale * 1000) / 1000}px / mm</span>
        </div>
        <div className="space-preview" aria-label="Scaled reptile room preview">
          <div className="space-floor" style={{ width: Math.max(80, roomWidthMm * scale), height: Math.max(80, roomDepthMm * scale) }}>
            {template.objects.map((item, index) => {
              const left = item.position.x * scale;
              const top = item.position.y * scale;
              const objectWidth = Math.max(18, item.dimensions.width * scale);
              const objectDepth = Math.max(14, item.dimensions.depth * scale);
              return <div key={`${item.name}-${index}`} className={`space-preview-object kind-${item.kind}`} title={`${item.name}: ${item.dimensions.width} × ${item.dimensions.depth} × ${item.dimensions.height}mm`} style={{ left, top, width: objectWidth, height: objectDepth }}>{item.kind === "rack" ? "🗄️" : item.kind === "vivarium" ? "🐍" : item.kind === "workbench" ? "🧰" : "📦"}</div>;
            })}
          </div>
        </div>
      </section>

      <section className="space-builder-panel space-builder-next">
        <div><span className="space-builder-eyebrow">NEXT</span><h2>Then build it properly</h2><p>The next layer turns this into the full room editor: swipe between rooms, add/remove vivariums, build racks from tub counts or dimensions, place doors/windows/walls, move objects, and keep everything synced without a Cloud Function.</p></div>
        <div className="space-builder-next-list"><span>✓ Multiple rooms</span><span>✓ Normal vivariums</span><span>✓ Rack builder</span><span>✓ True-scale walls</span><span>✓ Move/remove without deleting records</span><span>✓ Mobile + desktop geometry</span></div>
      </section>
    </main>
  );
}
