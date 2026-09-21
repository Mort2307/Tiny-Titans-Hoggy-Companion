import { useNavigate } from "react-router-dom";
import type { Snake } from "../types/Snake";
import { useSnakeProfileReviewGuide } from "../hooks/useSnakeProfileReviewGuide";
import "../styles/snake-profile-review-guide.css";

const MORPHMARKET_URL = "https://www.morphmarket.com/all/c/reptiles";

export default function SnakeProfileReviewGuide({ snake }: { snake: Snake }) {
  const navigate = useNavigate();
  const { data, alwaysUseful } = useSnakeProfileReviewGuide(snake);

  const quickLinks = [
    ["📋", "Master Record", `/snakes/${snake.id}/master-record`],
    ["🌡️", "Husbandry", `/husbandry/${snake.id}`],
    ["⚖️", "Weight", `/weights/${snake.id}`],
    ["🍽️", "Feeding", `/feeding/${snake.id}`],
  ] as const;

  return (
    <section className={`tt-profile-review-guide tt-profile-review-guide--${data.tone}`} aria-labelledby="snake-profile-review-guide-heading">
      <div className="tt-profile-review-guide-header">
        <div><p className="tt-intelligence-kicker">SELECTED SNAKE</p><h2 id="snake-profile-review-guide-heading">{snake.name}</h2></div>
        <span className="tt-profile-review-guide-status">{data.tone === "attention" ? "🔴" : data.tone === "watch" ? "🟠" : "🟢"} {data.statusLabel}</span>
      </div>

      <p className="tt-profile-review-guide-intro">
        {data.areas.length
          ? `${snake.name} has something worth reviewing, but Tiny Titans will not assume a cause without enough evidence. The flagged areas below are the records that will add the most useful evidence next.`
          : `${snake.name} has no immediate review flag from the records currently available. Keep the core records current so Tiny Titans can build a stronger individual baseline over time.`}
      </p>

      <div className="tt-profile-review-guide-section">
        <h3>Please review/update these logs:</h3>
        {data.areas.length ? (
          <div className="tt-profile-review-guide-list">
            {data.areas.map((area) => (
              <article key={area.id} className="tt-profile-review-guide-item">
                <div className="tt-profile-review-guide-item-top">
                  <span className="tt-profile-review-guide-item-title">{area.icon} {area.label}</span>
                  <button type="button" onClick={() => navigate(area.route)}>Open {area.label} →</button>
                </div>
                <p>{area.reason}</p>
                <small><strong>What Tiny Titans is looking for:</strong> {area.fields}</small>
              </article>
            ))}
          </div>
        ) : (
          <p className="tt-profile-review-guide-empty">Nothing is currently flagged. Continue recording the actual events below and the profile will reassess as new evidence arrives.</p>
        )}
      </div>

      <div className="tt-profile-review-guide-coverage">
        <strong>{data.coverage}% record coverage</strong>
        <span>Coverage reflects useful data fields currently available; it is not a health score or husbandry grade.</span>
      </div>

      <details className="tt-profile-review-guide-details">
        <summary>What information helps Tiny Titans build the best picture?</summary>
        <div className="tt-profile-review-guide-all">
          {alwaysUseful.map((area) => <div key={area.id}><strong>{area.icon} {area.label}</strong><span>{area.fields}</span></div>)}
          <div><strong>📋 Master Record</strong><span>Species, sex, hatch date, arrival/acquisition, breeder/origin, genetics, body length and important keeper notes.</span></div>
        </div>
      </details>

      <nav className="tt-profile-review-guide-links" aria-label={`${snake.name} record links`}>
        {quickLinks.map(([icon, label, path]) => <button key={label} type="button" onClick={() => navigate(path)}>{icon} {label}</button>)}
      </nav>

      <a className="tt-profile-review-guide-market" href={MORPHMARKET_URL} target="_blank" rel="noopener noreferrer">
        <span><strong>🛒 Explore MorphMarket</strong><small>External marketplace resource · search this species and its traits on MorphMarket.</small></span>
        <span aria-hidden="true">↗</span>
      </a>
      <p className="tt-profile-review-guide-market-note">Tiny Titans is not presenting MorphMarket as a sponsor or affiliate. This is simply a direct external resource for users who want to browse current listings and traits.</p>
    </section>
  );
}
