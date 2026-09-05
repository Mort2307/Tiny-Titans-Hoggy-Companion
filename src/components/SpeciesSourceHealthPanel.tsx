import { useEffect, useMemo, useState } from 'react';
import { SPECIES_SOURCES } from '../data/species/speciesSources';
import { localSourceHealth, sourceHealthLabel, type SourceHealthManifest, type SourceHealthRecord } from '../data/species/sourceHealth';
import type { SnakeSpeciesRecord } from '../data/species/speciesTypes';
import '../styles/species-source-health.css';

type Props = { species: SnakeSpeciesRecord };

function badgeClass(status: SourceHealthRecord['status']): string {
  return `husbandry-source-health__status husbandry-source-health__status--${status}`;
}

export default function SpeciesSourceHealthPanel({ species }: Props) {
  const [manifest, setManifest] = useState<SourceHealthManifest | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch('/data/species-source-health.json', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<SourceHealthManifest> : null)
      .then((value) => { if (active) { setManifest(value); setLoaded(true); } })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const sources = useMemo(() => species.knowledge.sourceIds.map((id) => {
    const source = SPECIES_SOURCES[id];
    const monitored = manifest?.records?.[id];
    const fallback = localSourceHealth(source?.accessedOn, manifest?.reviewIntervalDays ?? 90);
    return {
      id,
      source,
      health: monitored ?? { ...fallback, sourceId: id },
    };
  }), [manifest, species.knowledge.sourceIds]);

  return (
    <section className="husbandry-panel husbandry-source-health">
      <p className="husbandry-eyebrow">🛰️ SOURCE MONITOR</p>
      <h2>Live source health for {species.commonNames[0] ?? species.acceptedScientificName}</h2>
      <p>These checks monitor source availability and detect source-content changes. They do <strong>not</strong> automatically change husbandry guidance; a detected change creates a review signal for Tiny Titans.</p>
      <div className="husbandry-source-health__summary">
        <div><span>Sources attached</span><strong>{sources.length}</strong></div>
        <div><span>Monitor status</span><strong>{loaded ? (manifest ? `Checked ${new Date(manifest.generatedAt).toLocaleDateString('en-GB')}` : 'Awaiting first monitor') : 'Checking…'}</strong></div>
      </div>
      <div className="husbandry-source-health__grid">
        {sources.map(({ id, source, health }) => (
          <article key={id} className="husbandry-source-health__card">
            <div>
              <strong>{source?.title ?? `Unresolved source: ${id}`}</strong>
              <span>{source?.publisher ?? 'Tiny Titans research queue'}</span>
            </div>
            <span className={badgeClass(health.status)}>{health.status === 'changed' ? '🟠' : health.status === 'current' ? '🟢' : health.status === 'review-due' ? '🟡' : '🔴'} {sourceHealthLabel(health.status)}</span>
            {health.httpStatus && <small>HTTP {health.httpStatus}{health.finalUrl ? ` · ${health.finalUrl}` : ''}</small>}
            {health.checkedAt && <small>Checked {new Date(health.checkedAt).toLocaleString('en-GB')}</small>}
            {health.message && <small>{health.message}</small>}
            {source?.url && source.url !== '#' && <a href={source.url} target="_blank" rel="noreferrer">Open source ↗</a>}
          </article>
        ))}
      </div>
      <p className="husbandry-muted">Evidence scope still comes from the curated Tiny Titans source catalogue. The monitor tells us when that catalogue deserves another human review.</p>
    </section>
  );
}
