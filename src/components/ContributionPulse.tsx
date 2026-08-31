import { useEffect, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getPrivacyPreferences } from "../services/privacyService";
import { getUserSnakes } from "../services/snakeService";
import { useAuth } from "../context/useAuth";
import "../styles/contribution-pulse.css";

type PublicSnapshot = {
  available: boolean;
  minimumContributors: number;
  contributors?: number;
  snakes?: number;
  weightLogs?: number;
  feedingLogs?: number;
  shedLogs?: number;
  totalRecords?: number;
  generatedAt?: string;
};

type ContributionPulseProps = {
  enabled: boolean;
  snakeCount: number;
  weightRecords: number;
  feedingRecords: number;
  shedRecords: number;
};

export default function ContributionPulse({ enabled, snakeCount, weightRecords, feedingRecords, shedRecords }: ContributionPulseProps) {
  const { user } = useAuth();
  const [global, setGlobal] = useState<PublicSnapshot | null>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [liveEnabled, setLiveEnabled] = useState(enabled);

  useEffect(() => {
    let active = true;
    if (!user) {
      setLoadingGlobal(false);
      return () => { active = false; };
    }

    setLiveEnabled(enabled);
    void getPrivacyPreferences(user.uid)
      .then((privacy) => { if (active) setLiveEnabled(privacy.communityHusbandryData === true); })
      .catch(() => undefined);

    const functions = getFunctions(undefined, "europe-west2");
    const callable = httpsCallable<void, PublicSnapshot>(functions, "getPublicCommunityContributionSnapshot");
    setLoadingGlobal(true);
    void callable()
      .then((result) => { if (active) setGlobal(result.data); })
      .catch(() => { if (active) setGlobal(null); })
      .finally(() => { if (active) setLoadingGlobal(false); });

    return () => { active = false; };
  }, [user, enabled]);

  const personalRecords = weightRecords + feedingRecords + shedRecords;

  return <section className="contribution-pulse" aria-label="Tiny Titans contribution tracker">
    <div className="contribution-pulse-heading">
      <div>
        <span>🌍 TINY TITANS CONTRIBUTION PULSE</span>
        <strong>{liveEnabled ? "You're contributing" : "Your contribution is off"}</strong>
      </div>
      <a href="/account/intelligence">View contribution →</a>
    </div>

    <div className="contribution-pulse-grid">
      <article className={`contribution-pulse-card ${liveEnabled ? "is-active" : "is-muted"}`}>
        <small>YOUR CONTRIBUTION</small>
        <strong>{liveEnabled ? personalRecords : "—"}</strong>
        <span>{liveEnabled ? "eligible weight, feeding & shed records" : "enable Intelligence to contribute eligible records"}</span>
        <div className="contribution-pulse-mini"><b>{snakeCount}</b> {snakeCount === 1 ? "snake" : "snakes"} tracked</div>
      </article>

      <article className="contribution-pulse-card global-card">
        <small>GLOBAL COMMUNITY</small>
        {loadingGlobal ? <strong className="is-loading">…</strong> : global?.available ? <>
          <strong>{global.totalRecords ?? 0}</strong>
          <span>eligible records contributing to Tiny Titans</span>
          <div className="contribution-pulse-mini"><b>{global.contributors ?? 0}</b> contributing keepers · <b>{global.snakes ?? 0}</b> snakes</div>
        </> : <>
          <strong>Building</strong>
          <span>The global tracker activates once enough contributing keepers are represented to protect privacy.</span>
          <div className="contribution-pulse-mini">🔒 Minimum cohort: {global?.minimumContributors ?? 5} contributing keepers</div>
        </>}
      </article>
    </div>
  </section>;
}
