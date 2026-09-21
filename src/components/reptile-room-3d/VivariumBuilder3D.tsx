import type { ReptileRoomSlot } from "../../services/reptileRoomService";
import type { VivariumDigitalTwin } from "../../types/vivariumTwin";
import { useVivariumBuilder3D } from "../../hooks/useVivariumBuilder3D";
import VivariumBuildPanel from "./VivariumBuildPanel";
import VivariumChecklistPanel from "./VivariumChecklistPanel";
import VivariumIntelligencePanel from "./VivariumIntelligencePanel";
import VivariumScene3D from "./VivariumScene3D";
import "../../styles/vivarium-builder-3d.css";

type Props = {
  slot: ReptileRoomSlot;
  onClose: () => void;
  onSaved?: (twin: VivariumDigitalTwin) => void;
};

export function VivariumBuilder3D({ slot, onClose, onSaved }: Props) {
  const {
    user, twin, loading, saving, tab, setTab, selectedId, setSelectedId, message,
    intelligence, selectedAsset, selectedPreset, patchChecklist, addProp,
    mutateSelected, rotateSelected, removeSelected, loadExisting, save, assets,
  } = useVivariumBuilder3D(slot, onSaved);

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
            <button type="button" className="vtb-secondary" onClick={() => void loadExisting()} disabled={loading}>
              {loading ? "Loading..." : "Reload"}
            </button>
            <button type="button" className="vtb-close" onClick={onClose} aria-label="Close">X</button>
          </div>
        </header>

        <div className="vtb-body">
          <section className="vtb-scene">
            <div className="vtb-scene-toolbar"><span>3D enclosure</span><span>{twin.assets.length} attached props</span></div>
            <div className="vtb-preview">
              <VivariumScene3D slot={slot} twin={twin} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
            {twin.photoUrl && <div className="vtb-photo-reference"><span>Real photo reference</span><img src={twin.photoUrl} alt="Real vivarium reference" /></div>}
          </section>

          <aside className="vtb-panel">
            <div className="vtb-tabs">
              <button type="button" className={tab === "build" ? "active" : ""} onClick={() => setTab("build")}>Build</button>
              <button type="button" className={tab === "checklist" ? "active" : ""} onClick={() => setTab("checklist")}>Husbandry</button>
              <button type="button" className={tab === "intelligence" ? "active" : ""} onClick={() => setTab("intelligence")}>Intelligence</button>
            </div>

            {tab === "build" && (
              <VivariumBuildPanel
                assets={assets}
                selectedAsset={selectedAsset}
                selectedPreset={selectedPreset}
                onAdd={addProp}
                onMove={mutateSelected}
                onRotate={rotateSelected}
                onRemove={removeSelected}
              />
            )}

            {tab === "checklist" && <VivariumChecklistPanel twin={twin} onPatch={patchChecklist} />}

            {tab === "intelligence" && (
              <VivariumIntelligencePanel
                twin={twin}
                intelligence={intelligence}
                linked={Boolean(user && slot.snakeId)}
              />
            )}
          </aside>
        </div>

        <footer className="vtb-footer">
          <span className="vtb-message">{message}</span>
          <div>
            <button type="button" className="vtb-secondary" onClick={onClose}>Cancel</button>
            <button type="button" className="vtb-save" onClick={() => void save()} disabled={saving || !user}>
              {saving ? "Saving..." : "Save digital twin"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
