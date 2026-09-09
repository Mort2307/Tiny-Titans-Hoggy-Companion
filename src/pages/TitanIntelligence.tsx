import { Link, useSearchParams } from 'react-router-dom';
import { tinyTitansPageRegistry } from '../config/tinyTitansPageRegistry';
import { TITAN_V50_FEATURES } from '../intelligence/v50/titanV50FeatureMatrix';
import { FEATURE_SUMMARIES } from '../intelligence/v50/titanV50Runtime';
import TitanLiveIntelligencePanel from '../components/TitanIntelligence/TitanLiveIntelligencePanel';
import TitanFeedbackLearningBridge from '../components/TitanIntelligence/TitanFeedbackLearningBridge';
import SnakeTitanIntelligencePage from './SnakeTitanIntelligencePage';
import '../components/TitanIntelligence/TitanLiveIntelligencePanel.css';
import './TitanIntelligence.css';

const layerLabels: Record<string, string> = {
  animal: '🐍 Animal Intelligence', genetics: '🧬 Genetics Intelligence', husbandry: '🌡️ Husbandry Intelligence',
  community: '🌍 Community Intelligence', learning: '📚 Learning Intelligence', platform: '🔥 Titanverse / Platform Intelligence',
};

function TitanIntelligence() {
  const [params] = useSearchParams();
  if (params.get('snakeId')) return <SnakeTitanIntelligencePage />;
  const foundation = TITAN_V50_FEATURES.filter((feature) => feature.status === 'foundation').length;
  const wired = TITAN_V50_FEATURES.filter((feature) => feature.status === 'wired').length;
  const validated = TITAN_V50_FEATURES.filter((feature) => feature.status === 'validated').length;
  const runtimeCovered = Object.keys(FEATURE_SUMMARIES).length;
  const grouped = Object.entries(layerLabels).map(([layer, label]) => ({ layer, label, features: TITAN_V50_FEATURES.filter((feature) => feature.layer === layer) })).filter((group) => group.features.length);
  return <main className='dashboard titan-intelligence-page'>
    <TitanFeedbackLearningBridge />
    <section className='titan-intelligence-hero'><div><p className='titan-eyebrow'>TITAN INTELLIGENCE · V50</p><h1>The keeper brain is being built.</h1><p>One intelligence layer connects your animal records, genetics, husbandry, learning and community data. It only makes a claim when the underlying records support it.</p></div><div className='titan-progress-card' aria-label={`${runtimeCovered} of ${TITAN_V50_FEATURES.length} V50 capabilities have a runtime contract`}><strong>{runtimeCovered}/{TITAN_V50_FEATURES.length}</strong><span>Capability runtime coverage</span><small>Every V50 capability has a runtime adapter. A capability still marked planned is not being presented as production-complete merely because its adapter exists.</small></div></section>
    <TitanLiveIntelligencePanel />
    <section className='titan-intelligence-stats' aria-label='V50 implementation status'><div><strong>{foundation}</strong><span>Foundation</span></div><div><strong>{wired}</strong><span>Matrix wired</span></div><div><strong>{validated}</strong><span>Validated</span></div><div><strong>{TITAN_V50_FEATURES.length - foundation - wired - validated}</strong><span>Feature build remaining</span></div></section>
    <section className='titan-intelligence-section'><div className='titan-section-heading'><div><p className='titan-eyebrow'>HOW IT THINKS</p><h2>One action. Multiple consequences.</h2></div></div><div className='titan-flow'><span>📝 Record something</span><b>→</b><span>🧠 Recalculate context</span><b>→</b><span>🔎 Find supported patterns</span><b>→</b><span>⚡ Surface the useful next step</span></div><p className='titan-boundary'>The intelligence layer is deliberately conservative: uncertain genetics stay uncertain, missing records stay missing, and medical signals are never presented as diagnoses.</p></section>
    {grouped.map((group) => <section className='titan-intelligence-section' key={group.layer}><div className='titan-section-heading'><div><p className='titan-eyebrow'>{group.label}</p><h2>{group.features.length} connected capabilities</h2></div></div><div className='titan-feature-grid'>{group.features.map((feature) => <article className='titan-feature-card' key={feature.id}><div className='titan-feature-top'><span>#{feature.id}</span><span className={`titan-status titan-status-${feature.status}`}>{feature.status}</span></div><h3>{feature.name}</h3><p>{FEATURE_SUMMARIES[feature.id] ?? 'Capability summary is not recorded.'}</p><Link to={`/titan-intelligence/feature/${feature.id}`}>Open dedicated experience →</Link></article>)}</div></section>)}
    <section className='titan-intelligence-section titan-navigation-section'><div className='titan-section-heading'><div><p className='titan-eyebrow'>CONNECTED PAGES</p><h2>Jump straight into the existing system</h2></div></div><div className='titan-page-grid'>{tinyTitansPageRegistry.map((page) => <Link className='titan-page-card' to={page.path} key={page.id}><span>{page.icon}</span><div><strong>{page.label}</strong><small>{page.description}</small></div><b>→</b></Link>)}</div></section>
  </main>;
}
export default TitanIntelligence;
