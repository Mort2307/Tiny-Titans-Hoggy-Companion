import { Link, useLocation } from "react-router-dom";

const sections = [
  ["Overview", "/creator", "◈"],
  ["Intelligence", "/creator/benchmarks", "🧠"],
  ["Morph evidence", "/creator/submissions", "🧬"],
  ["Operations", "/creator/issues", "🧰"],
  ["Community", "/creator/community", "📢"],
  ["Testing", "/creator/tester", "🤖"],
  ["Privacy & data", "/creator/privacy-data", "🔐"],
] as const;

export default function CreatorCommandBar() {
  const { pathname } = useLocation();
  if (!pathname.startsWith("/creator")) return null;
  return <nav className="tt-creator-command" aria-label="Creator Centre sections">
    <div className="tt-creator-command__brand"><span>TT</span><div><strong>Creator Intelligence</strong><small>Command centre</small></div></div>
    <div className="tt-creator-command__links">{sections.map(([label, to, icon]) => <Link key={to} className={pathname === to ? "is-active" : ""} to={to}><span aria-hidden="true">{icon}</span>{label}</Link>)}</div>
  </nav>;
}
