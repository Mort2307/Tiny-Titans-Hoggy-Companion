import { Link, useLocation } from "react-router-dom";

export default function CreatorStatusBar() {
  const { pathname } = useLocation();
  if (!pathname.startsWith("/creator")) return null;
  return <div className="tt-creator-status"><span className="tt-creator-status__pulse" aria-hidden="true" /><strong>CREATOR INTELLIGENCE</strong><span>Evidence first · aggregates only · backend permissions remain authoritative</span><Link to="/creator/privacy-data">Privacy controls →</Link></div>;
}
