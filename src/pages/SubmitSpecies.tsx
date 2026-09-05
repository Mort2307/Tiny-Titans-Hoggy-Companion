import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { searchSnakeSpecies } from "../data/species/speciesRegistry";
import { submitSpeciesSubmission } from "../services/speciesSubmissionService";
import "../styles/species-submission.css";

const fields = [
  ["commonName", "Common name", "e.g. Ball Python"],
  ["scientificName", "Accepted scientific name", "e.g. Python regius"],
  ["authority", "Taxonomic authority", "Optional"],
  ["family", "Family", "e.g. Pythonidae"],
  ["genus", "Genus", "e.g. Python"],
  ["species", "Species epithet", "e.g. regius"],
  ["subspecies", "Subspecies", "Leave blank if not applicable"],
  ["synonyms", "Known synonyms", "One per line or comma separated"],
  ["nativeRange", "Native range", "Countries, islands, regions or localities"],
  ["habitat", "Natural habitat & ecology", "Habitat type, elevation, microhabitat, climate"],
  ["adultSize", "Typical adult size", "Length/weight and sexual dimorphism if known"],
  ["lifespan", "Captive lifespan", "Only state a range you can support"],
  ["activityPattern", "Activity pattern", "Diurnal, nocturnal, crepuscular, seasonal etc."],
  ["terrestrialArborealAquatic", "Locomotion / habitat use", "Terrestrial, arboreal, aquatic, fossorial or mixed"],
  ["temperatureGuidance", "Temperature guidance", "Warm side/spot, cool side, night range and seasonal notes"],
  ["humidityGuidance", "Humidity / hydration guidance", "Typical range plus seasonal or locality caveats"],
  ["substrateGuidance", "Substrate guidance", "Suitable substrates and important cautions"],
  ["enclosureGuidance", "Enclosure & space guidance", "Minimum practical dimensions and ventilation considerations"],
  ["hidesAndEnrichment", "Hides & enrichment", "Cover, climbing, burrowing, bathing, enrichment"],
  ["lightingGuidance", "Lighting / UV guidance", "Evidence-based lighting requirements or say unknown"],
  ["ventilationGuidance", "Ventilation", "Ventilation needs and humidity balance"],
  ["waterGuidance", "Water", "Water provision, soaking/bathing behaviour if relevant"],
  ["feedingGuidance", "Feeding guidance", "Feeding approach, prey presentation and major cautions"],
  ["preyAndDiet", "Natural / captive diet", "Known prey, diet breadth, supplements if relevant"],
  ["feedingFrequency", "Feeding frequency", "Age/life-stage context and caveats"],
  ["breedingSeason", "Breeding season / cycle", "Seasonality, cycling, ovulation or mating notes"],
  ["clutchOrLitter", "Clutch / litter", "Typical ranges where supported"],
  ["sexualMaturity", "Sexual maturity", "Age/size and sex-specific differences"],
  ["incubationOrGestation", "Incubation / gestation", "Time, temperature and substrate/media if known"],
  ["geneticsNotes", "Genetics / breeding notes", "Known morphs, locality lines, inheritance or explicitly unknown"],
  ["venomOrDefence", "Venom / defensive biology", "Venom, medically significant bite, musk, constriction or defence notes"],
  ["handlingTemperament", "Handling / temperament", "Evidence-led keeper context; avoid presenting anecdotes as facts"],
  ["commonHealthConcerns", "Common health concerns", "Known issues, husbandry-linked risks and red flags"],
  ["legalOrCitesNotes", "Legal / CITES notes", "Country-specific restrictions, CITES status or say needs verification"],
];

const initial = Object.fromEntries(fields.map(([key]) => [key, ""])) as Record<string, string>;

export default function SubmitSpecies() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [values, setValues] = useState(initial);
  const [evidenceSummary, setEvidenceSummary] = useState("");
  const [sources, setSources] = useState("");
  const [submitterNotes, setSubmitterNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [creditName, setCreditName] = useState(profile?.displayName || "");
  const [creditEmail, setCreditEmail] = useState(user?.email || "");
  const [honeypot, setHoneypot] = useState("");
  const [confirmAccuracy, setConfirmAccuracy] = useState(false);
  const [confirmRights, setConfirmRights] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const suggestedSpecies = useMemo(() => {
    const query = values.scientificName || values.commonName;
    return searchSnakeSpecies(query).slice(0, 8);
  }, [values.scientificName, values.commonName]);

  function update(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function onFiles(selected: FileList | null) {
    if (!selected) return;
    const next = Array.from(selected).slice(0, 6);
    setFiles(next);
    setError(next.length < selected.length ? "Maximum 6 images can be submitted at once." : "");
  }

  async function submit() {
    if (!user) return;
    setError("");
    setSuccess("");
    if (honeypot) return;
    const required = ["commonName", "scientificName", "family", "genus", "nativeRange", "habitat", "temperatureGuidance", "humidityGuidance", "enclosureGuidance", "feedingGuidance"];
    const missing = required.filter((key) => !values[key].trim());
    if (missing.length) {
      setError("Please complete the core identity, ecology, husbandry and feeding fields before submitting.");
      return;
    }
    if (!confirmAccuracy || !confirmRights) {
      setError("Please confirm that the information is submitted in good faith and that you have permission to submit the images.");
      return;
    }
    if (!files.length) {
      setError("Please include at least one useful species photograph or reference image.");
      return;
    }
    setSubmitting(true);
    try {
      await submitSpeciesSubmission(user.uid, {
        ...values,
        evidenceSummary,
        sources,
        submitterNotes,
        images: [],
        submitterDisplayName: creditName.trim() || "Anonymous keeper",
        contactEmail: creditEmail.trim(),
      }, files);
      setSuccess("Species submission received. It is now in the Creator review queue and will not change the canonical database until reviewed.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => navigate("/make-contribution"), 1800);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit this species right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-container species-submission-page">
      <BackHomeButton />
      <header className="species-submission-hero">
        <span className="eyebrow">TINY TITANS · SPECIES INTELLIGENCE</span>
        <h1>🐍 Submit a Species</h1>
        <p>Help expand the reptile database. Give us the best evidence you have, upload useful imagery, and clearly mark anything that still needs verification.</p>
        <div className="species-submission-rule">Research quality beats completeness. Writing “unknown” is better than inventing a value.</div>
      </header>

      {error && <div className="species-submit-message species-submit-error">{error}</div>}
      {success && <div className="species-submit-message species-submit-success">✓ {success}</div>}

      <form className="species-submission-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <section><div className="species-submit-section-title"><span>01</span><div><h2>Taxonomy & identity</h2><p>Use the accepted name where known. Include synonyms so we can catch duplicate or historic names.</p></div></div><div className="species-submit-grid">{fields.slice(0, 9).map(([key, label, placeholder]) => <label key={key}>{label}<input value={values[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} />{(key === "scientificName" || key === "commonName") && suggestedSpecies.length > 0 && <small>Possible existing matches: {suggestedSpecies.map((species) => species.commonNames[0]).join(", ")}</small>}</label>)}</div></section>

        <section><div className="species-submit-section-title"><span>02</span><div><h2>Ecology & natural history</h2><p>Capture the biological context first. This prevents generic husbandry being applied blindly.</p></div></div><div className="species-submit-grid">{fields.slice(9, 14).map(([key, label, placeholder]) => <label key={key}>{label}<textarea value={values[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} /></label>)}</div></section>

        <section><div className="species-submit-section-title"><span>03</span><div><h2>Captive husbandry</h2><p>Separate supported guidance from keeper preference. Add locality or seasonal caveats where they matter.</p></div></div><div className="species-submit-grid">{fields.slice(14, 23).map(([key, label, placeholder]) => <label key={key}>{label}<textarea value={values[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} /></label>)}</div></section>

        <section><div className="species-submit-section-title"><span>04</span><div><h2>Diet, reproduction & biology</h2><p>Provide life-stage context and uncertainty rather than a single “universal” number.</p></div></div><div className="species-submit-grid">{fields.slice(23, 29).map(([key, label, placeholder]) => <label key={key}>{label}<textarea value={values[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} /></label>)}</div></section>

        <section><div className="species-submit-section-title"><span>05</span><div><h2>Health, behaviour & regulation</h2><p>Flag defensive biology, known health risks and legal issues that require country-specific verification.</p></div></div><div className="species-submit-grid">{fields.slice(29).map(([key, label, placeholder]) => <label key={key}>{label}<textarea value={values[key]} onChange={(event) => update(key, event.target.value)} placeholder={placeholder} /></label>)}</div></section>

        <section><div className="species-submit-section-title"><span>06</span><div><h2>Evidence & sources</h2><p>Tell the reviewer what supports your submission. Links, papers, books, field guides, specialist resources and breeder documentation are useful.</p></div></div><div className="species-submit-wide"><label>Evidence summary<textarea value={evidenceSummary} onChange={(event) => setEvidenceSummary(event.target.value)} placeholder="What is strongly supported? What is uncertain? Are there locality differences?" /></label><label>Sources / references<textarea value={sources} onChange={(event) => setSources(event.target.value)} placeholder="Paste source titles, URLs, DOI links, books, papers or breeder/specialist references." /></label><label>Additional notes for the reviewer<textarea value={submitterNotes} onChange={(event) => setSubmitterNotes(event.target.value)} placeholder="Anything the Creator should verify, compare or treat cautiously." /></label></div></section>

        <section><div className="species-submit-section-title"><span>07</span><div><h2>Species imagery</h2><p>Upload up to 6 clear images. Useful angles include whole animal, head, dorsal pattern, habitat and distinguishing diagnostic features.</p></div></div><label className="species-file-drop">📷 Choose images<input type="file" accept="image/*" multiple onChange={(event) => onFiles(event.target.files)} /><small>{files.length ? `${files.length} image${files.length === 1 ? "" : "s"} selected` : "JPG, PNG, WEBP or HEIC where your browser supports it · 8 MB maximum per image"}</small></label>{files.length > 0 && <div className="species-file-list">{files.map((file) => <div key={`${file.name}-${file.lastModified}`}>🖼️ <strong>{file.name}</strong><span>{Math.round(file.size / 1024)} KB</span></div>)}</div>}</section>

        <section><div className="species-submit-section-title"><span>08</span><div><h2>Attribution & declaration</h2><p>These details stay with the submission and help the Creator contact you if clarification is needed.</p></div></div><div className="species-submit-grid"><label>Your display / credit name<input value={creditName} onChange={(event) => setCreditName(event.target.value)} placeholder="Name or anonymous keeper" /></label><label>Contact email (optional)<input type="email" value={creditEmail} onChange={(event) => setCreditEmail(event.target.value)} placeholder="Only used for submission follow-up" /></label></div><div className="species-checks"><label><input type="checkbox" checked={confirmAccuracy} onChange={(event) => setConfirmAccuracy(event.target.checked)} /> I am submitting this information in good faith and understand that unverified claims may be marked research-needed.</label><label><input type="checkbox" checked={confirmRights} onChange={(event) => setConfirmRights(event.target.checked)} /> I own the submitted images or have permission for Tiny Titans to use them for species research/review.</label></div></section>

        <input className="species-honeypot" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <button className="primary-button species-submit-button" type="submit" disabled={submitting}>{submitting ? "Submitting species…" : "🐍 Submit Species for Review"}</button>
        <p className="species-submit-footnote">Submitting does not publish anything automatically. Every species submission enters the Creator review queue first.</p>
      </form>
    </main>
  );
}
