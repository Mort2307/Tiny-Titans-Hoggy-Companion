import { useEffect, useState } from "react";
import BackHomeButton from "../components/BackHomeButton";
import { getTitanWallEntries, type TitanWallEntry } from "../services/titanSupportService";
import "../styles/CreatorTools.css";
import "../styles/titanWall.css";

const OFFICIAL_TITAN: TitanWallEntry = { id: "tiny-titans-official", displayName: "Tiny Titans", socialUrl: "https://www.facebook.com/share/1bmTfhZgc1/", tierLabel: "Founder & Creator", amountGbp: 0, supportedAt: null };

export default function WallOfTitans() {
  const [entries, setEntries] = useState<TitanWallEntry[]>([OFFICIAL_TITAN]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getTitanWallEntries()
      .then((items) => { if (active) setEntries(items.some((entry) => entry.id === OFFICIAL_TITAN.id) ? items : [OFFICIAL_TITAN, ...items]); })
      .catch((loadError) => { if (active) { setEntries([OFFICIAL_TITAN]); setError(loadError instanceof Error ? loadError.message : "The supporter entries could not be loaded, but the official Tiny Titans founder entry remains available."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <main className="page-container titan-wall-page">
      <BackHomeButton />
      <header className="page-header">
        <p className="creator-dashboard__eyebrow">Tiny Titans Community</p>
        <h1>🏆 Wall of Titans</h1>
        <p>Every person who supports Tiny Titans earns a place here. Supporters can be recognised by name, optionally share a social link, or appear anonymously. Every confirmed supporter is represented.</p>
      </header>
      {loading && <p role="status">Loading the Wall of Titans…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && entries.length > 0 && (
        <section className="titan-wall-grid" aria-label="Wall of Titans supporters">
          {entries.map((entry) => (
            <article className="titan-wall-card" key={entry.id}>
              <div className="titan-wall-card__icon" aria-hidden="true">🐍</div>
              <div className="titan-wall-card__content">
                <h2>{entry.displayName}</h2>
                <span className="titan-wall-card__tier">{entry.tierLabel}</span>
                {entry.socialUrl && <a href={entry.socialUrl} target="_blank" rel="noreferrer noopener">🔗 Social profile</a>}
              </div>
              <time dateTime={entry.supportedAt ?? undefined}>{entry.supportedAt ? new Date(entry.supportedAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "Founder"}</time>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
