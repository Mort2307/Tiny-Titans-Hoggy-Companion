import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { searchGeneticsIntelligence, explainGeneticsSearch } from "../../intelligence/v50/geneticsSearchIntelligence";
import { buildGeneticTimeMachine, buildGeneticWhatIf, buildGeneticBreadcrumbs, buildGeneticFamilyTree } from "../../intelligence/v50/geneticsJourneyEngine";
import { calculateGeneticIdentityConfidence, detectGeneticsConflicts, detectImpossibleOffspring, type GeneticsClaim, type GeneticsIntegrityInput } from "../../intelligence/v50/geneticsIntegrityEngine";

interface Props { featureId: number }

type SearchResult = ReturnType<typeof searchGeneticsIntelligence>[number];

function parseGenes(value: string): GeneticsClaim[] {
  return value.split(",").map((item, index) => {
    const [rawName, rawCopies] = item.split(":").map((part) => part.trim());
    const copies = rawCopies ? Number(rawCopies) : 1;
    return { id: `${index}-${rawName}`, name: rawName, copies, verification: "reported" };
  }).filter((claim) => claim.name && Number.isFinite(claim.copies) && claim.copies > 0);
}

function geneId(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-");
}

function featureMode(featureId: number): "search" | "what-if" | "integrity" | "time-machine" | "family-tree" | "breadcrumbs" {
  if ([1, 2, 11, 23, 36, 46].includes(featureId)) return "search";
  if ([3, 16].includes(featureId)) return "what-if";
  if ([24, 25, 34].includes(featureId)) return "integrity";
  if (featureId === 5) return "time-machine";
  if (featureId === 4) return "family-tree";
  return "breadcrumbs";
}

function ComponentPill({ component }: { component: string }) {
  return <span className="titan-genetics-pill">{component}</span>;
}

function SearchCard({ result, query }: { result: SearchResult; query: string }) {
  const combinationLabel = result.canonicalComponents
    .map((component) => component.replace(/^2 copies /, "Super ").replace(/^1 copy /, ""))
    .join(" × ");

  return <article className="titan-genetics-result" aria-label={`Genetics result for ${result.matchedName}`}>
    <div className="titan-genetics-result-head">
      <div>
        <span className="titan-feature-kicker">{result.verification} · {result.confidence} confidence</span>
        <h3>{result.matchedName}</h3>
        {result.matchKind === "alias" && result.matchedName !== result.canonicalName && <small>Canonical record: {result.canonicalName}</small>}
      </div>
      <span className="titan-genetics-score">{result.score}% match</span>
    </div>

    {result.canonicalComponents.length > 0 && <>
      <p className="titan-genetics-combination"><strong>{result.canonicalName}</strong> [{combinationLabel}]</p>
      {result.commonCombinationName && <p className="titan-genetics-common"><strong>Common combination recognition:</strong> {result.commonCombinationName}</p>}
      <div className="titan-genetics-pills">{result.canonicalComponents.map((component) => <ComponentPill key={component} component={component} />)}</div>
    </>}

    <p>{result.description}</p>
    {result.educationalNotes && <div className="titan-feature-note"><strong>Morph information:</strong> {result.educationalNotes}</div>}
    <div className="titan-genetics-evidence"><strong>Evidence:</strong> {result.evidenceSummary}</div>
    {query && <small>Search path: {result.matchKind ?? "canonical"} · verified independently from visual appearance.</small>}
  </article>;
}

export default function TitanGeneticsWorkspace({ featureId }: Props) {
  const mode = featureMode(featureId);
  const [search, setSearch] = useState("");
  const [parentA, setParentA] = useState("");
  const [parentB, setParentB] = useState("");
  const [offspring, setOffspring] = useState("");
  const [resultText, setResultText] = useState("");
  const [hasRun, setHasRun] = useState(false);

  const parentAGenes = useMemo(() => parseGenes(parentA), [parentA]);
  const parentBGenes = useMemo(() => parseGenes(parentB), [parentB]);
  const offspringGenes = useMemo(() => parseGenes(offspring), [offspring]);
  const searchResults = useMemo(() => searchGeneticsIntelligence(search), [search]);

  function runWhatIf() {
    const outcomes = buildGeneticWhatIf(
      parentAGenes.map(({ name, copies }) => ({ geneId: geneId(name), copies: copies ?? 1 })),
      parentBGenes.map(({ name, copies }) => ({ geneId: geneId(name), copies: copies ?? 1 })),
    );
    setHasRun(true);
    setResultText(outcomes.length
      ? outcomes.map((outcome) => `${outcome.geneId}: parent A ${outcome.parentACopies}, parent B ${outcome.parentBCopies}, possible offspring copy states ${outcome.possibleOffspringCopies.join(" / ")}`).join("\n")
      : "No explicit genetic states were supplied. Enter both parents before running the sandbox.");
  }

  function runIntegrity() {
    const input: GeneticsIntegrityInput = { claims: [...parentAGenes, ...parentBGenes], parentA: parentAGenes, parentB: parentBGenes, observedOffspring: offspringGenes };
    const conflicts = detectGeneticsConflicts(input.claims);
    const impossible = detectImpossibleOffspring(input);
    setHasRun(true);
    setResultText([
      ...conflicts.map((finding) => `CONFLICT · ${finding.title}: ${finding.detail}`),
      ...impossible.map((finding) => `IMPOSSIBLE/REVIEW · ${finding.title}: ${finding.detail}`),
      `Identity confidence: ${Math.round(calculateGeneticIdentityConfidence(input.claims) * 100)}%`,
    ].join("\n") || "No conflict was found in the entered claims.");
  }

  if (mode === "search") return <section className="titan-feature-panel">
    <p className="titan-feature-kicker">🧬 GENETICS INTELLIGENCE</p>
    <h2>Search genetics like a geneticist</h2>
    <p>Canonical names, breeder aliases and recognised combinations all resolve through the same evidence-aware database. A visual match never silently becomes a genetic fact.</p>
    <div className="titan-feature-search">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try Arctic Conda, Grey Fog, Conda or Superconda" aria-label="Search genetics" />
      <button type="button" onClick={() => setSearch(search.trim())}>Search</button>
    </div>
    {!search && <div className="titan-feature-note"><strong>Try these intelligence paths:</strong> “Arctic Conda” → recognised Grey Fog combination · “Grey Fog” → reverse resolution to Arctic × Conda · “Anaconda” → Conda alias.</div>}
    {search && searchResults.length > 0 && <div className="titan-feature-results">{searchResults.map((result) => <SearchCard key={`${result.canonicalName}-${result.matchKind}-${result.score}`} result={result} query={search} />)}</div>}
    {search && searchResults.length === 0 && <div className="titan-feature-empty"><strong>No reliable match.</strong><p>Nothing in the current canonical genetics registry matched that term. Do not invent a record from a similar-looking morph.</p></div>}
    {search && <p className="titan-feature-note">{explainGeneticsSearch(search)}</p>}
    <Link to="/morph-library">Open full Morph Library →</Link>
  </section>;

  if (mode === "what-if" || mode === "integrity") return <section className="titan-feature-panel">
    <p className="titan-feature-kicker">🧬 GENETICS WORKSPACE</p>
    <h2>{mode === "what-if" ? "Breeding What-If Sandbox" : "Genetic Integrity Check"}</h2>
    <p>Enter explicit genetic states. The workspace analyses them without rewriting the keeper's stored records.</p>
    <label>Parent A <input value={parentA} onChange={(event) => setParentA(event.target.value)} placeholder="arctic:1, conda:1" /></label>
    <label>Parent B <input value={parentB} onChange={(event) => setParentB(event.target.value)} placeholder="arctic:2, lavender:2" /></label>
    {mode === "integrity" && <label>Observed offspring <input value={offspring} onChange={(event) => setOffspring(event.target.value)} placeholder="arctic:2, conda:1" /></label>}
    <button type="button" onClick={mode === "what-if" ? runWhatIf : runIntegrity}>{mode === "what-if" ? "Run What-If" : "Check integrity"}</button>
    {hasRun && <pre className="titan-feature-output">{resultText}</pre>}
    {!hasRun && <div className="titan-feature-empty"><strong>Ready.</strong><p>Nothing has been inferred yet. Add explicit claims and run the analysis.</p></div>}
    <Link to="/calculator">Open Genetics Calculator →</Link>
  </section>;

  if (mode === "time-machine") return <section className="titan-feature-panel">
    <p className="titan-feature-kicker">⏳ GENETIC TIME MACHINE</p>
    <h2>Compare recorded genetic states through time</h2>
    <p>One snapshot per line: <code>2026-01-01|arctic:1,conda:1</code>. Historical states are displayed, not silently rewritten.</p>
    <textarea value={resultText} onChange={(event) => setResultText(event.target.value)} placeholder="2026-01-01|arctic:1,conda:1\n2026-06-01|arctic:1,conda:2" rows={6} />
    <div className="titan-feature-note">{buildGeneticTimeMachine(resultText.split("\n").filter(Boolean).map((line) => { const [date, genes] = line.split("|"); return { date, genes: parseGenes(genes ?? "").map((gene) => ({ geneId: geneId(gene.name), copies: gene.copies ?? 1 })) }; })).map((state) => <div key={state.timestamp}>{new Date(state.timestamp).toLocaleDateString("en-GB")} · {state.genes.map((gene) => `${gene.geneId}:${gene.copies}`).join(", ")}</div>)}</div>
  </section>;

  if (mode === "family-tree") return <section className="titan-feature-panel">
    <p className="titan-feature-kicker">🌳 LIVING GENETIC FAMILY TREE</p>
    <h2>Explicit ancestry only</h2>
    <p>Family relationships are represented only when parent IDs are explicitly recorded. Missing ancestry is never guessed.</p>
    <div className="titan-feature-empty"><strong>Ancestry link layer ready.</strong><p>When parent IDs exist in the breeding records, this surface can render them as a live graph. Until then, an empty tree is safer than a fabricated pedigree.</p></div>
    <div className="titan-feature-note">{JSON.stringify(buildGeneticFamilyTree([]))}</div>
    <Link to="/breeding">Open Breeding Planner →</Link>
  </section>;

  return <section className="titan-feature-panel">
    <p className="titan-feature-kicker">🧬 GENETIC BREADCRUMBS</p>
    <h2>Trace the provenance of a claim</h2>
    <label>Gene claims <input value={parentA} onChange={(event) => setParentA(event.target.value)} placeholder="arctic:1, conda:1" /></label>
    <div className="titan-feature-note">{buildGeneticBreadcrumbs({ id: "workspace", name: "Entered claim set", genes: parentAGenes.map((gene) => ({ geneId: geneId(gene.name), copies: gene.copies ?? 1, status: gene.verification === "confirmed" ? "confirmed" : "reported" })) }).map((crumb) => <div key={crumb.geneId}>{crumb.geneId} · {crumb.copies} copy/copies · {crumb.status} · {crumb.source}</div>)}</div>
  </section>;
}
