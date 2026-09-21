import TinyTitansIcon from "./TinyTitansIcon";
import type { Snake } from "../types/Snake";
import type { WeightRecord } from "../types/Weight";
import { useWeightGrowthIntelligence } from "../hooks/useWeightGrowthIntelligence";
import { formatSigned } from "../lib/weightGrowthIntelligence";

type Props = { snake: Snake; history: WeightRecord[] };

export default function WeightGrowthIntelligence({ snake, history }: Props) {
  const {
    formatWeight, orderedHistory, currentWeight, trend, ageBand, weightContext,
    longestGap, intelligenceAccess, benchmarkLoading, benchmarkError, communitySummary,
    recentGapTooLarge, reassuring, currentAgeText,
  } = useWeightGrowthIntelligence(snake, history);

  return (
    <section className="tt-weight-intelligence" aria-labelledby="tt-weight-intelligence-heading">
      <div className="tt-weight-intelligence-header">
        <div>
          <p className="tt-tracker-eyebrow">Weight &amp; Growth Intelligence</p>
          <h2 id="tt-weight-intelligence-heading">Is {snake.name} on a reassuring growth track?</h2>
          <p className="tt-tracker-panel-muted">Personal trend is always available. Research context is always shown when enough age and sex information exists; community comparison appears only when Tiny Titans Intelligence is enabled.</p>
        </div>
        <span className={`tt-weight-intelligence-badge ${reassuring ? "positive" : "neutral"}`}>
          {reassuring ? <><TinyTitansIcon name="check" size={15} /> Reassuring trend</> : <><TinyTitansIcon name="search" size={15} /> Context needed</>}
        </span>
      </div>
      <div className="tt-weight-intelligence-grid"><div className="tt-weight-intelligence-main">
        <div className="tt-weight-intelligence-stats"><div><span>Current</span><strong>{formatWeight(currentWeight)}</strong></div><div><span>Age</span><strong>{currentAgeText}</strong></div><div><span>Records</span><strong>{orderedHistory.length}</strong></div><div><span>Recent trend</span><strong>{trend ? `${formatSigned(trend.weekly, formatWeight)}/wk` : "—"}</strong></div></div>
        <div className={`tt-weight-intelligence-message ${weightContext.tone}`}><strong>{weightContext.title}</strong><p>{weightContext.body}</p><p className="tt-tracker-panel-muted">{weightContext.detail}</p></div>
        <div className="tt-weight-intelligence-message"><strong>{trend ? `${trend.label} recorded weight trend` : "More weigh-ins will improve the assessment"}</strong><p>{trend ? `The latest record is ${formatSigned(trend.delta, formatWeight)} from the previous recorded weight${trend.days ? ` over ${trend.days} day${trend.days === 1 ? "" : "s"}` : ""}. This describes the recorded measurements; it is not a diagnosis of body condition.` : "Tiny Titans needs at least two dated measurements to calculate a recent change, and three or more gives a much more useful view of the individual trend."}</p></div>
        <div className="tt-weight-intelligence-context"><h3>How Tiny Titans is judging the weight</h3><p>Tiny Titans does not use a made-up “ideal grams at age X” chart. It combines <strong>age + sex + current weight + individual trend</strong>, then adds anonymised community data when the consented dataset is strong enough.</p><p>Published evidence is useful for context: one juvenile study reported <strong>12.02 ± 3.38 g</strong> at 3–4 months, while a study of healthy 3-year-old adults reported males at <strong>60–133 g</strong> and females at <strong>180–300 g</strong>. These are study populations, not health targets.</p></div>
        {recentGapTooLarge && <div className="tt-weight-intelligence-warning"><strong><TinyTitansIcon name="warning" size={16} /> Large history gap detected</strong><p>There is a {longestGap?.days}-day gap between {longestGap?.from} and {longestGap?.to}. Tiny Titans will not treat those measurements as a smooth growth trajectory.</p></div>}
        {benchmarkLoading && <div className="tt-weight-intelligence-loading"><TinyTitansIcon name="titan" size={16} /> Checking eligible Tiny Titans benchmark data…</div>}
        {benchmarkError && <div className="tt-weight-intelligence-warning"><strong>Community comparison temporarily unavailable</strong><p>{benchmarkError}</p></div>}
        {intelligenceAccess === false && <div className="tt-weight-intelligence-locked"><strong><TinyTitansIcon name="lock" size={16} /> Community comparison is optional</strong><p>Your own trend and research context remain fully available. Enable Tiny Titans Intelligence in Data &amp; Privacy to compare against anonymised eligible community data.</p></div>}
        {intelligenceAccess && communitySummary && <div className="tt-weight-intelligence-benchmark"><div className="tt-weight-intelligence-benchmark-head"><div><p className="tt-tracker-eyebrow">Community reference</p><h3>{communitySummary.position}</h3></div><span>{communitySummary.confidence}</span></div><p>For the eligible {snake.sex?.toLowerCase() || "recorded-sex"} {snake.species} cohort around {ageBand || "this age"}, the current benchmark's middle 50% is approximately <strong>{communitySummary.rangeText}</strong>.</p><p className="tt-tracker-panel-muted">This describes participating keeper data, not an ideal target. Being above or below the median does not by itself mean a snake is too large or too small.</p></div>}
        {intelligenceAccess && !communitySummary && !benchmarkLoading && <div className="tt-weight-intelligence-locked"><strong><TinyTitansIcon name="weight" size={16} /> No reliable community benchmark for this cohort yet</strong><p>Tiny Titans is still able to give the evidence-based weight context above. The community comparison will appear once the anonymised dataset has enough eligible records.</p></div>}
      </div><aside className="tt-weight-intelligence-side"><div><span>Trajectory confidence</span><strong>{orderedHistory.length >= 5 && !recentGapTooLarge ? "Higher" : orderedHistory.length >= 3 ? "Developing" : "Limited"}</strong></div><div><span>Age context</span><strong>{ageBand ? ageBand.replace("juvenile-", "juvenile · ").replace("-", " ") : "Needs hatch date"}</strong></div><div><span>Weight context</span><strong>{weightContext.tone === "positive" ? "Reassuring" : weightContext.tone === "caution" ? "Review" : "Needs context"}</strong></div><p>Weight is one data point. The app uses it alongside age, sex, trend and, when available, community data. Body condition still matters.</p></aside></div>
      <div className="tt-weight-intelligence-footer"><span>{intelligenceAccess ? <><TinyTitansIcon name="titan" size={16} /> Intelligence active</> : "Personal analysis active · community comparison off"}</span>{intelligenceAccess !== true && <button type="button" className="tt-weight-intelligence-link" onClick={() => { window.location.assign("/account/data-privacy"); }}>Manage Intelligence <TinyTitansIcon name="forward" size={14} /></button>}</div>
    </section>
  );
}
