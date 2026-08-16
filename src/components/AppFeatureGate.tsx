import { useEffect, useState, type ReactNode } from "react";
import { getCreatorAppSettings, type CreatorFeatureKey } from "../services/creatorControlService";

type Props = { feature: CreatorFeatureKey; children: ReactNode };
export default function AppFeatureGate({ feature, children }: Props) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => { let active = true; void getCreatorAppSettings().then((settings) => { if (active) setAllowed(settings[feature] !== false); }).catch(() => { if (active) setAllowed(true); }); return () => { active = false; }; }, [feature]);
  if (allowed === null) return <div className="page-container"><div className="welcome-card"><h1>🐍 Loading Tiny Titans…</h1></div></div>;
  if (!allowed) return <main className="page-container"><section className="welcome-card"><h1>🚧 Feature temporarily unavailable</h1><p>This Tiny Titans feature is temporarily unavailable while the Creator Centre is updating it. Please try again shortly.</p></section></main>;
  return <>{children}</>;
}
