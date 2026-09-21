import { formatDaysSinceFeeding } from "../../utils/feedingSummary";
import type { FeedingRecord } from "../../types/Feeding";
type Props = { feedings: FeedingRecord[]; acceptanceRate: number; lastFeeding?: FeedingRecord; lastSuccessfulFeeding?: FeedingRecord; };
export default function FeedingOverviewStats({ feedings, acceptanceRate, lastFeeding, lastSuccessfulFeeding }: Props) {
  return <section id="feeding-overview" className="tt-tracker-stat-grid">
    <div className="tt-tracker-stat"><span>Last feed attempt</span><strong>{lastFeeding?.date ? formatDaysSinceFeeding(lastFeeding.date) : "—"}</strong><small>{lastFeeding?.foodType ?? "No feeding attempt recorded"}</small></div>
    <div className="tt-tracker-stat"><span>Last successful feed</span><strong>{lastSuccessfulFeeding?.date ? formatDaysSinceFeeding(lastSuccessfulFeeding.date) : "—"}</strong><small>{lastSuccessfulFeeding ? "Accepted" : "No successful feed recorded"}</small></div>
    <div className="tt-tracker-stat"><span>Acceptance</span><strong>{acceptanceRate}%</strong></div>
    <div className="tt-tracker-stat"><span>Total feeds</span><strong>{feedings.length}</strong></div>
  </section>;
}