import { useMemo, useState } from 'react';
import BackHomeButton from '../components/BackHomeButton';
import { morphSourceAudit, MORPH_SOURCE_AUDIT_LAST_REVIEWED, type MorphEvidenceStatus } from '../data/morphSourceAudit';
import { masterMorphs } from '../data/masterMorphDatabase';
import '../styles/morphEvidenceAudit.css';

const statusLabel: Record<MorphEvidenceStatus, string> = {
  confirmed: 'Confirmed', recognised: 'Recognised', debated: 'Debated', uncertain: 'Uncertain', combination: 'Combination', 'line-bred': 'Line-bred', polygenic: 'Polygenic',
};

export default function MorphEvidenceAudit() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<MorphEvidenceStatus | 'all'>('all');
  const filtered = useMemo(() => morphSourceAudit.filter((entry) => {
    const matchesText = !query.trim() || entry.name.toLowerCase().includes(query.trim().toLowerCase()) || entry.note.toLowerCase().includes(query.trim().toLowerCase());
    return matchesText && (status === 'all' || entry.status === status);
  }), [query, status]);
  const knownInMaster = new Set(masterMorphs.map((morph) => morph.name.toLowerCase()));

  return <main className="page-container morph-evidence-audit">
    <BackHomeButton />
    <header className="morph-evidence-audit__hero">
      <span className="eyebrow">🧬 TINY TITANS · MORPH EVIDENCE</span>
      <h1>Western Hognose Morph Evidence Audit</h1>
      <p>One evidence layer for recognised genetics, named combinations, polygenic/line-bred traits and terminology that should not be presented as proven Mendelian genetics.</p>
      <p className="morph-evidence-audit__reviewed">Last source review: {MORPH_SOURCE_AUDIT_LAST_REVIEWED}</p>
    </header>
    <section className="morph-evidence-audit__controls">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search morphs, terminology or evidence…" aria-label="Search morph evidence" />
      <select value={status} onChange={(event) => setStatus(event.target.value as MorphEvidenceStatus | 'all')} aria-label="Filter morph evidence status">
        <option value="all">All evidence states</option>{Object.entries(statusLabel).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </section>
    <section className="morph-evidence-audit__notice"><strong>Important:</strong> presence in this audit does not automatically mean a term is a confirmed gene. Tiny Titans keeps uncertain/debated terminology visible while preventing unsupported assumptions from becoming genetic facts.</section>
    <section className="morph-evidence-audit__grid">
      {filtered.map((entry) => <article key={entry.name} className={`morph-evidence-card morph-evidence-card--${entry.status}`}>
        <div className="morph-evidence-card__top"><h2>{entry.name}</h2><span>{statusLabel[entry.status]}</span></div>
        {entry.inheritance && <p><strong>Classification:</strong> {entry.inheritance}</p>}
        <p>{entry.note}</p>
        <div className="morph-evidence-card__sources">{entry.sources.map((source) => <span key={source}>{source}</span>)}</div>
        <small>{knownInMaster.has(entry.name.toLowerCase()) ? '✓ Present in master database' : '⚠ Evidence entry awaiting canonical master mapping'}</small>
      </article>)}
    </section>
    {filtered.length === 0 && <section className="empty-state"><h2>No matching evidence</h2><p>Try another term or remove the evidence filter.</p></section>}
  </main>;
}
