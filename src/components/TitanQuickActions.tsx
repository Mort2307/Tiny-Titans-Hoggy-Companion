import { Link, useLocation } from "react-router-dom";
import TinyTitansIcon from "./TinyTitansIcon";

type Action = { to: string; label: string; icon: import("./TinyTitansIcon").TinyTitansIconName };

function actionsForPath(path: string): Action[] {
  if (path.startsWith("/weights")) return [{ to: "/weights", label: "Log Weight", icon: "weight" }, { to: "/feeding", label: "Log Feeding", icon: "feeding" }, { to: "/shedding", label: "Record Shed", icon: "shed" }];
  if (path.startsWith("/feeding")) return [{ to: "/feeding", label: "Log Feeding", icon: "feeding" }, { to: "/weights", label: "Log Weight", icon: "weight" }, { to: "/shedding", label: "Record Shed", icon: "shed" }];
  if (path.startsWith("/shedding")) return [{ to: "/shedding", label: "Record Shed", icon: "shed" }, { to: "/weights", label: "Log Weight", icon: "weight" }, { to: "/feeding", label: "Log Feeding", icon: "feeding" }];
  if (path.startsWith("/behaviour")) return [{ to: "/behaviour", label: "Log Behaviour", icon: "behaviour" }, { to: "/weights", label: "Log Weight", icon: "weight" }, { to: "/feeding", label: "Log Feeding", icon: "feeding" }];
  if (path.startsWith("/health")) return [{ to: "/health", label: "Add Health Record", icon: "add" }, { to: "/weights", label: "Log Weight", icon: "weight" }, { to: "/behaviour", label: "Log Behaviour", icon: "behaviour" }];
  if (path.startsWith("/husbandry") || path.startsWith("/enclosure-intelligence")) return [{ to: "/enclosure-intelligence", label: "Open Environment", icon: "enclosure" }, { to: "/weights", label: "Log Weight", icon: "weight" }, { to: "/feeding", label: "Log Feeding", icon: "feeding" }];
  if (path.startsWith("/breeding")) return [{ to: "/breeding", label: "Breeding Workspace", icon: "breeding" }, { to: "/calculator", label: "Genetics Calculator", icon: "genetics" }, { to: "/morph-library", label: "Morph Library", icon: "morph" }];
  if (path.startsWith("/learn") || path.startsWith("/knowledge-base") || path.startsWith("/challenge")) return [{ to: "/challenge", label: "Continue Challenge", icon: "challenge" }, { to: "/knowledge-base", label: "Knowledge Base", icon: "knowledge" }, { to: "/morph-library", label: "Morph Library", icon: "morph" }];
  if (path.startsWith("/morph-library") || path === "/calculator") return [{ to: "/morph-library", label: "Morph Library", icon: "morph" }, { to: "/calculator", label: "Genetics Calculator", icon: "genetics" }, { to: "/breeding", label: "Breeding Planner", icon: "breeding" }];
  return [{ to: "/weights", label: "Log Weight", icon: "weight" }, { to: "/feeding", label: "Log Feeding", icon: "feeding" }, { to: "/shedding", label: "Record Shed", icon: "shed" }, { to: "/snakes/new", label: "Add Reptile", icon: "add" }];
}

export default function TitanQuickActions() {
  const { pathname } = useLocation();
  const recordLogPage = ["/weights", "/feeding", "/shedding", "/health", "/behaviour", "/husbandry"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (pathname.startsWith("/creator") || pathname.startsWith("/login") || pathname === "/account-setup" || (pathname !== "/" && !recordLogPage)) return null;
  const actions = actionsForPath(pathname);
  return <nav className="tt-quick-dock" aria-label="Quick actions"><span className="tt-quick-dock__label">TITAN TOOLS</span>{actions.map((action) => <Link key={action.to + action.label} to={action.to}><span aria-hidden="true"><TinyTitansIcon name={action.icon} size={20} /></span>{action.label}</Link>)}</nav>;
}
