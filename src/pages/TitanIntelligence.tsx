import { Link, useSearchParams } from "react-router-dom";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { tinyTitansPageRegistry } from "../config/tinyTitansPageRegistry";
import { TITAN_V50_FEATURES } from "../intelligence/v50/titanV50FeatureMatrix";
import { FEATURE_SUMMARIES } from "../intelligence/v50/titanV50Runtime";
import TitanIntelligenceGrowthPanel from "../components/TitanIntelligence/TitanIntelligenceGrowthPanel";
import AskTitan from "../components/TitanIntelligence/AskTitan";
import PaidTierGate from "../components/PaidTierGate";
import TitanLiveIntelligencePanel from "../components/TitanIntelligence/TitanLiveIntelligencePanel";
import SnakeTitanIntelligencePage from "./SnakeTitanIntelligencePage";
import "../components/TitanIntelligence/TitanLiveIntelligencePanel.css";
import "./TitanIntelligence.css";

const layerLabels: Record<string, { label: string; icon: "reptile" | "genetics" | "husbandry" | "community" | "knowledge" | "titanIntelligence" }> = {
  animal: { label: "Animal Intelligence", icon: "reptile" },
  genetics: { label: "Genetics Intelligence", icon: "genetics" },
  husbandry: { label: "Husbandry Intelligence", icon: "husbandry" },
  community: { label: "Community Intelligence", icon: "community" },
  learning: { label: "Learning Intelligence", icon: "knowledge" },
  platform: { label: "Titanverse / Platform Intelligence", icon: "titanIntelligence" },
};

function TitanIntelligenceContent() {
  const [params] = useSearchParams();
  if (params.get("snakeId")) return <SnakeTitanIntelligencePage />;
  const foundation = TITAN_V50_FEATURES.filter((feature) => feature.status === "foundation").length;
  const wired = TITAN_V50_FEATURES.filter((feature) => feature.status === "wired").length;
  const validated = TITAN_V50_FEATURES.filter((feature) => feature.status === "validated").length;
  const runtimeCovered = Object.keys(FEATURE_SUMMARIES).length;
  const grouped = Object.entries(layerLabels).map(([layer, meta]) => ({ layer, label: meta.label, icon: meta.icon, features: TITAN_V50_FEATURES.filter((feature) => feature.layer === layer) })).filter((group) => group.features.length);
  return <main className="dashboard titan-intelligence-page">
    <section className="titan-intelligence-hero"><div><p className="titan-eyebrow"><TinyTitansIcon name="titanIntelligence" size={18} /> POWERHOUSE INTELLIGENCE · V50</p><h1><TinyTitansIcon name="titanIntelligence" size={38} /> The keeper brain is being built.</h1><p>One intelligence layer connects your animal records, genetics, husbandry, learning and community data. It only makes a claim when the underlying records support it.</p></div><div className="titan-progress-card" aria-label={`${runtimeCovered} of ${TITAN_V50_FEATURES.length} V50 capabilities have a runtime contract`}><strong>{runtimeCovered}/{TITAN_V50_FEATURES.length}</strong><span>Capability runtime coverage</span><small>Every V50 capability has a runtime adapter. A capability still marked planned is not being presented as production-complete merely because its adapter exists.</small></div></section>
    <TitanIntelligenceGrowthPanel/>
    <PaidTierGate entitlement="titan_intelligence" fallback={<section className="titan-intelligence-section"><div className="titan-section-heading"><div><p className="titan-eyebrow">ASK TITAN</p><h2>Ask Titan is part of the paid intelligence layer.</h2><p>Paid workspaces unlock the authenticated Titan chat, with personal and workspace data boundaries enforced server-side.</p></div><Link className="titan-page-card" to="/plans?tier=titan_pro"><span><TinyTitansIcon name="titanIntelligence" size={23} /></span><div><strong>Explore Titan Intelligence plans</strong><small>Choose a paid workspace to open Ask Titan.</small></div><b>→</b></Link></div></section>}>
      <AskTitan workspaceKind="personal" />
    </PaidTierGate>
    <TitanLiveIntelligencePanel/>
    <section className="titan-intelligence-stats" aria-label="V50 implementation status"><div><strong>{foundation}</strong><span>Foundation</span></div><div><strong>{wired}</strong><span>Matrix wired</span></div><div><strong>{validated}</strong><span>Validated</span></div><div><strong>{TITAN_V50_FEATURES.length - foundation - wired - validated}</strong><span>Feature build remaining</span></div></section>
    <section className="titan-intelligence-section"><div className="titan-section-heading"><div><p className="titan-eyebrow">HOW IT THINKS</p><h2>One action. Multiple consequences.</h2></div></div><div className="titan-flow"><span><TinyTitansIcon name="edit" size={18} /> Record something</span><b>→</b><span><TinyTitansIcon name="titanIntelligence" size={18} /> Recalculate context</span><b>→</b><span><TinyTitansIcon name="search" size={18} /> Find supported patterns</span><b>→</b><span><TinyTitansIcon name="warning" size={18} state="success" /> Surface the useful next step</span></div><p className="titan-boundary">The intelligence layer is deliberately conservative: uncertain genetics stay uncertain, missing records stay missing, and medical signals are never presented as diagnoses.</p></section>
    {grouped.map((group) => <section className="titan-intelligence-section" key={group.layer}><div className="titan-section-heading"><div><p className="titan-eyebrow"><TinyTitansIcon name={group.icon} size={18} /> {group.label}</p><h2>{group.features.length} connected capabilities</h2></div></div><div className="titan-feature-grid">{group.features.map((feature) => <article className="titan-feature-card" key={feature.id}><div className="titan-feature-top"><span>#{feature.id}</span><span className={`titan-status titan-status-${feature.status}`}>{feature.status}</span></div><h3>{feature.name}</h3><p>{FEATURE_SUMMARIES[feature.id] ?? "Capability summary is not recorded."}</p><Link to={`/titan-intelligence/feature/${feature.id}`}>Open dedicated experience →</Link></article>)}</div></section>)}
    <section className="titan-intelligence-section titan-navigation-section"><div className="titan-section-heading"><div><p className="titan-eyebrow">CONNECTED PAGES</p><h2>Jump straight into the existing system</h2></div></div><div className="titan-page-grid">{tinyTitansPageRegistry.map((page) => <Link className="titan-page-card" to={page.path} key={page.id}><span><TinyTitansIcon name={page.icon} size={23} /></span><div><strong>{page.label}</strong><small>{page.description}</small></div><b>→</b></Link>)}</div></section>
  </main>;
}

export default function TitanIntelligence() { return <TitanIntelligenceContent />; }
