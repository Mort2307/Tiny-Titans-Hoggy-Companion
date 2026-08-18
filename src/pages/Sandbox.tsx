import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ParentSelector, { type ParentSelection } from "../components/ParentSelector";
import ResultCard from "../components/ResultCard";
import { getGenes, morphs as morphDatabase } from "../data/morphs";
import { calculateGenetics } from "../utils/geneticsCalculator";
import { saveSandboxExperiment } from "../services/sandboxService";
import { useAuth } from "../context/useAuth";
import "../styles/calculator.css";

const EMPTY: ParentSelection = { morphs: [], hets: [] };

export default function Sandbox() {
  const { user } = useAuth();
  const [mother, setMother] = useState<ParentSelection>(EMPTY);
  const [father, setFather] = useState<ParentSelection>(EMPTY);
  const [title, setTitle] = useState("My Sandbox Experiment");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const allMorphs = useMemo(() => morphDatabase, []);
  const visualOptions = useMemo(() => allMorphs.filter((morph) => morph.verification !== "Unverified" && morph.verification !== "Disputed" && (morph.kind === "Gene" || morph.kind === "Super" || morph.kind === "Combination")), [allMorphs]);
  const hetOptions = useMemo(() => getGenes().filter((morph) => morph.hetPossible === true && morph.verification !== "Unverified" && morph.verification !== "Disputed"), []);
  const result = useMemo(() => calculateGenetics({ female: { morphs: mother.morphs, hets: mother.hets.map((item) => item.gene) }, male: { morphs: father.morphs, hets: father.hets.map((item) => item.gene) } }), [mother, father]);
  const hasSelection = mother.morphs.length + mother.hets.length + father.morphs.length + father.hets.length > 0;

  async function save() {
    if (!user || !hasSelection || saving) return;
    setSaving(true); setSaved(false); setError("");
    try {
      await saveSandboxExperiment({ title: title.trim() || "Untitled Sandbox Experiment", type: "genetics", data: { female: mother, male: father, offspring: result.offspring, unresolved: result.hasUnresolvedGenetics } });
      setSaved(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save the sandbox experiment."); }
    finally { setSaving(false); }
  }

  function reset() { setMother(EMPTY); setFather(EMPTY); setSaved(false); setError(""); }

  return <main className="calculator-page">
    <div className="calculator-navigation"><Link to="/breeding" className="calculator-back-button">← Back to Breeding Planner</Link></div>
    <header className="calculator-header">
      <div><span className="calculator-kicker">TINY TITANS · SANDBOX</span><h1>🧪 Family Sandbox</h1><p>Experiment freely. Nothing you do here changes your real snakes, feeding history, breeding projects or family records.</p></div>
      <button type="button" onClick={reset} className="calculator-clear-button">Reset experiment</button>
    </header>
    <div className="calculator-note" role="status">🧪 <strong>SANDBOX MODE:</strong> this is a safe playground. Calculations here are never added to your real breeding records and are not counted as production activity.</div>
    <div className="calculator-info-strip"><span>🧬 Genetics experiments</span><span>🥚 Hypothetical pairings</span><span>🛡️ Real data protected</span><span>🎓 Learn by experimenting</span></div>
    <section className="calculator-card" style={{ marginBottom: 20 }}><label className="calculator-kicker" htmlFor="sandbox-title">EXPERIMENT NAME</label><input id="sandbox-title" value={title} onChange={(event) => setTitle(event.target.value)} className="account-input" placeholder="e.g. What if Lilith × Mort?" /></section>
    <div className="calculator-parents">
      <ParentSelector title="Female / Mother" parent={mother} snakes={[]} morphOptions={visualOptions} hetOptions={hetOptions} onChange={setMother} />
      <ParentSelector title="Male / Father" parent={father} snakes={[]} morphOptions={visualOptions} hetOptions={hetOptions} onChange={setFather} />
    </div>
    <section className="calculator-results">
      <div className="calculator-results-header"><div><span className="calculator-kicker">SANDBOX PREDICTION</span><h2>Possible Offspring</h2><p>{hasSelection ? `${result.offspring.length} outcome${result.offspring.length === 1 ? "" : "s"} calculated.` : "Build a hypothetical pairing above."}</p></div></div>
      {!hasSelection && <div className="calculator-empty"><div className="calculator-empty-icon">🧪</div><h3>Nothing is live yet</h3><p>Choose genetics for both parents and explore the result. This stays completely outside the family record.</p></div>}
      {hasSelection && <div className="calculator-result-grid">{result.offspring.map((offspring) => <ResultCard key={offspring.id} result={offspring} morphs={allMorphs} />)}</div>}
      {hasSelection && <div className="calculator-note"><button type="button" onClick={() => void save()} className="calculator-clear-button" disabled={saving}>{saving ? "Saving…" : "💾 Save Sandbox Experiment"}</button>{saved && <span> ✅ Saved safely to your Sandbox.</span>}{error && <span> ⚠️ {error}</span>}</div>}
    </section>
    <div className="calculator-note"><strong>Want to make it real?</strong> Sandbox experiments never become real automatically. A future family approval action can submit an experiment for the Family Owner to review before anything is added to production records.</div>
  </main>;
}
