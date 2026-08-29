import { Link, useLocation } from "react-router-dom";

type Action = { to: string; label: string; icon: string };

function actionsForPath(path: string): Action[] {
  if (path.startsWith("/weights")) return [{ to: "/weights", label: "Log weight", icon: "⚖️" }, { to: "/feeding", label: "Log feeding", icon: "🍽️" }, { to: "/shedding", label: "Record shed", icon: "🐍" }];
  if (path.startsWith("/feeding")) return [{ to: "/feeding", label: "Log feeding", icon: "🍽️" }, { to: "/weights", label: "Log weight", icon: "⚖️" }, { to: "/shedding", label: "Record shed", icon: "🐍" }];
  if (path.startsWith("/shedding")) return [{ to: "/shedding", label: "Record shed", icon: "🐍" }, { to: "/weights", label: "Log weight", icon: "⚖️" }, { to: "/feeding", label: "Log feeding", icon: "🍽️" }];
  if (path.startsWith("/behaviour")) return [{ to: "/behaviour", label: "Log behaviour", icon: "◉" }, { to: "/weights", label: "Log weight", icon: "⚖️" }, { to: "/feeding", label: "Log feeding", icon: "🍽️" }];
  if (path.startsWith("/health")) return [{ to: "/health", label: "Add health record", icon: "+" }, { to: "/weights", label: "Log weight", icon: "⚖️" }, { to: "/behaviour", label: "Log behaviour", icon: "◉" }];
  if (path.startsWith("/husbandry") || path.startsWith("/enclosure-intelligence")) return [{ to: "/enclosure-intelligence", label: "Open environment", icon: "🏠" }, { to: "/weights", label: "Log weight", icon: "⚖️" }, { to: "/feeding", label: "Log feeding", icon: "🍽️" }];
  if (path.startsWith("/breeding")) return [{ to: "/breeding", label: "Breeding workspace", icon: "🥚" }, { to: "/calculator", label: "Genetics calculator", icon: "∑" }, { to: "/morph-library", label: "Morph library", icon: "🧬" }];
  if (path.startsWith("/learn") || path.startsWith("/knowledge-base") || path.startsWith("/challenge")) return [{ to: "/challenge", label: "Continue challenge", icon: "◆" }, { to: "/knowledge-base", label: "Knowledge base", icon: "▤" }, { to: "/morph-library", label: "Morph library", icon: "🧬" }];
  if (path.startsWith("/morph-library") || path === "/calculator") return [{ to: "/morph-library", label: "Morph library", icon: "🧬" }, { to: "/calculator", label: "Genetics calculator", icon: "∑" }, { to: "/breeding", label: "Breeding planner", icon: "🥚" }];
  return [{ to: "/weights", label: "Log weight", icon: "⚖️" }, { to: "/feeding", label: "Log feeding", icon: "🍽️" }, { to: "/shedding", label: "Record shed", icon: "🐍" }, { to: "/snakes/new", label: "Add snake", icon: "+" }];
}

export default function TitanQuickActions() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/creator") || pathname.startsWith("/login") || pathname === "/account-setup") return null;
  const actions = actionsForPath(pathname);
  return <nav className="tt-quick-dock" aria-label="Quick actions"><span className="tt-quick-dock__label">TITAN TOOLS</span>{actions.map((action) => <Link key={action.to + action.label} to={action.to}><span aria-hidden="true">{action.icon}</span>{action.label}</Link>)}</nav>;
}
