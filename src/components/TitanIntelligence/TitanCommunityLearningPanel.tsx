import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getCommunityIntelligenceSnapshot, getPublicCommunityContributionSnapshot, type CommunityIntelligenceSnapshot, type PublicContributionSnapshot } from "../../services/communityIntelligenceService";
import { getCommunityContent, type CommunityContent } from "../../services/communityEcosystemService";
import { calculateTitanKeeperReputation } from "../../intelligence/v50/titanKeeperReputationEngine";

interface Props { featureId: number }

export default function TitanCommunityLearningPanel({ featureId }: Props) {
  const { profile } = useAuth();
  const [snapshot, setSnapshot] = useState<PublicContributionSnapshot | null>(null);
  const [population, setPopulation] = useState<CommunityIntelligenceSnapshot | null>(null);
  const [content, setContent] = useState<CommunityContent[]>([]);
  const [loadError, setLoadError] = useState("");
  const communityFeature = [10, 35, 36, 42, 47].includes(featureId);

  useEffect(() => {
    let active = true;
    const publicRequest = getPublicCommunityContributionSnapshot();
    const populationRequest = communityFeature && (featureId === 42 || featureId === 47) ? getCommunityIntelligenceSnapshot().catch(() => null) : Promise.resolve(null);
    const contentRequest = profile?.uid ? getCommunityContent({ limitCount: 80 }) : Promise.resolve([] as CommunityContent[]);
    void Promise.all([publicRequest, populationRequest, contentRequest])
      .then(([community, census, items]) => { if (active) { setSnapshot(community); setPopulation(census); setContent(items); } })
      .catch((reason) => { if (active) { setSnapshot(null); setPopulation(null); setContent([]); setLoadError(reason instanceof Error ? reason.message : "Community intelligence could not be loaded."); } });
    return () => { active = false; };
  }, [communityFeature, featureId, profile?.uid]);

  const reputation = useMemo(() => {
    const mine = content.filter((item) => item.creatorUid === profile?.uid && item.moderationStatus === "approved");
    return calculateTitanKeeperReputation({ approvedContributions: mine.length, helpfulMarks: mine.reduce((sum, item) => sum + (item.engagement?.helpful ?? 0), 0), comments: mine.reduce((sum, item) => sum + (item.engagement?.comments ?? 0), 0), featuredContributions: mine.filter((item) => item.permissions?.includes("featured")).length });
  }, [content, profile?.uid]);

  if (communityFeature) return <section className="titan-feature-panel"><p className="titan-feature-kicker">🌍 COMMUNITY INTELLIGENCE</p><h2>Tiny Titans gets stronger from shared, permissioned knowledge</h2>{loadError&&<div className="titan-feature-empty"><strong>Community metrics are temporarily unavailable.</strong><p>{loadError}</p></div>}<div className="titan-feature-data-grid"><article><strong>{snapshot?.contributors ?? "—"}</strong><span>Contributors</span></article><article><strong>{snapshot?.publicCommunityRecords ?? "—"}</strong><span>Public community records</span></article><article><strong>{snapshot?.intelligenceContributions ?? "—"}</strong><span>Intelligence contributions</span></article><article><strong>{snapshot?.totalRecords ?? "—"}</strong><span>Total community records</span></article></div>{(featureId===42||featureId===47)&&population?.available&&<div className="titan-feature-results"><article><strong>{population.snakes ?? "—"}</strong><span>Opted-in population records</span><p>{population.contributors} contributing keeper{population.contributors===1?"":"s"} represented in the current cohort.</p></article><article><strong>{population.species?.length ?? 0}</strong><span>Species represented</span><p>{population.species?.slice(0,5).map(item => `${item.label} (${item.count})`).join(" · ") || "Species detail is not available at this cohort size."}</p></article>{population.morphs?.length ? <article><strong>{population.morphs.length}</strong><span>Morph labels represented</span><p>{population.morphs.slice(0,5).map(item => `${item.label} (${item.count})`).join(" · ")}</p></article> : null}</div>}{featureId===35&&<div className="titan-feature-note"><strong>Your Keeper Reputation: {reputation.score}/100 · {reputation.tier}</strong><p>{reputation.note}</p><small>{reputation.factors.map((factor) => `${factor.label}: +${factor.points}`).join(" · ")}</small></div>}{featureId===36&&<div className="titan-feature-note"><strong>Morph Court principle</strong><p>Disputed terminology should be reviewed against explicit composition, provenance and evidence rather than votes alone. A popular claim is not automatically a verified genetic fact.</p></div>}<p>Public community metrics are aggregated. Individual keeper records remain separate unless optional contribution settings permit anonymised aggregate analysis.</p><div className="titan-feature-links"><Link to="/community">Open Community Hub →</Link><Link to="/account/intelligence">Open your Contribution Centre →</Link>{featureId===10||featureId===47?<Link to="/community">Open Titan Earth →</Link>:null}</div></section>;

  const learningLevel = profile?.learningLevel ? String(profile.learningLevel) : "not recorded";
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">📚 LEARNING INTELLIGENCE</p><h2>Your learning context</h2><p>Current learning level: <b>{learningLevel}</b>. Tiny Titans can adapt presentation and challenge selection without changing the underlying scientific content.</p><div className="titan-feature-links"><Link to="/learn">Knowledge & learning →</Link><Link to="/adaptive-learning">Adaptive Learning →</Link><Link to="/challenge">Titans Challenge →</Link></div></section>;
}
