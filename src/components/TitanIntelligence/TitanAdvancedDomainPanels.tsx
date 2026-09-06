import { buildGeneticFamilyTree, buildHatchlingContext, type ParentRecord } from "../../intelligence/v50/geneticsJourneyEngine";
import { buildAdaptiveLearningProfile, chooseNextLearningTopics } from "../../intelligence/v50/learningCommunityIntelligenceEngine";
import type { LearningSignal } from "../../intelligence/v50/learningCommunityIntelligenceEngine";
import type { AnimalObservation } from "../../intelligence/v50/animalIntelligenceEngine";

export function TitanFamilyTreePanel({ records }: { records: readonly ParentRecord[] }) {
  const tree = buildGeneticFamilyTree(records);
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🌳 FAMILY TREE</p><h2>Living genetic family tree</h2><p>Only explicit parent IDs are rendered. Missing ancestry is intentionally left blank rather than inferred.</p>{tree.nodes.length === 0 ? <div className="titan-feature-empty"><strong>No family records yet.</strong><p>Add parent relationships through breeding records before Tiny Titans draws ancestry.</p></div> : <><div className="titan-feature-data-grid"><article><strong>{tree.nodes.length}</strong><span>Animals in graph</span></article><article><strong>{tree.edges.length}</strong><span>Explicit parent links</span></article></div><div className="titan-feature-note"><p>{tree.edges.length ? tree.edges.map((edge) => `${edge.from} → ${edge.to}`).join(" · ") : "Animals exist, but no explicit parent links are recorded."}</p></div></>}</section>;
}

export function TitanShedDetectivePanel({ observations }: { observations: readonly AnimalObservation[] }) {
  const dated = observations.filter((item) => Boolean(item.date));
  const labels = dated.map((item) => item.label ?? item.category ?? "Shed observation").filter(Boolean);
  const patterns = new Map<string, number>();
  labels.forEach((label) => patterns.set(label, (patterns.get(label) ?? 0) + 1));
  const ranked = [...patterns.entries()].sort((a, b) => b[1] - a[1]);
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🐍 SHED DETECTIVE</p><h2>What your shed history actually shows</h2>{!dated.length ? <div className="titan-feature-empty"><strong>No dated shed observations yet.</strong><p>Tiny Titans will not infer a shed pattern from absence.</p></div> : <><div className="titan-feature-data-grid"><article><strong>{dated.length}</strong><span>Dated observations</span></article><article><strong>{ranked.length}</strong><span>Recorded labels</span></article><article><strong>{ranked[0]?.[0] ?? "—"}</strong><span>Most repeated label</span></article><article><strong>{ranked[0]?.[1] ?? 0}</strong><span>Occurrences</span></article></div><div className="titan-feature-note"><p>{ranked.length ? `Repeated recorded shed labels include ${ranked.slice(0, 4).map(([label, count]) => `${label} (${count})`).join(", ")}. This is an observation summary, not a diagnosis.` : "No repeated labels were found."}</p></div></>}</section>;
}

export function TitanHatchlingPanel({ ageDays }: { ageDays?: number }) {
  const context = buildHatchlingContext(ageDays);
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🐣 HATCHLING MODE</p><h2>Age-aware context without invented defaults</h2><div className="titan-feature-data-grid"><article><strong>{context.mode}</strong><span>Current mode</span></article><article><strong>{ageDays ?? "—"}</strong><span>Recorded age days</span></article></div><div className="titan-feature-note"><p>{context.note}</p></div></section>;
}

export function TitanLearningMasteryPanel({ signals, availableTopics }: { signals: readonly LearningSignal[]; availableTopics: readonly string[] }) {
  const profile = buildAdaptiveLearningProfile(signals);
  const next = chooseNextLearningTopics(signals, availableTopics);
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🎓 ADAPTIVE LEARNING</p><h2>Learning changes from evidence, not guesses</h2><div className="titan-feature-data-grid"><article><strong>{Math.round(profile.overallAccuracy * 100)}%</strong><span>Recorded accuracy</span></article><article><strong>{signals.length}</strong><span>Attempts recorded</span></article><article><strong>{profile.topicMastery.length}</strong><span>Topics measured</span></article><article><strong>{next.length}</strong><span>Next topics</span></article></div><div className="titan-feature-note"><strong>Suggested next topics</strong><p>{next.length ? next.join(" · ") : "Learning history is empty; Tiny Titans will not pretend to know what you have mastered."}</p><small>{profile.confidence} evidence confidence.</small></div></section>;
}

export function TitanResearchArchivePanel({ entries = [] }: { entries?: readonly { id: string; title: string; source: string; year?: string }[] }) {
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🔬 RESEARCH ARCHIVE</p><h2>Keep source provenance attached to knowledge</h2>{entries.length === 0 ? <div className="titan-feature-empty"><strong>No research sources attached yet.</strong><p>Add sources through the Knowledge Base so published claims can retain provenance.</p></div> : <div className="titan-feature-results">{entries.map((entry) => <article key={entry.id}><span>{entry.year || "Year not recorded"}</span><h3>{entry.title}</h3><p>{entry.source || "Source not recorded"}</p></article>)}</div>}<p className="titan-feature-note">A source being present does not automatically make a claim established. Provenance and evidence level stay separate.</p></section>;
}
