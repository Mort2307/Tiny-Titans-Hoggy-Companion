import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ReptileRoomSlot } from "../../services/reptileRoomService";
import { loadVivariumTwin, saveVivariumTwin } from "../../services/vivariumTwinService";
import { evaluateVivariumTwin } from "../../services/vivariumTwinIntelligence";
import { useAuth } from "../../context/useAuth";
import { DEFAULT_VIVARIUM_TWIN, type VivariumDigitalTwin, type VivariumTwinAsset, type VivariumTwinAsset["category"] } from "../../types/vivariumTwin";
import { REPTILE_ROOM_ASSETS } from "../../data/reptileRoomAssetCatalog";
import "../../styles/vivarium-builder-3d.css";

type Props = {
  slot: ReptileRoomSlot;
  onClose: () => void;
  onSaved?: (twin: VivariumDigitalTwin) => void;
};

const cloneTwin = (twin: VivariumDigitalTwin): VivariumDigitalTwin => JSON.parse(JSON.stringify(twin)) as VivariumDigitalTwin;
const nextId = () => `vt-${crypto.randomUUID()}`;

const quickOptions = [
  { key: "hideCount", label: "Hides", min: 0, max: 8 },
  { key: "waterBowlCount", label: "Water bowls", min: 0, max: 3 },
  { key: "enrichmentCount", label: "Enrichment pieces", min: 0, max: 12 },
  { key: "plantCount", label: "Plants", min: 0, max: 8 },
  { key: "corkCount", label: "Cork pieces", min: 0, max: 8 },
  { key: "branchCount", label: "Branches", min: 0, max: 8 },
] as const;

function EnclosurePreview({ slot, twin }: { slot: ReptileRoomSlot; twin: VivariumDigitalTwin }) {
  const width = Math.max(1, slot.w) / 50;
  const depth = Math.max(1, slot.depth ?? slot.h) / 50;
  const height = Math.max(1, slot.height ?? 45) / 50;
  const hides = Math.min(twin.checklist.hideCount, 5);
  const water = Math.min(twin.checklist.waterBowlCount, 2);
  const branches = Math.min(twin.checklist.branchCount, 3);
  const substrateDepth = Math.min(0.12, Math.max(0, (twin.checklist.substrateDepthMm ?? 0) / 1000));

  return (
    <div className="vtb-preview">
      <Canvas camera={{ position: [width * 1.45, height * 0.95, depth * 1.55], fov: 48 }}>
        <ambientLight intensity={1.15} />
        <directionalLight position={[2, 4, 3]} intensity={1.8} />
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#292f33" transparent opacity={0.28} roughness={0.22} metalness={0.25} />
        </mesh>
        <mesh position={[0, substrateDepth / 2, 0]}>
          <boxGeometry args={[width * 0.94, substrateDepth, depth * 0.94]} />
          <meshStandardMaterial color="#76573a" roughness={1} />
        </mesh>
        {Array.from({ length: hides }).map((_, index) => {
          const x = -width * 0.36 + (index % 2) * width * 0.62;
          const z = -depth * 0.27 + Math.floor(index / 2) * depth * 0.25;
          return (
            <mesh key={`hide-${index}`} position={[x, 0.12, z]}>
              <sphereGeometry args={[Math.min(width, depth) * 0.15, 20, 14]} />
              <meshStandardMaterial color="#5d4939" roughness={0.96} />
            </mesh>
          );
        })}
        {Array.from({ length: water }).map((_, index) => (
          <mesh key={`water-${index}`} position={[width * 0.3, 0.09, -depth * 0.2 + index * depth * 0.42]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[Math.min(width, depth) * 0.13, Math.min(width, depth) * 0.16, 0.06, 24]} />
            <meshStandardMaterial color="#56636a" roughness={0.3} metalness={0.12} />
          </mesh>
        ))}
        {Array.from({ length: branches }).map((_, index) => (
          <mesh key={`branch-${index}`} position={[-width * 0.15, 0.38 + index * 0.09, depth * 0.12 * (index - 1)]} rotation={[0.2, 0.25 * index, -0.45 + index * 0.2]}>
            <cylinderGeometry args={[0.045, 0.07, width * 0.72, 10]} />
            <meshStandardMaterial color="#69472f" roughness={1} />
          </mesh>
        ))}
        <OrbitControls enablePan={false} minDistance={0.7} maxDistance={4.4} />
      </Canvas>
      {twin.photoUrl && <img className="vtb-photo" src={twin.photoUrl} alt="Real enclosure reference" />}
    </div>
  );
}

export function VivariumBuilder3D({ slot, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [twin, setTwin] = useState<VivariumDigitalTwin>(() => cloneTwin(DEFAULT_VIVARIUM_TWIN));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"checklist" | "props" | "intelligence">("checklist");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void loadVivariumTwin(user.uid, slot.id)
      .then((loaded) => { if (!cancelled) setTwin({ ...cloneTwin(loaded), photoUrl: loaded.photoUrl ?? slot.photoUrl ?? "" }); })
      .catch((error) => { if (!cancelled) setMessage(error instanceof Error ? error.message : "Unable to load enclosure builder."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slot.id, slot.photoUrl, user]);

  const intelligence = useMemo(() => evaluateVivariumTwin(twin), [twin]);

  const patchChecklist = <K extends keyof VivariumDigitalTwin["checklist"]>(key: K, value: VivariumDigitalTwin["checklist"][K]) => {
    setTwin((current) => ({ ...current, checklist: { ...current.checklist, [key]: value } }));
  };

  const toggleMonitoring = (value: "thermometer" | "hygrometer" | "temp-humidity") => {
    setTwin((current) => {
      const exists = current.checklist.monitoring.includes(value);
      return { ...current, checklist: { ...current.checklist, monitoring: exists ? current.checklist.monitoring.filter((item) => item !== value) : [...current.checklist.monitoring, value] } };
    });
  };

  const addProp = (asset: typeof REPTILE_ROOM_ASSETS[number]) => {
    const category: VivariumTwinAsset["category"] = asset.intelligenceRole === "heating" || asset.intelligenceRole === "thermostat" ? "heating" : asset.intelligenceRole === "lighting" ? "lighting" : asset.intelligenceRole === "sensor" ? "monitoring" : asset.intelligenceRole === "water" ? "water" : asset.intelligenceRole === "enrichment" ? "enrichment" : "other";
    const placement: VivariumTwinAsset["placement"] = category === "heating" || category === "monitoring" ? "wall" : category === "lighting" ? "ceiling" : "floor";
    const next: VivariumTwinAsset = { id: nextId(), assetId: asset.assetId ?? asset.kind, label: asset.label, category, placement, x: 0, y: 0.02, z: 0, rotationY: 0, lockedToVivarium: true, config: asset.config ?? {} };
    setTwin((current) => ({ ...current, assets: [...current.assets, next] }));
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      const next = { ...twin, photoUrl: twin.photoUrl || slot.photoUrl || "", representationMode: twin.photoUrl || slot.photoUrl ? twin.representationMode === "manual" ? "hybrid" : twin.representationMode : "manual", intelligence } as VivariumDigitalTwin;
      await saveVivariumTwin(user.uid, slot.id, next);
      const saved = { ...next, intelligence, updatedAt: new Date().toISOString() };
      setTwin(saved);
      onSaved?.(saved);
      setMessage("Enclosure twin saved. All props remain attached to this vivarium.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save enclosure twin.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="vtb-backdrop"><div className="vtb-shell"><div className="vtb-loading">Loading enclosure builder…</div></div></div>;

  return (
    <div className="vtb-backdrop" role="dialog" aria-modal="true" aria-label="Vivarium builder">
      <div className="vtb-shell">
        <header className="vtb-header">
          <div><div className="vtb-kicker">ENCLOSURE DIGITAL TWIN</div><h2>{slot.label || "Vivarium"}</h2><p>{slot.snakeId ? "Structured enclosure profile for intelligent husbandry." : "Build the enclosure before linking a snake."}</p></div>
          <button className="vtb-close" type="button" onClick={onClose}>×</button>
        </header>
        <div className="vtb-body">
          <section className="vtb-scene">
            <EnclosurePreview slot={slot} twin={twin} />
            <div className="vtb-scene-note">Every prop in this builder is enclosure-owned and moves with the vivarium.</div>
          </section>
          <aside className="vtb-panel">
            <div className="vtb-tabs">
              <button type="button" className={tab === "checklist" ? "active" : ""} onClick={() => setTab("checklist")}>Checklist</button>
              <button type="button" className={tab === "props" ? "active" : ""} onClick={() => setTab("props")}>Add props</button>
              <button type="button" className={tab === "intelligence" ? "active" : ""} onClick={() => setTab("intelligence")}>Intelligence</button>
            </div>

            {tab === "checklist" && <div className="vtb-scroll">
              <div className="vtb-card"><h3>Core enclosure</h3>
                <div className="vtb-row"><span>Substrate</span><select value={twin.checklist.substrateType} onChange={(e) => patchChecklist("substrateType", e.target.value as typeof twin.checklist.substrateType)}><option value="">Not recorded</option><option value="aspen">Aspen</option><option value="bio">Bio substrate</option><option value="coco">Coco</option><option value="sand">Sand</option><option value="soil">Soil</option><option value="paper">Paper</option><option value="lignocel">Lignocel</option><option value="mixed">Mixed</option><option value="other">Other</option></select></div>
                <div className="vtb-row"><span>Substrate depth (mm)</span><input type="number" min="0" max="250" value={twin.checklist.substrateDepthMm ?? 0} onChange={(e) => patchChecklist("substrateDepthMm", Math.max(0, Number(e.target.value) || 0))} /></div>
                <div className="vtb-row"><span>Heating</span><select value={twin.checklist.heatingType} onChange={(e) => patchChecklist("heatingType", e.target.value as typeof twin.checklist.heatingType)}><option value="">Not recorded</option><option value="heat-mat">Heat mat</option><option value="che">CHE</option><option value="halogen">Halogen</option><option value="dhp">DHP</option><option value="rhp">RHP</option><option value="other">Other</option></select></div>
                <div className="vtb-row"><span>Heating devices</span><input type="number" min="0" max="4" value={twin.checklist.heatingDeviceCount} onChange={(e) => patchChecklist("heatingDeviceCount", Math.max(0, Number(e.target.value) || 0))} /></div>
                <label className="vtb-check"><input type="checkbox" checked={twin.checklist.thermostatPresent} onChange={(e) => patchChecklist("thermostatPresent", e.target.checked)} /> Thermostat fitted</label>
                {twin.checklist.thermostatPresent && <div className="vtb-row"><span>Target °C</span><input type="number" step="0.1" value={twin.checklist.thermostatTargetC ?? 30} onChange={(e) => patchChecklist("thermostatTargetC", Number(e.target.value) || 0)} /></div>}
                <div className="vtb-row"><span>Lighting</span><select value={twin.checklist.lightingType} onChange={(e) => patchChecklist("lightingType", e.target.value as typeof twin.checklist.lightingType)}><option value="none">None recorded</option><option value="led">LED</option><option value="uvb">UVB</option><option value="basking">Basking</option><option value="halogen">Halogen</option><option value="mixed">Mixed</option><option value="other">Other</option></select></div>
                <div className="vtb-monitoring"><strong>Monitoring</strong>{(["thermometer", "hygrometer", "temp-humidity"] as const).map((item) => <label key={item}><input type="checkbox" checked={twin.checklist.monitoring.includes(item)} onChange={() => toggleMonitoring(item)} /> {item === "temp-humidity" ? "Temperature + humidity" : item[0].toUpperCase() + item.slice(1)}</label>)}</div>
              </div>
              <div className="vtb-card"><h3>Keeper contents</h3>{quickOptions.map((option) => <div className="vtb-row" key={option.key}><span>{option.label}</span><input type="number" min={option.min} max={option.max} value={twin.checklist[option.key]} onChange={(e) => patchChecklist(option.key, Math.max(option.min, Math.min(option.max, Number(e.target.value) || 0)))} /></div>)}
                <label className="vtb-check"><input type="checkbox" checked={twin.checklist.cleaningStationPresent} onChange={(e) => patchChecklist("cleaningStationPresent", e.target.checked)} /> Cleaning station recorded</label>
                <label className="vtb-check"><input type="checkbox" checked={twin.checklist.scalePresent} onChange={(e) => patchChecklist("scalePresent", e.target.checked)} /> Reptile scale recorded</label>
              </div>
            </div>}

            {tab === "props" && <div className="vtb-scroll"><div className="vtb-card"><h3>Place physical props</h3><p>Props snap to enclosure surfaces and are permanently local to this vivarium until removed.</p><div className="vtb-prop-grid">{REPTILE_ROOM_ASSETS.filter((asset) => asset.kind !== "vivarium").map((asset) => <button type="button" key={asset.assetId ?? asset.kind} onClick={() => addProp(asset)}><b>{asset.icon ?? "•"}</b><span>{asset.label}</span></button>)}</div></div><div className="vtb-card"><h3>Placed in this vivarium</h3>{twin.assets.length === 0 ? <p className="vtb-muted">Nothing placed yet.</p> : twin.assets.map((asset) => <div className="vtb-placed" key={asset.id}><span>{asset.label}</span><button type="button" onClick={() => setTwin((current) => ({ ...current, assets: current.assets.filter((item) => item.id !== asset.id) }))}>Remove</button></div>)}</div></div>}

            {tab === "intelligence" && <div className="vtb-scroll"><div className="vtb-score"><span>Enclosure completeness</span><strong>{intelligence.completenessScore}%</strong></div><div className="vtb-card"><h3>What the keeper has recorded</h3><p>The intelligence engine uses the structured checklist, not guesses from the photograph.</p><ul>{[twin.checklist.substrateType && `Substrate: ${twin.checklist.substrateType}`, twin.checklist.heatingType && `Heating: ${twin.checklist.heatingType}`, twin.checklist.thermostatPresent && "Thermostat present", twin.checklist.hideCount > 0 && `${twin.checklist.hideCount} hide(s)`, twin.checklist.waterBowlCount > 0 && `${twin.checklist.waterBowlCount} water bowl(s)`, twin.assets.length > 0 && `${twin.assets.length} 3D prop(s) attached`].filter(Boolean).map((item) => <li key={item as string}>{item}</li>)}</ul></div>{intelligence.missing.length > 0 && <div className="vtb-card vtb-warning"><h3>Not yet recorded</h3><ul>{intelligence.missing.map((item) => <li key={item}>{item}</li>)}</ul></div>}{intelligence.warnings.length > 0 && <div className="vtb-card vtb-note"><h3>Keeper notes</h3><ul>{intelligence.warnings.map((item) => <li key={item}>{item}</li>)}</ul></div>}</div>}
          </aside>
        </div>
        <footer className="vtb-footer"><div className="vtb-save-status" role="status">{message || `${twin.assets.length} attached prop(s) · checklist ${intelligence.completenessScore}% complete`}</div><div><button className="vtb-cancel" type="button" onClick={onClose}>Close</button><button className="vtb-save" type="button" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save enclosure"}</button></div></footer>
      </div>
    </div>
  );
}
