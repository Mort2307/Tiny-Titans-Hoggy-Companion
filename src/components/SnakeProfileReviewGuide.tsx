import { useNavigate } from "react-router-dom";
import type { Snake } from "../types/Snake";
import { useSnakeProfileReviewGuide } from "../hooks/useSnakeProfileReviewGuide";
import "../styles/snake-profile-review-guide.css";
import TinyTitansIcon, { type TinyTitansIconName } from "./TinyTitansIcon";

const MORPHMARKET_URL = "https://www.morphmarket.com/all/c/reptiles";

export default function SnakeProfileReviewGuide({ snake }: { snake: Snake }) {
  const navigate = useNavigate();
  const { data, alwaysUseful } = useSnakeProfileReviewGuide(snake);

  const quickLinks: readonly [TinyTitansIconName, string, string][] = [
    ["knowledge", "Master Record", `/snakes/${snake.id}/master-record`],
    ["husbandry", "Husbandry", `/husbandry/${snake.id}`],
    ["weight", "Weight", `/weights/${snake.id}`],
    ["feeding", "Feeding", `/feeding/${snake.id}`],
  ];

  return (
    <section className={`tt-profile-review-guide tt-profile-review-guide--${data.tone}`} aria-labelledby="snake-profile-review-guide-heading">
      <div className="tt-profile-review-guide-header">
        <div><p className="tt-intelligence-kicker">SELECTED SNAKE</p><h2 id="snake-profile-review-guide-heading">{snake.name}</h2></div>
        <span className="tt-profile-review-guide-status"><TinyTitansIcon name={data.tone === "attention" ? "warning" : data.tone === "watch" ? "reminders" : "check"} size={14} /> {data.statusLabel}</span>
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
                  <span className="tt-profile-review-guide-item-title"><TinyTitansIcon name={area.icon} size={14} /> {area.label}</span>
                  <button type="button" onClick={() => navigate(area.route)}>Open {area.label} <TinyTitansIcon name="forward" size={13} /></button>
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
          {alwaysUseful.map((area) => <div key={area.id}><strong><TinyTitansIcon name={area.icon} size={14} /> {area.label}</strong><span>{area.fields}</span></div>)}
          <div><strong><TinyTitansIcon name="knowledge" size={14} /> Master Record</strong><span>Species, sex, hatch date, arrival/acquisition, breeder/origin, genetics, body length and important keeper notes.</span></div>
        </div>
      </details>

      <nav className="tt-profile-review-guide-links" aria-label={`${snake.name} record links`}>
        {quickLinks.map(([icon, label, path]) => <button key={label} type="button" onClick={() => navigate(path)}><TinyTitansIcon name={icon} size={14} /> {label}</button>)}
      </nav>

      <a className="tt-profile-review-guide-market" href={MORPHMARKET_URL} target="_blank" rel="noopener noreferrer">
        <span><strong><TinyTitansIcon name="marketplace" size={15} /> Explore MorphMarket</strong><small>External marketplace resource · search this species and its traits on MorphMarket.</small></span>
        <span aria-hidden="true"><TinyTitansIcon name="forward" size={14} /></span>
      </a>
      <p className="tt-profile-review-guide-market-note">Tiny Titans is not presenting MorphMarket as a sponsor or affiliate. This is simply a direct external resource for users who want to browse current listings and traits.</p>
    </section>
  );
}
