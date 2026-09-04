import { useMemo, useState } from 'react';
import BackHomeButton from '../components/BackHomeButton';
import { morphSourceAudit, MORPH_SOURCE_AUDIT_LAST_REVIEWED, type MorphEvidenceStatus } from '../data/morphSourceAudit';
import { resolveMorphEvidenceSources } from '../data/morphEvidenceSources';
import { masterMorphs } from '../data/masterMorphDatabase';
import '../styles/morphEvidenceAudit.css';

const statusLabel: Record<MorphEvidenceStatus, string> = {
  confirmed: 'Confirmed', recognised: 'Recognised', debated: 'Debated', uncertain: 'Uncertain', combination: 'Combination', 'line-bred': 'Line-bred', polygenic: 'Polygenic',
};

export default function MorphEvidenceAudit() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<MorphEvidenceStatus | 'all'>('all');
  const knownInMaster = useMemo(() => new Set(masterMorphs.map((morph) => morph.name.toLowerCase())), []);
  const auditedNames = useMemo(() => new Set(morphSourceAudit.map((entry) => entry.name.toLowerCase())), []);
  const masterWithoutAudit = useMemo(() => masterMorphs.filter((morph) => !auditedNames.has(morph.name.toLowerCase())).map((morph) => morph.name), [auditedNames]);
  const filtered = useMemo(() => morphSourceAudit.filter((entry) => {
    const needle = query.trim().toLowerCase();
    const matchesText = !needle || entry.name.toLowerCase().includes(needle) || entry.note.toLowerCase().includes(needle) || entry.sources.some((source) => source.toLowerCase().includes(needle));
    return matchesText && (status === 'all' || entry.status === status);
  }), [query, status]);

  return <main className="page-container morph-evidence-audit">
    <BackHomeButton />
    <header className="morph-evidence-audit__hero">
      <span className="eyebrow">🧬 TINY TITANS · MORPH EVIDENCE</span>
      <h1>Western Hognose Morph Evidence Audit</h1>
      <p>Evidence is kept separate from the genetics engine. A named phenotype can be visible to keepers without being treated as a confirmed Mendelian locus.</p>
      <p className="morph-evidence-audit__reviewed">Last source review: {MORPH_SOURCE_AUDIT_LAST_REVIEWED}</p>
    </header>

    <section className="morph-evidence-audit__summary-grid">
      <div><strong>{morphSourceAudit.length}</strong><span>Evidence entries</span></div>
      <div><strong>{morphSourceAudit.filter((entry) => entry.sources.length >= 2).length}</strong><span>Multi-source entries</span></div>
      <div><strong>{masterMorphs.length}</strong><span>Master morph entries</span></div>
      <div><strong>{masterWithoutAudit.length}</strong><span>Master entries needing evidence mapping</span></div>
    </section>

    <section className="morph-evidence-audit__controls">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search morphs, terminology, source names…" aria-label="Search morph evidence" />
      <select value={status} onChange={(event) => setStatus(event.target.value as MorphEvidenceStatus | 'all')} aria-label="Filter morph evidence status">
        <option value="all">All evidence states</option>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </section>

    <section className="morph-evidence-audit__notice"><strong>Accuracy rule:</strong> source presence is not the same thing as genetic confirmation. Tiny Titans should publish a stronger claim only when the evidence supports it. Uncertain, debated, line-bred and polygenic terms remain explicitly classified.</section>

    {masterWithoutAudit.length > 0 && <section className="morph-evidence-audit__gap-panel"><div><strong>Evidence backlog</strong><p>{masterWithoutAudit.length} master morph entries currently have no matching evidence-audit record. These are intentionally visible here so they can be researched rather than silently treated as verified.</p></div><details><summary>Show unmapped entries</summary><p>{masterWithoutAudit.join(' · ')}</p></details></section>}

    <section className="morph-evidence-audit__grid">
      {filtered.map((entry) => {
        const sources = resolveMorphEvidenceSources(entry.sources);
        return <article key={entry.name} className={`morph-evidence-card morph-evidence-card--${entry.status}`}>
          <div className="morph-evidence-card__top"><h2>{entry.name}</h2><span>{statusLabel[entry.status]}</span></div>
          {entry.inheritance && <p><strong>Classification:</strong> {entry.inheritance}</p>}
          <p>{entry.note}</p>
          <div className="morph-evidence-card__sources">
            {entry.sources.map((source) => {
              const resolved = sources.find((item) => item.label === source);
              return resolved ? <a key={source} href={resolved.url} target="_blank" rel="noreferrer">{source} ↗</a> : <span key={source}>{source}</span>;
            })}
          </div>
          <small>{knownInMaster.has(entry.name.toLowerCase()) ? '✓ Present in master database' : '⚠ Evidence entry awaiting canonical master mapping'}</small>
        </article>;
      })}
    </section>
    {filtered.length === 0 && <section className="empty-state"><h2>No matching evidence</h2><p>Try another term or remove the evidence filter.</p></section>}
  </main>;
}
