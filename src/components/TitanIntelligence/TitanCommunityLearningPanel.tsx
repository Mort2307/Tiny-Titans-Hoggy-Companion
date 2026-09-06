import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getPublicCommunityContributionSnapshot, type PublicContributionSnapshot } from "../../services/communityIntelligenceService";
import { getCommunityContent, type CommunityContent } from "../../services/communityEcosystemService";
import { calculateTitanKeeperReputation } from "../../intelligence/v50/titanKeeperReputationEngine";

interface Props { featureId: number }

export default function TitanCommunityLearningPanel({ featureId }: Props) {
  const { profile } = useAuth();
  const [snapshot, setSnapshot] = useState<PublicContributionSnapshot | null>(null);
  const [content, setContent] = useState<CommunityContent[]>([]);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([getPublicCommunityContributionSnapshot(), profile?.uid ? getCommunityContent({ limitCount: 80 }) : Promise.resolve([])])
      .then(([community, items]) => { if (active) { setSnapshot(community); setContent(items); } })
      .catch((reason) => { if (active) { setSnapshot(null); setContent([]); setLoadError(reason instanceof Error ? reason.message : "Community intelligence could not be loaded."); } });
    return () => { active = false; };
  }, [profile?.uid]);

  const reputation = useMemo(() => {
    const mine = content.filter((item) => item.creatorUid === profile?.uid && item.moderationStatus === "approved");
    return calculateTitanKeeperReputation({
      approvedContributions: mine.length,
      helpfulMarks: mine.reduce((sum, item) => sum + (item.engagement?.helpful ?? 0), 0),
      comments: mine.reduce((sum, item) => sum + (item.engagement?.comments ?? 0), 0),
      featuredContributions: mine.filter((item) => item.permissions?.includes("featured")).length,
    });
  }, [content, profile?.uid]);

  const communityFeature = [10, 35, 36, 42, 47].includes(featureId);
  if (communityFeature) return <section className="titan-feature-panel"><p className="titan-feature-kicker">🌍 COMMUNITY INTELLIGENCE</p><h2>Tiny Titans gets stronger from shared, permissioned knowledge</h2>{loadError&&<div className="titan-feature-empty"><strong>Community metrics are temporarily unavailable.</strong><p>{loadError}</p></div>}<div className="titan-feature-data-grid"><article><strong>{snapshot?.contributors ?? "—"}</strong><span>Contributors</span></article><article><strong>{snapshot?.publicCommunityRecords ?? "—"}</strong><span>Public community records</span></article><article><strong>{snapshot?.intelligenceContributions ?? "—"}</strong><span>Intelligence contributions</span></article><article><strong>{snapshot?.totalRecords ?? "—"}</strong><span>Total community records</span></article></div><p>Public community metrics are aggregated. Individual keeper records remain separate unless optional contribution settings permit anonymised aggregate analysis.</p>{featureId===35&&<div className="titan-feature-note"><strong>Your Keeper Reputation: {reputation.score}/100 · {reputation.tier}</strong><p>{reputation.note}</p><small>{reputation.factors.map((factor) => `${factor.label}: +${factor.points}`).join(" · ")}</small></div>}{featureId===36&&<div className="titan-feature-note"><strong>Morph Court principle</strong><p>Disputed terminology should be reviewed against explicit composition, provenance and evidence rather than votes alone. A popular claim is not automatically a verified genetic fact.</p></div>}<div className="titan-feature-links"><Link to="/community">Open Community Hub →</Link><Link to="/account/intelligence">Open your Contribution Centre →</Link>{featureId===10||featureId===47?<Link to="/community">Open Titan Earth →</Link>:null}</div></section>;

  const learningLevel = profile?.learningLevel ? String(profile.learningLevel) : "not recorded";
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">📚 LEARNING INTELLIGENCE</p><h2>Your learning context</h2><p>Current learning level: <b>{learningLevel}</b>. Tiny Titans can adapt presentation and challenge selection without changing the underlying scientific content.</p><div className="titan-feature-links"><Link to="/learn">Knowledge & learning →</Link><Link to="/adaptive-learning">Adaptive Learning →</Link><Link to="/challenge">Titans Challenge →</Link></div></section>;
}
