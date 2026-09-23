import { Link, useLocation } from "react-router-dom";
import TinyTitansIcon from "./TinyTitansIcon";
import type { TinyTitansIconName } from "../types/tinyTitansIcon";

const sections: readonly [string, string, TinyTitansIconName][] = [
  ["Overview", "/creator", "creator"],
  ["Intelligence", "/creator/benchmarks", "titan"],
  ["Morph evidence", "/creator/submissions", "morph"],
  ["Operations", "/creator/issues", "testing"],
  ["Community", "/creator/community", "community"],
  ["Testing", "/creator/tester", "testing"],
  ["Paid tiers", "/creator/tester/paid-tiers", "billing"],
  ["Privacy & data", "/creator/privacy-data", "health"],
];

export default function CreatorCommandBar() {
  const { pathname } = useLocation();
  if (!pathname.startsWith("/creator")) return null;
  return <nav className="tt-creator-command" aria-label="Creator Centre sections">
    <div className="tt-creator-command__brand"><span>TT</span><div><strong>Creator Intelligence</strong><small>Command centre</small></div></div>
    <div className="tt-creator-command__links">{sections.map(([label, to, icon]) => <Link key={to} className={pathname === to ? "is-active" : ""} to={to}><span aria-hidden="true"><TinyTitansIcon name={icon} size={20} /></span>{label}</Link>)}</div>
  </nav>;
}
