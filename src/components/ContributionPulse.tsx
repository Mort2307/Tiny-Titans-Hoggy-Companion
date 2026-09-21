import { Link } from "react-router-dom";
import TinyTitansIcon from "./TinyTitansIcon";
import { useContributionPulse } from "../hooks/useContributionPulse";
import "../styles/contribution-pulse.css";

export default function ContributionPulse() {
  const {
    loading, modal, setModal, personalCounts, personalDisplayItems, globalFeed, globalSnapshot,
    globalIntelligence, publicCommunityRecords, totalPersonal, formatContributionDate,
  } = useContributionPulse();

  return <>
    <section className="contribution-pulse" aria-label="Tiny Titans contribution tracker">
      <div className="contribution-pulse-heading"><div><span><TinyTitansIcon name="community" size={18} /> TINY TITANS CONTRIBUTION PULSE</span><strong>{loading ? "Loading contribution activity…" : "See what keepers are contributing"}</strong></div><Link to="/make-contribution"><TinyTitansIcon name="add" size={17} /> Make a Contribution</Link></div>
      <div className="contribution-pulse-grid">
        <button type="button" className={`contribution-pulse-card contribution-pulse-card--button ${totalPersonal ? "is-active" : "is-muted"}`} onClick={() => setModal("personal")}><small>YOUR CONTRIBUTION</small><strong>{loading ? "…" : totalPersonal}</strong><span>public submissions + opted-in Intelligence records</span><div className="contribution-pulse-mini"><b>{personalCounts.snakes}</b> {personalCounts.snakes === 1 ? "snake" : "snakes"} tracked · Click to view yours</div></button>
        <button type="button" className="contribution-pulse-card contribution-pulse-card--button global-card" onClick={() => setModal("global")}><small>GLOBAL CONTRIBUTIONS</small><strong>{loading ? "…" : globalSnapshot?.totalRecords ?? 0}</strong><span>public community contributions + consented Intelligence records</span><div className="contribution-pulse-mini"><b>{globalSnapshot?.contributors ?? 0}</b> contributing keepers · Click to explore</div></button>
      </div>
    </section>
    {modal && <div className="contribution-pulse-modal-backdrop" role="presentation" onMouseDown={() => setModal(null)}><section className="contribution-pulse-modal" role="dialog" aria-modal="true" aria-labelledby="contribution-pulse-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="contribution-pulse-modal-head"><div><span>{modal === "personal" ? "YOUR CONTRIBUTIONS" : "GLOBAL TINY TITANS"}</span><h2 id="contribution-pulse-modal-title">{modal === "personal" ? "Your contribution history" : "What the community is contributing"}</h2></div><button type="button" onClick={() => setModal(null)} aria-label="Close contribution details"><TinyTitansIcon name="close" size={18} /></button></div>
      {modal === "personal" ? <div className="contribution-pulse-list">{personalDisplayItems.map((item) => <article key={item.id} className="contribution-pulse-list-item"><div><span>{item.category}</span><h3>{item.title}</h3><p>{item.snippet.slice(0, 220)}{item.snippet.length > 220 ? "…" : ""}</p><small>{item.status ? `Status: ${item.status}` : "Personal contribution"}{item.createdAt ? ` · ${formatContributionDate(item.createdAt)}` : ""}</small></div>{item.link && <Link to={item.link} onClick={() => setModal(null)}>Open</Link>}</article>)}</div> : <div className="contribution-pulse-list">
        <div className="contribution-pulse-global-summary"><strong>What counts as Global?</strong><p>Global Contributions include anything deliberately shared with the community, plus eligible weight, feeding, shed and health records from keepers who explicitly enabled optional husbandry contribution. Those Intelligence records are counted in aggregate only; individual keeper records are never shown here.</p><div className="contribution-pulse-global-breakdown"><span><b>{publicCommunityRecords}</b> public community contributions</span><span><b>{globalIntelligence}</b> Intelligence records</span><span><b>{globalSnapshot?.intelligenceContributingKeepers ?? 0}</b> consenting Intelligence contributors</span></div></div>
        {globalFeed.length ? globalFeed.map((item) => <article key={`${item.source}-${item.id}`} className="contribution-pulse-list-item"><div><span>{item.contributor}</span><h3>{item.category} · {item.title}</h3><p>{item.snippet}</p><small>{item.source} · {formatContributionDate(item.createdAt)}</small></div></article>) : <div className="contribution-pulse-empty"><strong><TinyTitansIcon name="community" size={18} /> No public contribution entries yet.</strong><p>The aggregate Intelligence total can still be non-zero because opted-in husbandry records are counted without exposing individual records. Publicly visible submissions appear here once approved.</p></div>}
      </div>}
      <div className="contribution-pulse-modal-foot"><Link to={modal === "personal" ? "/account/intelligence" : "/community"} onClick={() => setModal(null)}>{modal === "personal" ? "Open My Contributions" : "Explore Community"}</Link></div>
    </section></div>}
  </>;
}

}
