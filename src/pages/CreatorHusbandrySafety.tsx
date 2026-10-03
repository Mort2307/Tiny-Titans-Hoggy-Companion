import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { useAuth } from "../context/useAuth";
import { UNIVERSAL_SPECIES, UNIVERSAL_SPECIES_BY_ID } from "../data/species/universalSpeciesRegistry";
import { HUSBANDRY_SAFETY_SOURCE_LIST } from "../data/husbandrySafetySources";
import { getHusbandrySafetyLibrary, saveHusbandrySafetyItem, archiveHusbandrySafetyItem } from "../services/husbandrySafetyService";
import type {
  HusbandrySafetyCategory,
  HusbandrySafetyEvidenceLevel,
  HusbandrySafetyItem,
  HusbandrySafetyRegion,
  HusbandrySafetyStatus,
} from "../types/husbandrySafety";
import "../styles/husbandry-safety.css";

type Draft = {
  id: string;
  commonName: string;
  scientificName: string;
  aliases: string;
  category: HusbandrySafetyCategory;
  regions: string;
  speciesId: string;
  status: HusbandrySafetyStatus;
  reason: string;
  risks: string;
  preparation: string;
  alternatives: string;
  evidenceLevel: HusbandrySafetyEvidenceLevel;
  evidenceNote: string;
  sourceIds: string;
  identificationWarning: string;
};

const EMPTY: Draft = {
  id: "",
  commonName: "",
  scientificName: "",
  aliases: "",
  category: "leaf-litter",
  regions: "uk, us",
  speciesId: "heterodon-nasicus",
  status: "unknown",
  reason: "",
  risks: "",
  preparation: "",
  alternatives: "",
  evidenceLevel: "unknown",
  evidenceNote: "",
  sourceIds: "",
  identificationWarning: "",
};

const CATEGORIES: HusbandrySafetyCategory[] = [
  "leaf-litter","wood-branches","bark","live-plants","dried-plants","moss","substrate","soil","sand","rock-stone","decor",
  "artificial-plants","adhesive","sealant","paint-coating","cleaner-disinfectant","water-treatment","heating-material",
  "lighting-material","feeding-accessory","feeder-product","household-material","other",
];

function lines(value: string): string[] {
  return value.split(/\r?\n/).map((part) => part.trim()).filter(Boolean);
}

function csv(value: string): string[] {
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function slug(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toDraft(item: HusbandrySafetyItem): Draft {
  const assessment = item.assessments[0];
  return {
    id: item.id,
    commonName: item.commonName,
    scientificName: item.scientificName ?? "",
    aliases: item.aliases.join(", "),
    category: item.category,
    regions: item.regions.join(", "),
    speciesId: assessment?.scope === "species" ? assessment.scopeId ?? "heterodon-nasicus" : "heterodon-nasicus",
    status: assessment?.status ?? "unknown",
    reason: assessment?.reason ?? "",
    risks: assessment?.risks.join("\n") ?? "",
    preparation: assessment?.preparation.join("\n") ?? "",
    alternatives: assessment?.alternatives.join("\n") ?? "",
    evidenceLevel: assessment?.evidenceLevel ?? "unknown",
    evidenceNote: assessment?.evidenceNote ?? "",
    sourceIds: assessment?.sourceIds.join(", ") ?? "",
    identificationWarning: item.identificationWarning ?? "",
  };
}

function fromDraft(draft: Draft): HusbandrySafetyItem {
  const id = draft.id.trim() || slug(draft.commonName);
  return {
    id,
    commonName: draft.commonName.trim(),
    scientificName: draft.scientificName.trim() || undefined,
    aliases: csv(draft.aliases),
    category: draft.category,
    regions: csv(draft.regions) as HusbandrySafetyRegion[],
    summary: draft.reason.trim(),
    identificationWarning: draft.identificationWarning.trim() || undefined,
    assessments: [{
      scope: "species",
      scopeId: draft.speciesId,
      status: draft.status,
      reason: draft.reason.trim(),
      risks: lines(draft.risks),
      preparation: lines(draft.preparation),
      alternatives: lines(draft.alternatives),
      evidenceLevel: draft.evidenceLevel,
      evidenceNote: draft.evidenceNote.trim() || "Creator-reviewed husbandry safety assessment.",
      sourceIds: csv(draft.sourceIds),
      reviewedOn: new Date().toISOString().slice(0, 10),
    }],
  };
}

export default function CreatorHusbandrySafety() {
  const { user } = useAuth();
  const [items, setItems] = useState<HusbandrySafetyItem[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => setItems(await getHusbandrySafetyLibrary());

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => [item.commonName, item.scientificName, ...item.aliases].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [items, query]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    if (!user) return;
    if (!draft.commonName.trim() || !draft.reason.trim()) {
      setMessage("Common name and assessment reason are required.");
      return;
    }
    const item = fromDraft(draft);
    if (!item.id) {
      setMessage("Add a usable common name so Tiny Titans can create an item ID.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await saveHusbandrySafetyItem(item, user.uid);
      await load();
      setDraft(toDraft(item));
      setMessage("Saved. The keeper-facing library will use this reviewed override.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save this safety item.");
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!user || !draft.id) return;
    setBusy(true);
    setMessage("");
    try {
      await archiveHusbandrySafetyItem(draft.id, user.uid);
      await load();
      setDraft(EMPTY);
      setMessage("Archived. The item is no longer shown to keepers.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to archive this safety item.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="creator-safety-page">
      <header className="creator-safety-header">
        <div><p>CONTENT · HUSBANDRY EVIDENCE</p><h1><TinyTitansIcon name="check" size={28} /> Husbandry Safety Library</h1><span>Review material safety without silently upgrading weak evidence into “safe”. Firestore records override the bundled seed by ID.</span></div>
        <div className="creator-safety-actions"><Link to="/husbandry/safety">Open keeper view</Link><Link to="/creator">Creator Centre</Link></div>
      </header>

      <div className="creator-safety-layout">
        <aside className="creator-safety-list">
          <div className="creator-safety-list-head"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search materials…" /><button type="button" onClick={() => { setDraft(EMPTY); setMessage(""); }}><TinyTitansIcon name="add" size={16} /> New</button></div>
          <span>{filtered.length} active records</span>
          <div>{filtered.map((item) => {
            const assessment = item.assessments[0];
            return <button type="button" key={item.id} className={draft.id === item.id ? "is-active" : ""} onClick={() => { setDraft(toDraft(item)); setMessage(""); }}>
              <strong>{item.commonName}</strong><small>{item.scientificName ?? item.category}</small><em data-status={assessment?.status ?? "unknown"}>{assessment?.status ?? "unknown"}</em>
            </button>;
          })}</div>
        </aside>

        <section className="creator-safety-editor">
          <div className="creator-safety-editor-heading"><div><p>{draft.id ? "EDIT MATERIAL" : "NEW MATERIAL"}</p><h2>{draft.commonName || "Husbandry safety record"}</h2></div>{draft.id && <code>{draft.id}</code>}</div>

          <div className="creator-safety-form-grid">
            <label><span>Common name</span><input value={draft.commonName} onChange={(event) => update("commonName", event.target.value)} /></label>
            <label><span>Scientific name</span><input value={draft.scientificName} onChange={(event) => update("scientificName", event.target.value)} placeholder="Genus species / Genus spp." /></label>
            <label className="wide"><span>Aliases · comma separated</span><input value={draft.aliases} onChange={(event) => update("aliases", event.target.value)} /></label>
            <label><span>Category</span><select value={draft.category} onChange={(event) => update("category", event.target.value as HusbandrySafetyCategory)}>{CATEGORIES.map((value) => <option key={value} value={value}>{value.replace(/-/g, " ")}</option>)}</select></label>
            <label><span>Regions · comma separated</span><input value={draft.regions} onChange={(event) => update("regions", event.target.value)} placeholder="uk, us, europe" /></label>
            <label className="wide"><span>Species assessment</span><select value={draft.speciesId} onChange={(event) => update("speciesId", event.target.value)}>{UNIVERSAL_SPECIES.map((species) => <option key={species.id} value={species.id}>{species.commonNames[0] ?? species.acceptedScientificName} · {species.acceptedScientificName}</option>)}</select></label>
            <label><span>Safety status</span><select value={draft.status} onChange={(event) => update("status", event.target.value as HusbandrySafetyStatus)}><option value="safe">Safe to use</option><option value="caution">Use with caution</option><option value="avoid">Avoid</option><option value="unknown">Unknown</option></select></label>
            <label><span>Evidence level</span><select value={draft.evidenceLevel} onChange={(event) => update("evidenceLevel", event.target.value as HusbandrySafetyEvidenceLevel)}><option value="high">High</option><option value="moderate">Moderate</option><option value="limited">Limited</option><option value="anecdotal">Anecdotal</option><option value="unknown">Unknown</option></select></label>
            <label className="wide"><span>Assessment reason</span><textarea value={draft.reason} onChange={(event) => update("reason", event.target.value)} rows={3} /></label>
            <label className="wide"><span>Identification warning</span><textarea value={draft.identificationWarning} onChange={(event) => update("identificationWarning", event.target.value)} rows={2} /></label>
            <label><span>Risks · one per line</span><textarea value={draft.risks} onChange={(event) => update("risks", event.target.value)} rows={6} /></label>
            <label><span>Preparation · one step per line</span><textarea value={draft.preparation} onChange={(event) => update("preparation", event.target.value)} rows={6} /></label>
            <label><span>Alternatives · one per line</span><textarea value={draft.alternatives} onChange={(event) => update("alternatives", event.target.value)} rows={5} /></label>
            <label><span>Source IDs · comma separated</span><textarea value={draft.sourceIds} onChange={(event) => update("sourceIds", event.target.value)} rows={5} /></label>
            <label className="wide"><span>Evidence boundary / reviewer note</span><textarea value={draft.evidenceNote} onChange={(event) => update("evidenceNote", event.target.value)} rows={3} /></label>
          </div>

          <section className="creator-safety-source-key">
            <h3>Available bundled source IDs</h3>
            <div>{HUSBANDRY_SAFETY_SOURCE_LIST.map((source) => <button type="button" key={source.id} onClick={() => update("sourceIds", [...new Set([...csv(draft.sourceIds), source.id])].join(", "))}><strong>{source.id}</strong><span>{source.publisher} · {source.title}</span></button>)}</div>
          </section>

          <div className="creator-safety-editor-actions">
            {draft.id && <button className="danger" type="button" disabled={busy} onClick={() => void archive()}><TinyTitansIcon name="delete" size={16} /> Archive</button>}
            <span>{draft.speciesId && UNIVERSAL_SPECIES_BY_ID[draft.speciesId] ? `Assessment applies to ${UNIVERSAL_SPECIES_BY_ID[draft.speciesId].commonNames[0]}` : "Select a valid species."}</span>
            <button className="primary" type="button" disabled={busy} onClick={() => void save()}><TinyTitansIcon name="save" size={16} /> {busy ? "Saving…" : "Save reviewed record"}</button>
          </div>
          {message && <p className="creator-safety-message" role="status">{message}</p>}
        </section>
      </div>
    </main>
  );
}
