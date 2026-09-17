import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PaidTierGate from "../components/PaidTierGate";
import RescueLogIntelligence from "../components/rescue/RescueLogIntelligence";
import { useAuth } from "../context/useAuth";
import { appendRescueCareRecord, getRescueAccess, listRescueAnimals } from "../services/rescueService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import type { RescueAnimal, RescueCareRecordType, RescueVisibility } from "../types/rescue";
import "../styles/rescue-quick-log.css";

const RECORD_TYPES: Array<{ type: RescueCareRecordType; label: string; icon: string; description: string }> = [
  { type: "feeding", label: "Feeding", icon: "🍽️", description: "Food offered, response and context" },
  { type: "weight", label: "Weight", icon: "⚖️", description: "Dated weight for the individual baseline" },
  { type: "shed", label: "Shedding", icon: "🐍", description: "Shed event and observations" },
  { type: "health", label: "Health / medical", icon: "🩺", description: "Clinical or health-related record" },
  { type: "behaviour", label: "Behaviour", icon: "👀", description: "Observed behaviour without interpretation" },
  { type: "husbandry", label: "Husbandry", icon: "🌿", description: "Environment, routine or care changes" },
  { type: "note", label: "General note", icon: "📝", description: "Anything else worth attaching to the animal" },
];

const VISIBILITY_LABELS: Record<RescueVisibility, string> = {
  public: "Public-safe",
  staff: "Staff only",
  medical: "Medical / vet",
};

function defaultTitle(type: RescueCareRecordType) {
  return RECORD_TYPES.find((item) => item.type === type)?.label || "Care record";
}

function nowInputValue() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function RescueQuickLog() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get("type") as RescueCareRecordType | null;
  const requestedAnimal = searchParams.get("animalId");
  const [animals, setAnimals] = useState<RescueAnimal[]>([]);
  const [organisationId, setOrganisationId] = useState("");
  const [roleCanEdit, setRoleCanEdit] = useState(false);
  const [animalId, setAnimalId] = useState(requestedAnimal || "");
  const [recordType, setRecordType] = useState<RescueCareRecordType>(RECORD_TYPES.some((item) => item.type === requestedType) ? requestedType! : "feeding");
  const [occurredAt, setOccurredAt] = useState(nowInputValue);
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [foodType, setFoodType] = useState("");
  const [accepted, setAccepted] = useState("unknown");
  const [visibility, setVisibility] = useState<RescueVisibility>("staff");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedAnimal = useMemo(() => animals.find((item) => item.id === animalId) || null, [animals, animalId]);
  const selectedType = useMemo(() => RECORD_TYPES.find((item) => item.type === recordType) || RECORD_TYPES[0], [recordType]);

  const refresh = useCallback(async () => {
    if (!user) return;
    const workspace = await getMyRescueWorkspace();
    const organisation = workspace.organisation;
    setOrganisationId(organisation?.id || "");
    if (!organisation) {
      setAnimals([]);
      setRoleCanEdit(false);
      return;
    }
    const access = getRescueAccess(organisation, user.uid);
    setRoleCanEdit(access.canEdit);
    const nextAnimals = await listRescueAnimals(organisation.id);
    setAnimals(nextAnimals);
    if (requestedAnimal && nextAnimals.some((item) => item.id === requestedAnimal)) setAnimalId(requestedAnimal);
    else if (!animalId && nextAnimals.length) setAnimalId(nextAnimals[0].id);
  }, [animalId, requestedAnimal, user]);

  useEffect(() => {
    setLoading(true);
    void refresh().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load the Rescue workspace."))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    setTitle("");
  }, [recordType]);

  async function save() {
    if (!user || !selectedAnimal || !organisationId || !roleCanEdit) return;
    const occurred = new Date(occurredAt);
    if (Number.isNaN(occurred.getTime())) {
      setError("Choose a valid date and time for this record.");
      return;
    }
    if (recordType === "weight" && value.trim() && !Number.isFinite(Number(value))) {
      setError("Weight must be a valid number in grams.");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await appendRescueCareRecord(selectedAnimal.id, {
        type: recordType,
        occurredAt: occurred.toISOString(),
        title: title.trim() || defaultTitle(recordType),
        summary: summary.trim(),
        details: details.trim(),
        recordedByUid: user.uid,
        visibility,
        value: value.trim() ? Number(value) : null,
        unit: recordType === "weight" ? "g" : undefined,
        foodType: recordType === "feeding" ? foodType.trim() || undefined : undefined,
        accepted: recordType === "feeding" ? (accepted === "unknown" ? null : accepted === "accepted") : undefined,
      });
      setMessage(`${selectedType.label} record added for ${selectedAnimal.name || "this animal"}.`);
      setOccurredAt(nowInputValue());
      setTitle("");
      setValue("");
      setFoodType("");
      setAccepted("unknown");
      setSummary("");
      setDetails("");
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The care record could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PaidTierGate entitlement="rescue_workspace">
      <main className="rescue-page rescue-quick-log-page">
        <header className="rescue-quick-log-hero">
          <div>
            <Link to="/rescue" className="rescue-back-link">← Rescue Centre</Link>
            <span className="rescue-eyebrow">QUICK LOGGING</span>
            <h1>Record what happened today.</h1>
            <p>Choose an animal, choose the type of record, and save it straight into that animal's Rescue timeline.</p>
          </div>
          <Link className="rescue-enhanced-button secondary" to="/rescue/animals">Open Animal Register</Link>
        </header>

        {loading ? <section className="rescue-card"><p role="status">Loading Rescue animals…</p></section> : error && !animals.length ? <section className="rescue-card"><div className="rescue-message rescue-message-error" role="alert">{error}</div></section> : !organisationId ? <section className="rescue-card"><h2>Rescue workspace not configured</h2><p>Set up the Rescue organisation before logging animal care.</p></section> : (
          <>
            {error && <div className="rescue-message rescue-message-error" role="alert">{error}</div>}
            {message && <div className="rescue-message" role="status">{message}</div>}

            <RescueLogIntelligence records={selectedAnimal?.careRecords} animalName={selectedAnimal?.name || "this animal"} />

            {!roleCanEdit ? <section className="rescue-card">
              <h2>View-only Rescue access</h2>
              <p>Your current Rescue role can view records and log intelligence but cannot create care logs.</p>
            </section> : <>
              <section className="rescue-quick-log-type-grid" aria-label="Record type">
                {RECORD_TYPES.map((item) => (
                  <button key={item.type} type="button" className={recordType === item.type ? "active" : ""} onClick={() => setRecordType(item.type)}>
                    <span className="rescue-quick-log-type-icon" aria-hidden="true">{item.icon}</span>
                    <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  </button>
                ))}
              </section>

              <section className="rescue-card rescue-quick-log-form-card">
                <div className="rescue-panel-heading">
                  <div><span className="rescue-eyebrow">NEW {selectedType.label.toUpperCase()} RECORD</span><h2>{selectedAnimal?.name || "Choose an animal"}</h2></div>
                  {selectedAnimal && <span>{selectedAnimal.speciesCommonName || "Species pending"}</span>}
                </div>
                <div className="rescue-form-grid">
                  <label>Animal
                    <select value={animalId} onChange={(event) => setAnimalId(event.target.value)}>
                      <option value="">Choose an animal…</option>
                      {animals.map((animal) => <option key={animal.id} value={animal.id}>{animal.name || "Unnamed animal"}{animal.rescueId ? ` · ${animal.rescueId}` : ""}</option>)}
                    </select>
                  </label>
                  <label>Date & time
                    <input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} />
                  </label>
                  <label>Title
                    <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={defaultTitle(recordType)} />
                  </label>
                  <label>Value {recordType === "weight" ? "(g)" : "(optional)"}
                    <input type="number" step="0.1" value={value} onChange={(event) => setValue(event.target.value)} placeholder={recordType === "weight" ? "e.g. 86.5" : ""} />
                  </label>
                  {recordType === "feeding" && <>
                    <label>Food type
                      <input value={foodType} onChange={(event) => setFoodType(event.target.value)} placeholder="Mouse, rat, insect, prepared diet…" />
                    </label>
                    <label>Feeding response
                      <select value={accepted} onChange={(event) => setAccepted(event.target.value)}>
                        <option value="unknown">Unknown / not logged</option><option value="accepted">Accepted</option><option value="refused">Refused</option>
                      </select>
                    </label>
                  </>}
                  <label>Record visibility
                    <select value={visibility} onChange={(event) => setVisibility(event.target.value as RescueVisibility)}>{Object.entries(VISIBILITY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
                  </label>
                  <label className="rescue-span-2">Summary
                    <textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder={`What happened during this ${selectedType.label.toLowerCase()} record?`} />
                  </label>
                  <label className="rescue-span-2">Details / context
                    <textarea value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Useful context for the next person reading the animal history." />
                  </label>
                </div>
                <div className="rescue-quick-log-form-actions">
                  <span>Saved to <strong>{selectedAnimal?.name || "the selected animal"}</strong>'s private Rescue history.</span>
                  <button type="button" onClick={() => void save()} disabled={saving || !selectedAnimal}>{saving ? "Saving…" : `Add ${selectedType.label} record`}</button>
                </div>
              </section>

              <section className="rescue-card rescue-quick-log-guidance">
                <strong>One record, one animal, one timeline.</strong>
                <span>Quick Logging uses the existing Rescue care-record model, so feeding, weight, shedding, health, behaviour, husbandry and notes continue to contribute to the individual profile and longitudinal timeline.</span>
              </section>
            </>}
          </>
        )}
      </main>
    </PaidTierGate>
  );
}
