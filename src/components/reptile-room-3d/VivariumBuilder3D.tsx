import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ReptileRoomSlot } from "../../services/reptileRoomService";
import { saveVivariumTwin, loadVivariumTwin } from "../../services/vivariumTwinService";
import { evaluateVivariumTwin } from "../../services/vivariumTwinIntelligence";
import { useAuth } from "../../context/useAuth";
import { DEFAULT_VIVARIUM_TWIN, type VivariumDigitalTwin, type VivariumTwinAsset } from "../../types/vivariumTwin";
import { getRoomAssetPreset, REPTILE_ROOM_ASSETS } from "../../data/reptileRoomAssetCatalog";
import "../../styles/vivarium-builder-3d.css";

type Props = {
  slot: ReptileRoomSlot;
  onClose: () => void;
  onSaved?: (twin: VivariumDigitalTwin) => void;
};

const cloneTwin = (value: VivariumDigitalTwin): VivariumDigitalTwin => JSON.parse(JSON.stringify(value)) as VivariumDigitalTwin;
const newId = () => `vt-${crypto.randomUUID()}`;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function categoryForAsset(asset: (typeof REPTILE_ROOM_ASSETS)[number]): VivariumTwinAsset["category"] {
  switch (asset.intelligenceRole) {
    case "heating":
    case "thermostat": return "heating";
    case "lighting": return "lighting";
    case "sensor": return "monitoring";
    case "water": return "water";
    case "enrichment":
    case "cleaning":
    case "weighing": return "enrichment";
    default: return "other";
  }
}

function colorForKind(kind: string) {
  if (kind === "water-bowl" || kind === "hygrometer" || kind === "temp-humidity") return "#738c95";
  if (["thermostat", "thermometer", "smart-plug", "socket", "switched-socket", "power-strip", "timer"].includes(kind)) return "#3b4348";
  if (["heat-mat", "rhp", "che", "halogen", "dhp", "basking-light", "ceiling-light", "led-bar", "uvb"].includes(kind)) return "#6e5136";
  if (["plant"].includes(kind)) return "#58744f";
  if (["hide", "cork", "branch"].includes(kind)) return "#795536";
  if (kind === "scale") return "#d7d7d0";
  return "#6a4730";
}

function PropMesh({ asset, selected }: { asset: VivariumTwinAsset; selected: boolean }) {
  const preset = getRoomAssetPreset(asset.assetId);
  const width = Math.max(0.04, (preset?.width ?? 20) / 100);
  const depth = Math.max(0.04, (preset?.depth ?? 20) / 100);
  const height = Math.max(0.02, (preset?.height ?? 10) / 100);
  const color = colorForKind(preset?.kind ?? "other");
  const emission = selected ? 0.35 : 0;

  return (
    <group position={[asset.x, asset.y + height / 2, asset.z]} rotation={[0, asset.rotationY ?? 0, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.72} emissive="#efbd55" emissiveIntensity={emission} />
      </mesh>
      {preset?.kind === "water-bowl" && (
        <mesh position={[0, height * 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[Math.min(width, depth) * 0.27, Math.min(width, depth) * 0.08, 14, 24]} />
          <meshStandardMaterial color="#9eb8c1" roughness={0.22} metalness={0.15} />
        </mesh>
      )}
      {preset?.kind === "plant" && (
        <group>
          {Array.from({ length: 6 }).map((_, index) => {
            const angle = index * 1.05;
            return (
              <mesh key={index} position={[Math.cos(angle) * width * 0.32, height * 0.75, Math.sin(angle) * depth * 0.32]} rotation={[0.25, angle, 0.5]}>
                <planeGeometry args={[width * 0.45, height * 0.35]} />
                <meshStandardMaterial color="#58744f" side={2} roughness={0.95} />
              </mesh>
            );
          })}
        </group>
      )}
      {preset?.kind === "branch" && (
        <mesh rotation={[0.18, 0, -0.48]} castShadow>
          <cylinderGeometry args={[0.045, 0.075, Math.max(width, depth) * 1.5, 10]} />
          <meshStandardMaterial color="#67472e" roughness={1} />
        </mesh>
      )}
    </group>
  );
}

function VivariumScene({ slot, twin, selectedId, onSelect }: { slot: ReptileRoomSlot; twin: VivariumDigitalTwin; selectedId: string | null; onSelect: (id: string) => void }) {
  const width = Math.max(1, slot.w) / 100;
  const depth = Math.max(1, slot.depth ?? slot.h) / 100;
  const height = Math.max(1, slot.height ?? 40) / 100;
  const substrate = Math.min(height * 0.18, Math.max(0.02, (twin.checklist.substrateDepthMm ?? 20) / 1000));

  return (
    <Canvas camera={{ position: [width * 1.45, height * 0.9, depth * 1.55], fov: 44 }} shadows>
      <color attach="background" args={["#151a1d"]} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[2, 4, 3]} intensity={2.1} castShadow />
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <meshPhysicalMaterial color="#6e482e" transparent opacity={0.18} roughness={0.2} transmission={0.08} />
      </mesh>
      <mesh position={[0, substrate / 2, 0]}>
        <boxGeometry args={[width * 0.92, substrate, depth * 0.92]} />
        <meshStandardMaterial color="#76573a" roughness={1} />
      </mesh>
      {twin.assets.map((asset) => (
        <group key={asset.id} onClick={(event) => { event.stopPropagation(); onSelect(asset.id); }}>
          <PropMesh asset={asset} selected={selectedId === asset.id} />
        </group>
      ))}
      <gridHelper args={[Math.max(width, depth) * 1.25, 12, "#485157", "#293034"]} position={[0, 0.005, 0]} />
      <OrbitControls enablePan={false} minDistance={Math.min(width, depth) * 1.1} maxDistance={Math.max(width, height, depth) * 4.5} />
    </Canvas>
  );
}

export function VivariumBuilder3D({ slot, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [twin, setTwin] = useState<VivariumDigitalTwin>(() => cloneTwin(DEFAULT_VIVARIUM_TWIN));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"build" | "checklist" | "intelligence">("build");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const intelligence = useMemo(() => evaluateVivariumTwin(twin), [twin]);
  const selectedAsset = twin.assets.find((asset) => asset.id === selectedId) ?? null;
  const selectedPreset = selectedAsset ? getRoomAssetPreset(selectedAsset.assetId) : undefined;

  const patchChecklist = <K extends keyof VivariumDigitalTwin["checklist"]>(key: K, value: VivariumDigitalTwin["checklist"][K]) => setTwin((current) => ({ ...current, checklist: { ...current.checklist, [key]: value } }));

  const addProp = (asset: (typeof REPTILE_ROOM_ASSETS)[number]) => {
    const preset = asset;
    const i = twin.assets.length;
    const next: VivariumTwinAsset = {
      id: newId(),
      assetId: preset.assetId ?? preset.kind,
      label: preset.label,
      category: categoryForAsset(preset),
      placement: preset.intelligenceRole === "lighting" ? "ceiling" : ["thermostat", "sensor"].includes(preset.intelligenceRole ?? "") ? "wall" : "floor",
      x: clamp(-0.2 + (i % 5) * 0.1, -0.42, 0.42),
      y: preset.intelligenceRole === "lighting" ? Math.max(0.03, (slot.height ?? 40) / 100 - 0.12) : 0.03,
      z: clamp(-0.15 + (Math.floor(i / 5) % 4) * 0.1, -0.38, 0.38),
      rotationY: 0,
      lockedToVivarium: true,
      config: preset.config ? { ...preset.config } : {},
    };
    setTwin((current) => ({ ...current, assets: [...current.assets, next] }));
    setSelectedId(next.id);
    setMessage(`${preset.label} added to this vivarium.`);
  };

  const mutateSelected = (dx: number, dy: number, dz: number) => {
    if (!selectedAsset) return;
    setTwin((current) => ({
      ...current,
      assets: current.assets.map((asset) => asset.id === selectedAsset.id ? { ...asset, x: clamp(asset.x + dx, -0.46, 0.46), y: Math.max(0.01, asset.y + dy), z: clamp(asset.z + dz, -0.46, 0.46) } : asset),
    }));
  };

  const rotateSelected = (degrees: number) => {
    if (!selectedAsset) return;
    setTwin((current) => ({ ...current, assets: current.assets.map((asset) => asset.id === selectedAsset.id ? { ...asset, rotationY: (asset.rotationY ?? 0) + degrees * Math.PI / 180 } : asset) }));
  };

  const removeSelected = () => {
    if (!selectedAsset) return;
    setTwin((current) => ({ ...current, assets: current.assets.filter((asset) => asset.id !== selectedAsset.id) }));
    setSelectedId(null);
    setMessage(`${selectedAsset.label} removed.`);
  };

  const loadExisting = async () => {
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      const loaded = await loadVivariumTwin(user.uid, slot.id);
      setTwin({ ...cloneTwin(loaded), photoUrl: loaded.photoUrl ?? slot.photoUrl ?? "" });
      setMessage("Vivarium twin loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load vivarium twin.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setMessage("");
    try {
      const next = { ...twin, intelligence, updatedAt: new Date().toISOString(), photoUrl: twin.photoUrl || slot.photoUrl || "" } as VivariumDigitalTwin;
      await saveVivariumTwin(user.uid, slot.id, next);
      setTwin(next);
      setMessage("Vivarium digital twin saved.");
      onSaved?.(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save vivarium twin.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="vtb-backdrop" role="dialog" aria-modal="true" aria-label="3D vivarium editor">
      <div className="vtb-shell">
        <header className="vtb-header">
          <div>
            <div className="vtb-kicker">VIVARIUM DIGITAL TWIN</div>
            <h2>{slot.label || "Vivarium"}</h2>
            <p>{slot.snakeId ? "Build the enclosure and keep its husbandry intelligence attached to it." : "Build this enclosure before linking a snake."}</p>
          </div>
          <div className="vtb-header-actions">
            <button type="button" className="vtb-secondary" onClick={() => void loadExisting()} disabled={loading}>{loading ? "Loading..." : "Reload"}</button>
            <button type="button" className="vtb-close" onClick={onClose} aria-label="Close">X</button>
          </div>
        </header>

        <div className="vtb-body">
          <section className="vtb-scene">
            <div className="vtb-scene-toolbar"><span>3D enclosure</span><span>{twin.assets.length} attached props</span></div>
            <div className="vtb-preview"><VivariumScene slot={slot} twin={twin} selectedId={selectedId} onSelect={setSelectedId} /></div>
            {twin.photoUrl && <div className="vtb-photo-reference"><span>Real photo reference</span><img src={twin.photoUrl} alt="Real vivarium reference" /></div>}
          </section>

          <aside className="vtb-panel">
            <div className="vtb-tabs">
              <button type="button" className={tab === "build" ? "active" : ""} onClick={() => setTab("build")}>Build</button>
              <button type="button" className={tab === "checklist" ? "active" : ""} onClick={() => setTab("checklist")}>Husbandry</button>
              <button type="button" className={tab === "intelligence" ? "active" : ""} onClick={() => setTab("intelligence")}>Intelligence</button>
            </div>

            {tab === "build" && <div className="vtb-scroll">
              <div className="vtb-card"><h3>Add useful equipment</h3><p>Every prop is saved against this vivarium, not the room.</p><div className="vtb-prop-grid">
                {REPTILE_ROOM_ASSETS.filter((asset) => asset.kind !== "vivarium").map((asset) => <button type="button" key={asset.assetId ?? asset.kind} onClick={() => addProp(asset)}><b>{asset.icon ?? "•"}</b><span>{asset.label}</span></button>)}
              </div></div>
              <div className="vtb-card"><h3>Selected prop</h3>{selectedAsset ? <>
                <strong>{selectedAsset.label}</strong><div className="vtb-mini-meta">{selectedPreset?.description || selectedAsset.category}</div>
                <div className="vtb-nudge"><button type="button" onClick={() => mutateSelected(-0.05, 0, 0)}>L</button><button type="button" onClick={() => mutateSelected(0.05, 0, 0)}>R</button><button type="button" onClick={() => mutateSelected(0, 0, -0.05)}>F</button><button type="button" onClick={() => mutateSelected(0, 0, 0.05)}>B</button><button type="button" onClick={() => rotateSelected(-15)}>Rotate -</button><button type="button" onClick={() => rotateSelected(15)}>Rotate +</button></div>
                <div className="vtb-nudge"><button type="button" onClick={() => mutateSelected(0, -0.02, 0)}>Lower</button><button type="button" onClick={() => mutateSelected(0, 0.02, 0)}>Raise</button><button type="button" className="danger" onClick={removeSelected}>Remove</button></div>
              </> : <span className="vtb-muted">Select a prop in the 3D enclosure.</span>}</div>
            </div>}

            {tab === "checklist" && <div className="vtb-scroll">
              <div className="vtb-card"><h3>Core enclosure</h3>
                <label className="vtb-field"><span>Substrate</span><select value={twin.checklist.substrateType} onChange={(e) => patchChecklist("substrateType", e.target.value as typeof twin.checklist.substrateType)}><option value="">Not recorded</option><option value="aspen">Aspen</option><option value="bio">Bio substrate</option><option value="coco">Coco</option><option value="sand">Sand</option><option value="soil">Soil</option><option value="paper">Paper</option><option value="lignocel">Lignocel</option><option value="mixed">Mixed</option><option value="other">Other</option></select></label>
                <label className="vtb-field"><span>Substrate depth (mm)</span><input type="number" min="0" max="250" value={twin.checklist.substrateDepthMm ?? 0} onChange={(e) => patchChecklist("substrateDepthMm", Math.max(0, Number(e.target.value) || 0))} /></label>
                <label className="vtb-field"><span>Heating</span><select value={twin.checklist.heatingType} onChange={(e) => patchChecklist("heatingType", e.target.value as typeof twin.checklist.heatingType)}><option value="">Not recorded</option><option value="heat-mat">Heat mat</option><option value="che">CHE</option><option value="halogen">Halogen</option><option value="dhp">DHP</option><option value="rhp">RHP</option><option value="other">Other</option></select></label>
                <label className="vtb-field"><span>Heating devices</span><input type="number" min="0" max="4" value={twin.checklist.heatingDeviceCount} onChange={(e) => patchChecklist("heatingDeviceCount", Math.max(0, Number(e.target.value) || 0))} /></label>
                <label className="vtb-check"><input type="checkbox" checked={twin.checklist.thermostatPresent} onChange={(e) => patchChecklist("thermostatPresent", e.target.checked)} /> Thermostat fitted</label>
                <label className="vtb-field"><span>Lighting</span><select value={twin.checklist.lightingType} onChange={(e) => patchChecklist("lightingType", e.target.value as typeof twin.checklist.lightingType)}><option value="none">None recorded</option><option value="led">LED</option><option value="uvb">UVB</option><option value="basking">Basking</option><option value="halogen">Halogen</option><option value="mixed">Mixed</option><option value="other">Other</option></select></label>
                <div className="vtb-monitoring"><strong>Monitoring</strong>{(["thermometer", "hygrometer", "temp-humidity"] as const).map((item) => <label key={item}><input type="checkbox" checked={twin.checklist.monitoring.includes(item)} onChange={() => patchChecklist("monitoring", twin.checklist.monitoring.includes(item) ? twin.checklist.monitoring.filter((value) => value !== item) : [...twin.checklist.monitoring, item])} /> {item === "temp-humidity" ? "Temperature + humidity" : item.charAt(0).toUpperCase() + item.slice(1)}</label>)}</div>
              </div>
              <div className="vtb-card"><h3>Enclosure contents</h3>{(["hideCount", "waterBowlCount", "enrichmentCount", "plantCount", "corkCount", "branchCount"] as const).map((key) => <label className="vtb-field" key={key}><span>{key.replace(/Count$/, "").replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase())}</span><input type="number" min="0" max="12" value={twin.checklist[key]} onChange={(e) => patchChecklist(key, Math.max(0, Math.min(12, Number(e.target.value) || 0)))} /></label>)}</div>
            </div>}

            {tab === "intelligence" && <div className="vtb-scroll">
              <div className="vtb-score"><span>Completeness</span><strong>{intelligence.completenessScore}%</strong></div>
              <div className="vtb-card"><h3>Missing records</h3>{intelligence.missing.length ? intelligence.missing.map((item) => <div className="vtb-alert" key={item}>{item}</div>) : <div className="vtb-good">Core enclosure records are complete.</div>}</div>
              <div className="vtb-card"><h3>Warnings</h3>{intelligence.warnings.length ? intelligence.warnings.map((item) => <div className="vtb-warning" key={item}>{item}</div>) : <div className="vtb-good">No current enclosure warnings.</div>}</div>
              <div className="vtb-card"><h3>Linked intelligence</h3><div className="vtb-stat">{slot.snakeId ? "Linked snake" : "Unlinked enclosure"}</div><div className="vtb-stat">{twin.assets.filter((asset) => asset.category === "heating").length} heating assets</div><div className="vtb-stat">{twin.assets.filter((asset) => asset.category === "monitoring").length} monitoring assets</div><div className="vtb-stat">{twin.assets.filter((asset) => asset.category === "lighting").length} lighting assets</div></div>
            </div>}
          </aside>
        </div>

        <footer className="vtb-footer"><span className="vtb-message">{message}</span><div><button type="button" className="vtb-secondary" onClick={onClose}>Cancel</button><button type="button" className="vtb-save" onClick={() => void save()} disabled={saving}>{saving ? "Saving..." : "Save digital twin"}</button></div></footer>
      </div>
    </div>
  );
}
