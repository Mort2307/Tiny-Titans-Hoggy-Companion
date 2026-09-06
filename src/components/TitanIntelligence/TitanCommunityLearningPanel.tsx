import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getPublicCommunityContributionSnapshot, type PublicContributionSnapshot } from "../../services/communityIntelligenceService";

interface Props { featureId: number }

export default function TitanCommunityLearningPanel({ featureId }: Props) {
  const { profile } = useAuth();
  const [snapshot, setSnapshot] = useState<PublicContributionSnapshot | null>(null);
  useEffect(() => {
    let active = true;
    void getPublicCommunityContributionSnapshot().then((value) => { if (active) setSnapshot(value); }).catch(() => { if (active) setSnapshot(null); });
    return () => { active = false; };
  }, []);

  const communityFeature = [10, 35, 36, 42, 47].includes(featureId);
  if (communityFeature) return <section className="titan-feature-panel"><p className="titan-feature-kicker">🌍 COMMUNITY INTELLIGENCE</p><h2>Tiny Titans gets stronger from shared, permissioned knowledge</h2><div className="titan-feature-data-grid"><article><strong>{snapshot?.contributors ?? "—"}</strong><span>Contributors</span></article><article><strong>{snapshot?.publicCommunityRecords ?? "—"}</strong><span>Public community records</span></article><article><strong>{snapshot?.intelligenceContributions ?? "—"}</strong><span>Intelligence contributions</span></article><article><strong>{snapshot?.totalRecords ?? "—"}</strong><span>Total community records</span></article></div><p>Public community metrics are aggregated. Individual keeper records remain separate unless optional contribution settings permit anonymised aggregate analysis.</p><div className="titan-feature-links"><Link to="/community">Open Community Hub →</Link><Link to="/account/intelligence">Open your Contribution Centre →</Link>{featureId === 10 || featureId === 47 ? <Link to="/community">Open Titan Earth →</Link> : null}</div></section>;

  const learningLevel = profile?.learningLevel ? String(profile.learningLevel) : "not recorded";
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">📚 LEARNING INTELLIGENCE</p><h2>Your learning context</h2><p>Current learning level: <b>{learningLevel}</b>. Tiny Titans can adapt presentation and challenge selection without changing the underlying scientific content.</p><div className="titan-feature-links"><Link to="/learn">Knowledge & learning →</Link><Link to="/adaptive-learning">Adaptive Learning →</Link><Link to="/challenge">Titans Challenge →</Link></div></section>;
}
