import TinyTitansAction from "../TinyTitansAction";
import TinyTitansFeedback from "../TinyTitansFeedback";
import TinyTitansIcon from "../TinyTitansIcon";
import TitanDecisionWhyCard from "../TitanIntelligence/TitanDecisionWhyCard";
import TitanDecisionQueue from "../TitanIntelligence/TitanDecisionQueue";
import type { TitanDecision } from "../../services/titanDecisionStateService";
import type { HomeUrgentReminder } from "../../hooks/useHomeDashboard";

type Props = {
  intelligenceAccess: boolean;
  accessChecked: boolean;
  coverage: number;
  quietIntelligenceSnippet: string;
  attentionDecision: TitanDecision | null;
  urgentReminder: HomeUrgentReminder | null;
};

function confidenceLabel(value: number) {
  return value >= 0.9 ? "High" : value >= 0.75 ? "Moderate" : value >= 0.5 ? "Low" : "Insufficient";
}

function reminderDestination(item: HomeUrgentReminder) {
  const base = `/reminders/${item.reminder.kind}`;
  return item.reminder.snakeId ? `${base}?snakeId=${encodeURIComponent(item.reminder.snakeId)}` : base;
}

function reminderDueLabel(item: HomeUrgentReminder) {
  const when = new Date(item.dueAt);
  if (Number.isNaN(when.getTime())) return item.urgency === "overdue" ? "Overdue" : "Due soon";
  const formatted = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(when);
  return item.urgency === "overdue" ? `Overdue · ${formatted}` : `Due soon · ${formatted}`;
}

function HomeAttentionSection({
  intelligenceAccess,
  accessChecked,
  coverage,
  quietIntelligenceSnippet,
  attentionDecision,
  urgentReminder,
}: Props) {
  return (
    <section className="tt-home-section tt-home-attention-section">
      <div className="tt-home-heading">
        <div>
          <p className="tt-home-kicker"><TinyTitansIcon name="warning" size={17} /> NEEDS ATTENTION</p>
          <h2>What is worth looking at now?</h2>
        </div>
        {intelligenceAccess && <span>{coverage}% data coverage</span>}
      </div>

      {urgentReminder ? (
        <article className={`tt-home-panel tt-attention-card tt-attention-card--${urgentReminder.urgency}`}>
          <div className="tt-attention-card-top">
            <span>{urgentReminder.reminder.snakeName || "Keeper routine"} · {urgentReminder.reminder.kind}</span>
            <strong>{urgentReminder.urgency === "overdue" ? "OVERDUE" : "DUE SOON"}</strong>
          </div>
          <h3>{urgentReminder.reminder.title}</h3>
          <p><b>When:</b> {reminderDueLabel(urgentReminder)}</p>
          {urgentReminder.reminder.description && <p><b>Remember:</b> {urgentReminder.reminder.description}</p>}
          <TinyTitansAction
            variant={urgentReminder.urgency === "overdue" ? "danger" : "primary"}
            icon="reminders"
            endIcon="forward"
            to={reminderDestination(urgentReminder)}
            label="Open reminder"
          />
        </article>
      ) : !accessChecked ? (
        <TinyTitansFeedback kind="loading">Checking intelligence access…</TinyTitansFeedback>
      ) : !intelligenceAccess ? (
        <div className="tt-home-panel tt-home-teaser">
          <div className="tt-home-teaser-icon" aria-hidden="true"><TinyTitansIcon name="observatory" size={28} /></div>
          <div>
            <span className="tt-home-teaser-label">KEEPER VIEW</span>
            <h3>{quietIntelligenceSnippet}</h3>
            <p>Your records still work normally. Optional Intelligence can turn these patterns into ranked next actions later.</p>
          </div>
        </div>
      ) : attentionDecision ? (
        <article className="tt-home-panel tt-attention-card">
          <div className="tt-attention-card-top">
            <span>{attentionDecision.animalName ?? "Your Titan"} · {attentionDecision.domain}</span>
            <strong>TOP RECORD ACTION</strong>
          </div>
          <h3>{attentionDecision.title}</h3>
          <p><b>Why:</b> {attentionDecision.why}</p>
          <p><b>Next:</b> {attentionDecision.reason}</p>
          <small><TinyTitansIcon name="info" size={14} /> {confidenceLabel(attentionDecision.confidence)} confidence</small>
          <TinyTitansAction
            variant="primary"
            icon="titan"
            endIcon="forward"
            to={attentionDecision.destination || `/snakes/${attentionDecision.animalId}/master-record`}
            label="Open next action"
          />
          <details className="tt-home-disclosure tt-home-reason-disclosure">
            <summary>Why this recommendation?</summary>
            <TitanDecisionWhyCard decision={attentionDecision} compact />
          </details>
        </article>
      ) : (
        <div className="tt-home-panel tt-home-good">
          <strong><TinyTitansIcon name="check" size={17} /> Nothing needs your attention right now.</strong>
          <p>Tiny Titans checked due keeper routines and the supported decision queue and found no stronger next action to surface.</p>
        </div>
      )}

      {intelligenceAccess && (
        <details className="tt-home-disclosure">
          <summary>See the wider decision queue</summary>
          <TitanDecisionQueue excludeDecisionId={attentionDecision?.id} limit={3} />
        </details>
      )}
    </section>
  );
}

export default HomeAttentionSection;
