import { useNavigate } from "react-router-dom";
import type { Snake } from "../../types/Snake";
import type { SnakeIntelligence } from "../../services/snakeIntelligenceService";
import type { IntelligenceSummary } from "../../services/intelligenceSummaryService";
import IntelligencePanel from "../IntelligencePanel";
import ExplainableIntelligenceSummary from "../ExplainableIntelligenceSummary";
import IntelligenceDataQualityPanel from "../IntelligenceDataQualityPanel";
import TinyTitansIcon from "../TinyTitansIcon";

type Props = { snake: Snake; intelligenceAccess: boolean | null; intelligenceLoading: boolean; intelligence: SnakeIntelligence | null; benchmarkLoading: boolean; benchmarkError: string; summary: IntelligenceSummary | null; };

export default function SnakeProfileIntelligenceSection({ snake, intelligenceAccess, intelligenceLoading, intelligence, benchmarkLoading, benchmarkError, summary }: Props) {
  const navigate = useNavigate();
  return (
    <section className="snake-profile-intelligence" aria-labelledby="snake-profile-intelligence-heading">
      <h2 id="snake-profile-intelligence-heading" className="snake-profile-intelligence-heading">Tiny Titans Community &amp; Advanced Intelligence</h2>
      <p className="snake-profile-intelligence-subtitle">Optional community benchmarking and longer-form interpretation live here, while personal review actions stay above.</p>
      {intelligenceAccess === false && <section className="tt-intelligence-panel tt-intelligence-locked"><p className="tt-intelligence-kicker">TINY TITANS INTELLIGENCE</p><h2 className="tt-intelligence-title">Full Intelligence is optional</h2><p className="tt-intelligence-meta">Your personal tracking still works normally. Advanced Tiny Titans Intelligence is available when you choose to contribute eligible husbandry data anonymously to the growing Tiny Titans knowledge base.</p><p className="tt-intelligence-meta"><strong>Your choice:</strong> optional husbandry data sharing is currently off.</p><button type="button" className="tt-intelligence-action" onClick={() => navigate("/account/data-privacy")}>Enable Intelligence in Data &amp; Privacy <TinyTitansIcon name="forward" size={13} /></button></section>}
      {intelligenceAccess && <IntelligenceDataQualityPanel snake={snake} />}
      {intelligenceAccess && benchmarkLoading && <section className="tt-intelligence-panel" aria-live="polite"><p className="tt-intelligence-kicker">TINY TITANS INTELLIGENCE</p><h2 className="tt-intelligence-title">Building your comparison…</h2><p className="tt-intelligence-meta">Checking the consent-filtered age-aware community cohort.</p></section>}
      {intelligenceAccess && benchmarkError && <section className="tt-intelligence-panel"><p className="tt-intelligence-kicker">TINY TITANS INTELLIGENCE</p><h2 className="tt-intelligence-title">Community comparison unavailable</h2><p className="tt-intelligence-meta">The community benchmark is temporarily unavailable. Your personal records are unaffected.</p></section>}
      {summary && !benchmarkLoading && !benchmarkError && <ExplainableIntelligenceSummary summary={summary} />}
      {intelligenceLoading && <section className="tt-intelligence-panel" aria-live="polite"><p className="tt-intelligence-kicker">PERSONALISED INTELLIGENCE</p><h2 className="tt-intelligence-title">Reading {snake.name} history…</h2><p className="tt-intelligence-meta">Tiny Titans is checking the records already stored for this snake.</p></section>}
      {intelligenceAccess && intelligence && <IntelligencePanel intelligence={intelligence} />}
      {intelligenceAccess && !intelligenceLoading && !intelligence && <section className="tt-intelligence-panel"><p className="tt-intelligence-kicker">PERSONALISED INTELLIGENCE</p><h2 className="tt-intelligence-title">Baseline still building</h2><p className="tt-intelligence-meta">Tiny Titans could not build a current intelligence record for {snake.name}. Record another weight, feeding or shed and the engine can try again.</p></section>}
    </section>
  );
}
