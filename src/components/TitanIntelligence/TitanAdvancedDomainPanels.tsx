import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildGeneticFamilyTree, buildHatchlingContext } from "../../intelligence/v50/geneticsJourneyEngine";
import { buildAdaptiveLearningProfile, chooseNextLearningTopics } from "../../intelligence/v50/learningCommunityIntelligenceEngine";
import type { LearningSignal } from "../../intelligence/v50/learningCommunityIntelligenceEngine";
import type { AnimalObservation } from "../../intelligence/v50/animalIntelligenceEngine";

export function TitanFamilyTreePanel() {
  const [animals, setAnimals] = useState("Mum|mother\nDad|father\nBaby|mum,dad");
  const records = useMemo(() => animals.split("\n").map((line, index) => {
    const [name, parentsRaw] = line.split("|");
    return { id: `animal-${index}`, name: name.trim(), genes: [], parentIds: (parentsRaw ?? "").split(",").map((value) => value.trim()).filter(Boolean).map((parentName) => `animal-${animals.split("\n").findIndex((candidate) => candidate.startsWith(parentName + "|"))}`) };
  }).filter((record) => record.name), [animals]);
  const tree = buildGeneticFamilyTree(records);
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🌳 FAMILY TREE</p><h2>Explicit parentage, no guessed ancestry</h2><textarea value={animals} onChange={(event) => setAnimals(event.target.value)} rows={5} aria-label="Family tree records" /><div className="titan-feature-note"><strong>{tree.nodes.length} animals · {tree.edges.length} explicit parent links</strong><p>{tree.edges.length ? tree.edges.map((edge) => `${edge.from} → ${edge.to}`).join(" · ") : "No explicit parent links recorded."}</p></div><Link to="/breeding">Open Breeding Planner →</Link></section>;
}

export function TitanShedDetectivePanel({ observations }: { observations: readonly AnimalObservation[] }) {
  const dated = observations.filter((item) => Boolean(item.date));
  const labels = dated.map((item) => item.label ?? item.category ?? "Shed observation").filter(Boolean);
  const patterns = new Map<string, number>();
  labels.forEach((label) => patterns.set(label, (patterns.get(label) ?? 0) + 1));
  const ranked = [...patterns.entries()].sort((a, b) => b[1] - a[1]);
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🐍 SHED DETECTIVE</p><h2>What your shed history actually shows</h2>{!dated.length ? <p>No dated shed observations are available yet. Tiny Titans will not infer a shed pattern from absence.</p> : <><div className="titan-feature-data-grid"><article><strong>{dated.length}</strong><span>Dated observations</span></article><article><strong>{ranked.length}</strong><span>Distinct recorded labels</span></article><article><strong>{ranked[0]?.[0] ?? "—"}</strong><span>Most repeated label</span></article><article><strong>{ranked[0]?.[1] ?? 0}</strong><span>Occurrences</span></article></div><div className="titan-feature-note"><p>{ranked.length ? `Repeated recorded shed labels include ${ranked.slice(0, 4).map(([label, count]) => `${label} (${count})`).join(", ")}. This is an observation summary, not a diagnosis.` : "No repeated labels were found."}</p></div></>}</section>;
}

export function TitanHatchlingPanel({ ageDays }: { ageDays?: number }) {
  const context = buildHatchlingContext(ageDays);
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🐣 HATCHLING MODE</p><h2>Age-aware context without invented defaults</h2><div className="titan-feature-data-grid"><article><strong>{context.mode}</strong><span>Current mode</span></article><article><strong>{ageDays ?? "—"}</strong><span>Recorded age days</span></article></div><div className="titan-feature-note"><p>{context.note}</p></div></section>;
}

export function TitanLearningMasteryPanel({ signals, availableTopics }: { signals: readonly LearningSignal[]; availableTopics: readonly string[] }) {
  const profile = buildAdaptiveLearningProfile(signals);
  const next = chooseNextLearningTopics(signals, availableTopics);
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🎓 ADAPTIVE LEARNING</p><h2>Learning changes from evidence, not guesses</h2><div className="titan-feature-data-grid"><article><strong>{Math.round(profile.overallAccuracy * 100)}%</strong><span>Recorded accuracy</span></article><article><strong>{signals.length}</strong><span>Attempts recorded</span></article><article><strong>{profile.topicMastery.length}</strong><span>Topics measured</span></article><article><strong>{next.length}</strong><span>Next topics</span></article></div><div className="titan-feature-note"><strong>Suggested next topics</strong><p>{next.length ? next.join(" · ") : "Record a few completed challenges before Tiny Titans adapts the next set."}</p><small>Current learner level is presentation context only; it does not alter scientific facts.</small></div></section>;
}

export function TitanResearchArchivePanel() {
  const [sources, setSources] = useState("Source title|URL|2026\nKeeper observation|Internal record|2026");
  const entries = useMemo(() => sources.split("\n").map((line, index) => { const [title, source, year] = line.split("|"); return { id: index, title: title?.trim() ?? "", source: source?.trim() ?? "", year: year?.trim() ?? "" }; }).filter((entry) => entry.title), [sources]);
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🔬 RESEARCH ARCHIVE</p><h2>Keep source provenance attached to knowledge</h2><textarea value={sources} onChange={(event) => setSources(event.target.value)} rows={5} aria-label="Research archive sources" /><div className="titan-feature-results">{entries.map((entry) => <article key={entry.id}><span>{entry.year || "Year not recorded"}</span><h3>{entry.title}</h3><p>{entry.source || "Source not recorded"}</p></article>)}</div><p className="titan-feature-note">Archive entries are provenance records. A source being present does not automatically make a claim established.</p><Link to="/knowledge-base">Open Knowledge Base →</Link></section>;
}
