import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { searchGeneticsIntelligence, explainGeneticsSearch } from "../../intelligence/v50/geneticsSearchIntelligence";
import { buildGeneticTimeMachine, buildGeneticWhatIf } from "../../intelligence/v50/geneticsJourneyEngine";
import { calculateGeneticIdentityConfidence, detectGeneticsConflicts, detectImpossibleOffspring, type GeneticsClaim, type GeneticsIntegrityInput } from "../../intelligence/v50/geneticsIntegrityEngine";
import { buildGeneticBreadcrumbs, buildGeneticFamilyTree } from "../../intelligence/v50/geneticsJourneyEngine";

interface Props { featureId: number }

function parseGenes(value: string): GeneticsClaim[] {
  return value.split(",").map((item, index) => {
    const [rawName, rawCopies] = item.split(":").map((part) => part.trim());
    return { id: `${index}-${rawName}`, name: rawName, copies: rawCopies ? Number(rawCopies) : 1, verification: "reported" };
  }).filter((claim) => claim.name && Number.isFinite(claim.copies) && claim.copies > 0);
}

function featureMode(featureId: number): "search" | "what-if" | "integrity" | "time-machine" | "family-tree" | "breadcrumbs" {
  if ([1, 11, 23, 36, 46].includes(featureId)) return "search";
  if ([3, 16].includes(featureId)) return "what-if";
  if ([24, 25, 34].includes(featureId)) return "integrity";
  if (featureId === 5) return "time-machine";
  if (featureId === 4) return "family-tree";
  return "breadcrumbs";
}

export default function TitanGeneticsWorkspace({ featureId }: Props) {
  const mode = featureMode(featureId);
  const [search, setSearch] = useState("");
  const [parentA, setParentA] = useState("");
  const [parentB, setParentB] = useState("");
  const [offspring, setOffspring] = useState("");
  const [resultText, setResultText] = useState("");

  const parentAGenes = useMemo(() => parseGenes(parentA), [parentA]);
  const parentBGenes = useMemo(() => parseGenes(parentB), [parentB]);
  const offspringGenes = useMemo(() => parseGenes(offspring), [offspring]);
  const searchResults = useMemo(() => search ? searchGeneticsIntelligence(search) : [], [search]);

  function runWhatIf() {
    const outcomes = buildGeneticWhatIf(parentAGenes.map(({ name, copies }) => ({ geneId: name.toLowerCase().replace(/\s+/g, "-"), copies: copies ?? 1 })), parentBGenes.map(({ name, copies }) => ({ geneId: name.toLowerCase().replace(/\s+/g, "-"), copies: copies ?? 1 })));
    setResultText(outcomes.map((outcome) => `${outcome.geneId}: parent A ${outcome.parentACopies}, parent B ${outcome.parentBCopies}, possible copy states ${outcome.possibleOffspringCopies.join("/")}`).join("\n"));
  }

  function runIntegrity() {
    const input: GeneticsIntegrityInput = { claims: [...parentAGenes, ...parentBGenes], parentA: parentAGenes, parentB: parentBGenes, observedOffspring: offspringGenes };
    const conflicts = detectGeneticsConflicts(input.claims);
    const impossible = detectImpossibleOffspring(input);
    setResultText([...
      conflicts.map((finding) => `CONFLICT: ${finding.detail}`),
      impossible.map((finding) => `OUTCOME: ${finding.detail}`),
      `Identity confidence for entered claims: ${Math.round(calculateGeneticIdentityConfidence(input.claims) * 100)}%`,
    ].join("\n") || "No conflict was found in the entered claims.");
  }

  if (mode === "search") return <section className="titan-feature-panel"><p className="titan-feature-kicker">🧬 GENETICS INTELLIGENCE</p><h2>Search recognised genetics</h2><p>Aliases are lookup paths. Verification and component structure remain attached to the canonical record.</p><div className="titan-feature-search"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try Arctic Conda or Grey Fog" /><button type="button" onClick={() => setSearch(search.trim())}>Search</button></div>{searchResults.length > 0 && <div className="titan-feature-results">{searchResults.map((result) => <article key={`${result.matchedName}-${result.verification}`}><span>{result.verification} · {result.confidence} confidence</span><h3>{result.matchedName}</h3><p>{result.description}</p>{result.commonCombinationName && <strong>Recognised combination: {result.commonCombinationName}</strong>}{result.canonicalComponents.length > 0 && <small>{result.canonicalComponents.join(" + ")}</small>}</article>)}</div>}{search && <p>{explainGeneticsSearch(search)}</p>}<Link to="/morph-library">Open full Morph Library →</Link></section>;

  if (mode === "what-if" || mode === "integrity") return <section className="titan-feature-panel"><p className="titan-feature-kicker">🧬 GENETICS WORKSPACE</p><h2>{mode === "what-if" ? "Build and compare a genetic what-if" : "Check recorded genetic claims"}</h2><p>Use explicit gene IDs and copy counts. This workspace does not rewrite keeper records.</p><label>Parent A <input value={parentA} onChange={(event) => setParentA(event.target.value)} placeholder="arctic:1, conda:1" /></label><label>Parent B <input value={parentB} onChange={(event) => setParentB(event.target.value)} placeholder="arctic:2, lavender:2" /></label>{mode === "integrity" && <label>Observed offspring <input value={offspring} onChange={(event) => setOffspring(event.target.value)} placeholder="arctic:2, conda:1" /></label>}<button type="button" onClick={mode === "what-if" ? runWhatIf : runIntegrity}>{mode === "what-if" ? "Run What-If" : "Check integrity"}</button>{resultText && <pre className="titan-feature-output">{resultText}</pre>}<Link to="/calculator">Open Genetics Calculator →</Link></section>;

  if (mode === "time-machine") return <section className="titan-feature-panel"><p className="titan-feature-kicker">⏳ GENETIC TIME MACHINE</p><h2>Compare recorded genetic states through time</h2><p>Paste dated snapshots as one per line: <code>2026-01-01|arctic:1,conda:1</code></p><textarea value={resultText} onChange={(event) => setResultText(event.target.value)} placeholder="2026-01-01|arctic:1,conda:1\n2026-06-01|arctic:1,conda:2" rows={6} /><div className="titan-feature-note">{buildGeneticTimeMachine(resultText.split("\n").map((line) => { const [date, genes] = line.split("|"); return { date, genes: parseGenes(genes ?? "").map((gene) => ({ geneId: gene.name, copies: gene.copies ?? 1 })) }; })).map((state) => <div key={state.timestamp}>{new Date(state.timestamp).toLocaleDateString("en-GB")} · {state.genes.map((gene) => `${gene.geneId}:${gene.copies}`).join(", ")}</div>)}</div></section>;

  if (mode === "family-tree") return <section className="titan-feature-panel"><p className="titan-feature-kicker">🌳 LIVING GENETIC FAMILY TREE</p><h2>Explicit ancestry only</h2><p>Family relationships are represented only when parent IDs are explicitly recorded. Missing ancestry is never guessed.</p><div className="titan-feature-note">{JSON.stringify(buildGeneticFamilyTree([]))}</div><Link to="/breeding">Open Breeding Planner →</Link></section>;

  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🧬 GENETIC BREADCRUMBS</p><h2>Trace the provenance of a claim</h2><label>Gene claims <input value={parentA} onChange={(event) => setParentA(event.target.value)} placeholder="arctic:1, conda:1" /></label><div className="titan-feature-note">{buildGeneticBreadcrumbs({ id: "workspace", name: "Entered claim set", genes: parentAGenes.map((gene) => ({ geneId: gene.name, copies: gene.copies ?? 1, status: gene.verification === "confirmed" ? "confirmed" : "reported" })) }).map((crumb) => <div key={crumb.geneId}>{crumb.geneId} · {crumb.copies} copy/copies · {crumb.status} · {crumb.source}</div>)}</div></section>;
}
