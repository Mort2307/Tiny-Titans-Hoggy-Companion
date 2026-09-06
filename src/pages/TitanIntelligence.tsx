import { Link } from "react-router-dom";
import { tinyTitansPageRegistry } from "../config/tinyTitansPageRegistry";
import { TITAN_V50_FEATURES } from "../intelligence/v50/titanV50FeatureMatrix";
import "./TitanIntelligence.css";

const layerLabels: Record<string, string> = {
  animal: "🐍 Animal Intelligence",
  genetics: "🧬 Genetics Intelligence",
  husbandry: "🌡️ Husbandry Intelligence",
  community: "🌍 Community Intelligence",
  learning: "📚 Learning Intelligence",
  titanverse: "🔥 Titanverse",
};

function TitanIntelligence() {
  const foundation = TITAN_V50_FEATURES.filter((feature) => feature.status === "foundation").length;
  const wired = TITAN_V50_FEATURES.filter((feature) => feature.status === "wired").length;
  const validated = TITAN_V50_FEATURES.filter((feature) => feature.status === "validated").length;
  const liveCount = foundation + wired + validated;
  const percent = Math.round((liveCount / TITAN_V50_FEATURES.length) * 100);
  const grouped = Object.entries(layerLabels).map(([layer, label]) => ({ layer, label, features: TITAN_V50_FEATURES.filter((feature) => feature.layer === layer) })).filter((group) => group.features.length);
  const safeDestinations = new Set(tinyTitansPageRegistry.map((page) => page.path));

  return (
    <main className="dashboard titan-intelligence-page">
      <section className="titan-intelligence-hero">
        <div>
          <p className="titan-eyebrow">TITAN INTELLIGENCE · V50</p>
          <h1>The keeper brain is being built.</h1>
          <p>One intelligence layer connects your animal records, genetics, husbandry, learning and community data. It only makes a claim when the underlying records support it.</p>
        </div>
        <div className="titan-progress-card" aria-label={`${percent}% of V50 features have a foundation or implementation status`}>
          <strong>{percent}%</strong>
          <span>V50 capability foundation</span>
          <small>{liveCount} of {TITAN_V50_FEATURES.length} capabilities are beyond the planning stage.</small>
        </div>
      </section>

      <section className="titan-intelligence-stats" aria-label="V50 implementation status">
        <div><strong>{foundation}</strong><span>Foundation</span></div>
        <div><strong>{wired}</strong><span>Wired</span></div>
        <div><strong>{validated}</strong><span>Validated</span></div>
        <div><strong>{TITAN_V50_FEATURES.length - liveCount}</strong><span>Next build</span></div>
      </section>

      <section className="titan-intelligence-section">
        <div className="titan-section-heading"><div><p className="titan-eyebrow">HOW IT THINKS</p><h2>One action. Multiple consequences.</h2></div></div>
        <div className="titan-flow"><span>📝 Record something</span><b>→</b><span>🧠 Recalculate context</span><b>→</b><span>🔎 Find supported patterns</span><b>→</b><span>⚡ Surface the useful next step</span></div>
        <p className="titan-boundary">The intelligence layer is deliberately conservative: uncertain genetics stay uncertain, missing records stay missing, and medical signals are never presented as diagnoses.</p>
      </section>

      {grouped.map((group) => (
        <section className="titan-intelligence-section" key={group.layer}>
          <div className="titan-section-heading"><div><p className="titan-eyebrow">{group.label}</p><h2>{group.features.length} connected capabilities</h2></div></div>
          <div className="titan-feature-grid">
            {group.features.map((feature) => (
              <article className="titan-feature-card" key={feature.id}>
                <div className="titan-feature-top"><span>#{feature.id}</span><span className={`titan-status titan-status-${feature.status}`}>{feature.status}</span></div>
                <h3>{feature.name}</h3>
                <p>{feature.intelligence}</p>
                {feature.route && safeDestinations.has(feature.route) ? <Link to={feature.route}>Open connected experience →</Link> : <small className="titan-feature-not-ready">Destination is deliberately not exposed until its page exists.</small>}
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="titan-intelligence-section titan-navigation-section">
        <div className="titan-section-heading"><div><p className="titan-eyebrow">CONNECTED PAGES</p><h2>Jump straight into the existing system</h2></div></div>
        <div className="titan-page-grid">
          {tinyTitansPageRegistry.map((page) => <Link className="titan-page-card" to={page.path} key={page.id}><span>{page.icon}</span><div><strong>{page.label}</strong><small>{page.description}</small></div><b>→</b></Link>)}
        </div>
      </section>
    </main>
  );
}

export default TitanIntelligence;
