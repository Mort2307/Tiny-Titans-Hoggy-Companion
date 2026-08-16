import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { getTitanWallEntries, type TitanWallEntry } from "../services/titanSupportService";
import "../styles/WallOfTitans.css";

export default function WallOfTitans() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<TitanWallEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getTitanWallEntries()
      .then((items) => { if (active) setEntries(items); })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "The Wall of Titans could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <main className="page-container titan-wall-page">
    <BackHomeButton />
    <header className="titan-wall-hero">
      <div className="titan-wall-hero__icon" aria-hidden="true">🏆</div>
      <div>
        <p className="titan-wall-eyebrow">TINY TITANS · COMMUNITY</p>
        <h1>Wall of Titans</h1>
        <p>Recognising the people who help Tiny Titans grow. Supporters can choose to appear by name, share a social profile, or remain anonymous.</p>
      </div>
    </header>

    <section className="titan-wall-actions" aria-label="Wall of Titans actions">
      <div><strong>Want your name on the Wall?</strong><span>Become a Titan and choose your recognition settings after supporting Tiny Titans.</span></div>
      <button type="button" onClick={() => navigate("/become-a-titan")}>🐍 Become a Titan →</button>
    </section>

    {loading && <div className="titan-wall-state" role="status"><span>🐍</span><h2>Loading the Wall…</h2><p>Checking the latest Titan supporters.</p></div>}
    {!loading && error && <div className="titan-wall-state titan-wall-state--error" role="alert"><span>⚠️</span><h2>Couldn't load the Wall</h2><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>}
    {!loading && !error && entries.length === 0 && <div className="titan-wall-state"><span>🌱</span><h2>The first Titans are coming</h2><p>Be one of the first supporters to take your place on the Wall.</p><button type="button" onClick={() => navigate("/become-a-titan")}>Become a Titan →</button></div>}

    {!loading && !error && entries.length > 0 && <section className="titan-wall-grid" aria-label="Wall of Titans supporters">
      {entries.map((entry) => {
        const isFounder = entry.id === "tiny-titans-official";
        return <article className={`titan-wall-card${isFounder ? " titan-wall-card--founder" : ""}`} key={entry.id}>
          <div className="titan-wall-card__icon" aria-hidden="true">{isFounder ? "👑" : "🐍"}</div>
          <div className="titan-wall-card__content">
            <span className="titan-wall-card__tier">{entry.tierLabel}</span>
            <h2>{entry.displayName}</h2>
            {isFounder && <p className="titan-wall-card__founder">Tiny Titans Founder & Creator</p>}
            {entry.socialUrl && <a href={entry.socialUrl} target="_blank" rel="noreferrer noopener">🔗 Social profile</a>}
          </div>
          <time dateTime={entry.supportedAt ?? undefined}>{entry.supportedAt ? new Date(entry.supportedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "Official Tiny Titans"}</time>
        </article>;
      })}
    </section>}

    <footer className="titan-wall-footer">
      <button type="button" onClick={() => navigate("/community")}>← Back to Community Hub</button>
      <button type="button" onClick={() => navigate("/become-a-titan")}>🐍 Support Tiny Titans</button>
    </footer>
  </main>;
}
