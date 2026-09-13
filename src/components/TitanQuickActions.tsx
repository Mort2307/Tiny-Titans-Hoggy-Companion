import { Link, useLocation } from "react-router-dom";
import AnimatedReptileIcon from "./ui/AnimatedReptileIcon";
import { useSpeciesContext } from "../context/SpeciesContext";

type Action = { to: string; label: string; icon: string };

function actionsForPath(path: string): Action[] {
  if (path.startsWith("/weights")) return [{ to: "/weights", label: "Log Weight", icon: "⚖️" }, { to: "/feeding", label: "Log Feeding", icon: "🍽️" }, { to: "/shedding", label: "Record Shed", icon: "🐍" }];
  if (path.startsWith("/feeding")) return [{ to: "/feeding", label: "Log Feeding", icon: "🍽️" }, { to: "/weights", label: "Log Weight", icon: "⚖️" }, { to: "/shedding", label: "Record Shed", icon: "🐍" }];
  if (path.startsWith("/shedding")) return [{ to: "/shedding", label: "Record Shed", icon: "🐍" }, { to: "/weights", label: "Log Weight", icon: "⚖️" }, { to: "/feeding", label: "Log Feeding", icon: "🍽️" }];
  if (path.startsWith("/behaviour")) return [{ to: "/behaviour", label: "Log Behaviour", icon: "◉" }, { to: "/weights", label: "Log Weight", icon: "⚖️" }, { to: "/feeding", label: "Log Feeding", icon: "🍽️" }];
  if (path.startsWith("/health")) return [{ to: "/health", label: "Add Health Record", icon: "+" }, { to: "/weights", label: "Log Weight", icon: "⚖️" }, { to: "/behaviour", label: "Log Behaviour", icon: "◉" }];
  if (path.startsWith("/husbandry") || path.startsWith("/enclosure-intelligence")) return [{ to: "/enclosure-intelligence", label: "Open Environment", icon: "🏠" }, { to: "/weights", label: "Log Weight", icon: "⚖️" }, { to: "/feeding", label: "Log Feeding", icon: "🍽️" }];
  if (path.startsWith("/breeding")) return [{ to: "/breeding", label: "Breeding Workspace", icon: "🥚" }, { to: "/calculator", label: "Genetics Calculator", icon: "∑" }, { to: "/morph-library", label: "Morph Library", icon: "🧬" }];
  if (path.startsWith("/learn") || path.startsWith("/knowledge-base") || path.startsWith("/challenge")) return [{ to: "/challenge", label: "Continue Challenge", icon: "◆" }, { to: "/knowledge-base", label: "Knowledge Base", icon: "▤" }, { to: "/morph-library", label: "Morph Library", icon: "🧬" }];
  if (path.startsWith("/morph-library") || path === "/calculator") return [{ to: "/morph-library", label: "Morph Library", icon: "🧬" }, { to: "/calculator", label: "Genetics Calculator", icon: "∑" }, { to: "/breeding", label: "Breeding Planner", icon: "🥚" }];
  return [{ to: "/weights", label: "Log Weight", icon: "⚖️" }, { to: "/feeding", label: "Log Feeding", icon: "🍽️" }, { to: "/shedding", label: "Record Shed", icon: "🐍" }, { to: "/snakes/new", label: "Add Snake", icon: "+" }];
}

export default function TitanQuickActions() {
  const { pathname } = useLocation();
  const { selectedSpeciesId } = useSpeciesContext();
  const recordLogPage = ["/weights", "/feeding", "/shedding", "/health", "/behaviour", "/husbandry"].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (pathname.startsWith("/creator") || pathname.startsWith("/login") || pathname === "/account-setup" || (pathname !== "/" && !recordLogPage)) return null;
  const actions = actionsForPath(pathname);
  return <nav className="tt-quick-dock" aria-label="Quick actions"><span className="tt-quick-dock__label">TITAN TOOLS</span>{actions.map((action) => <Link key={action.to + action.label} to={action.to}><span className="app-navigation-icon" aria-hidden="true">{action.to.startsWith("/feeding") ? <AnimatedReptileIcon kind="feed" speciesId={selectedSpeciesId} /> : action.to.startsWith("/weights") ? <AnimatedReptileIcon kind="weight" /> : action.to.startsWith("/shedding") ? <AnimatedReptileIcon kind="shed" speciesId={selectedSpeciesId} /> : action.to.startsWith("/breeding") ? <AnimatedReptileIcon kind="breeding" /> : action.to.startsWith("/calculator") || action.to.startsWith("/morph-library") ? <AnimatedReptileIcon kind="genetics" /> : action.to.startsWith("/enclosure") || action.to.startsWith("/husbandry") ? <AnimatedReptileIcon kind="vivarium" /> : action.to.startsWith("/health") ? <AnimatedReptileIcon kind="health" /> : action.to.startsWith("/behaviour") ? <AnimatedReptileIcon kind="snake" speciesId={selectedSpeciesId} /> : action.icon}</span>{action.label}</Link>)}</nav>;
}
