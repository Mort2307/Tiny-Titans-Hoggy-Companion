import { useEffect, useState } from "react";
import TinyTitansIcon from "./TinyTitansIcon";
import { getINaturalistEcologyContext, type INaturalistEcologyContext } from "../services/iNaturalistEcologyService";

export default function INaturalistEcologyPanel({ scientificName }: { scientificName: string }) {
  const [context, setContext] = useState<INaturalistEcologyContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setUnavailable(false);
    void getINaturalistEcologyContext(scientificName)
      .then((next) => { if (active) setContext(next); })
      .catch(() => { if (active) setUnavailable(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [scientificName]);

  return <section className="universal-species-panel universal-ecology-panel">
    <div className="universal-species-panel-heading">
      <div><p className="eyebrow">WILD ECOLOGY · INATURALIST</p><h2>Wild observation context</h2></div>
      {context?.sourceUrl && <a className="universal-species-marketplace-link" href={context.sourceUrl} target="_blank" rel="noreferrer">Open source <TinyTitansIcon name="forward" size={14} /></a>}
    </div>
    <div className="universal-health-boundary"><strong>Ecology boundary</strong><p>Public wild observations are ecological context only. Tiny Titans never converts local weather, sighting locations or wild behaviour into captive husbandry targets.</p></div>
    {loading ? <p>Loading cached wild observation context…</p> : unavailable || !context ? <p>Wild observation context is temporarily unavailable. The species profile and evidence-backed care data are unaffected.</p> : <>
      <div className="universal-numeric-grid">
        <div><span>Matched taxon</span><strong>{context.matchedName}</strong>{context.commonName && <small>{context.commonName}</small>}</div>
        <div><span>Research-grade observations</span><strong>{context.totalResearchGradeObservations.toLocaleString("en-GB")}</strong><small>Current iNaturalist total at last cache refresh</small></div>
        <div><span>Cache</span><strong>{context.stale ? "Stale fallback" : "24-hour cache"}</strong><small>{context.fetchedAtMs ? new Date(context.fetchedAtMs).toLocaleString("en-GB") : "Refresh date unavailable"}</small></div>
      </div>
      {context.recentObservations.length > 0 && <div className="universal-ecology-observations">
        {context.recentObservations.slice(0, 6).map((observation) => <a key={observation.id} href={observation.uri} target="_blank" rel="noreferrer">
          <span>{observation.observedOn || "Date unavailable"}</span>
          <strong>{observation.placeGuess || "Location obscured / unavailable"}</strong>
          <small>{observation.qualityGrade || "observation"} · iNaturalist #{observation.id}</small>
        </a>)}
      </div>}
      <p className="universal-ecology-attribution"><TinyTitansIcon name="info" size={15} /> Source: iNaturalist API. Tiny Titans caches this read-only context and links observations back to the source.</p>
    </>}
  </section>;
}
