import type { BenchmarkMetric, CommunityBenchmarkDataset } from "../services/benchmarkIntelligenceService";
import { benchmarkIsUsable, confidenceLabel } from "../services/benchmarkIntelligenceService";

type Props = { benchmark: CommunityBenchmarkDataset | null; loading?: boolean; error?: string };

function Metric({ metric, title }: { metric?: BenchmarkMetric; title: string }) {
  if (!metric) return <div className="tt-benchmark-detail"><strong>{title}</strong><p>Not enough comparable data yet.</p></div>;
  if (!benchmarkIsUsable(metric) || metric.lowerQuartile === undefined || metric.upperQuartile === undefined) {
    return <div className="tt-benchmark-detail"><strong>{title}</strong><p>{confidenceLabel(metric.confidence)} · {metric.sampleSize} records · {metric.contributorCount} contributors.</p></div>;
  }
  return <div className="tt-benchmark-detail"><strong>{title}</strong><p>{metric.lowerQuartile.toFixed(1)}–{metric.upperQuartile.toFixed(1)} {metric.unit} middle 50%</p><small>{confidenceLabel(metric.confidence)} · {metric.sampleSize} records · {metric.contributorCount} contributors</small></div>;
}

export default function CommunityBenchmarkDetails({ benchmark, loading = false, error = "" }: Props) {
  if (loading) return <section className="tt-intelligence-panel"><p className="tt-intelligence-kicker">COMMUNITY BENCHMARKS</p><h2 className="tt-intelligence-title">Building comparison context…</h2><p className="tt-intelligence-meta">Checking consent-filtered weight, feeding and shed patterns.</p></section>;
  if (error) return <section className="tt-intelligence-panel"><p className="tt-intelligence-kicker">COMMUNITY BENCHMARKS</p><p className="tt-intelligence-meta">Community benchmarks are temporarily unavailable. Personal tracking is unaffected.</p></section>;
  if (!benchmark) return null;
  const weight = benchmark.metrics.find((m) => m.metric === "weight");
  const feeding = benchmark.metrics.find((m) => m.metric === "feedingInterval");
  const shed = benchmark.metrics.find((m) => m.metric === "shedInterval");
  return <section className="tt-intelligence-panel"><p className="tt-intelligence-kicker">COMMUNITY BENCHMARKS · AGE AWARE</p><h2 className="tt-intelligence-title">Current recorded patterns</h2><p className="tt-intelligence-meta">{benchmark.contributorCount} contributors · {benchmark.snakeCount} contributing snakes · cohort <strong>{benchmark.cohortKey.replaceAll("|", " · ")}</strong></p><div className="tt-benchmark-details"><Metric metric={weight} title="⚖️ Weight" /><Metric metric={feeding} title="🍽️ Feeding interval" /><Metric metric={shed} title="🐍 Shed interval" /></div><p className="tt-intelligence-meta"><em>These are anonymised observational patterns from consenting contributors, not care targets, medical thresholds or veterinary advice.</em></p></section>;
}
