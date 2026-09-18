import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { hasCapability } from "../../services/capabilityService";
import { getCommunityUnreadCount } from "../../services/communityReadStateService";
import { useEasyNav } from "../../context/EasyNavContext";
import { quickNavSearchItems, type QuickNavCapability } from "../../data/quickNavigation";
import { getFreeKeeperNavigationGroups } from "../../config/freeExperience";
import { getWorkspacePresentation, subscribeToWorkspacePresentation, type WorkspacePresentation } from "../../services/workspacePresentationService";
import communityUpdates from "../../data/communityUpdates.json";
import TinyTitansIcon, { type TinyTitansIconName } from "../TinyTitansIcon";
import "./Navigation.css";

type NavigationLink = [string, TinyTitansIconName, string];
type NavigationSection = { label: string; links: NavigationLink[] };

const QUICK_ICON_MAP: Record<string, TinyTitansIconName> = {
  home: "home", snakes: "reptile", room: "enclosure", conversations: "messages", reminders: "reminders", husbandry: "husbandry",
  weights: "weight", feeding: "feeding", "feeding-preparation": "feeding", shedding: "shed", health: "health", behaviour: "behaviour",
  "behaviour-observatory": "observatory", enclosure: "enclosure", morphs: "morph", "morph-evidence": "observatory", calculator: "genetics",
  breeding: "breeding", "breeding-academy": "academy", "breeding-readiness": "challenge", "breeding-timeline": "reminders", "breeding-cycle": "breeding", "breeding-production": "marketplace",
  rescue: "health", "rescue-animals": "reptile", "rescue-scan": "observatory", "rescue-incubator": "genetics", log: "knowledge",
  intelligence: "titan", "this-week": "titan", "keeper-handbook": "handbook", knowledge: "knowledge", learn: "academy", "adaptive-learning": "titan", challenge: "challenge", achievements: "wall",
  community: "community", marketplace: "marketplace", "feature-voting": "challenge", "vivarium-showcase": "enclosure", mentorship: "mentorship", "mentor-directory": "community", "become-mentor": "titan", "mentor-dashboard": "account", "my-mentees": "community", "mentorship-intelligence": "titan", "wall-of-titans": "wall", contribute: "contribution", "submit-species": "reptile", report: "testing", feedback: "messages", "my-issue-reports": "knowledge", "submission-messages": "messages",
  account: "account", profile: "account", settings: "account", personalise: "titan", family: "family", security: "health", privacy: "health", "intelligence-contribution": "titan", "become-titan": "titan",
  founder: "titan", sandbox: "testing", creator: "creator", "creator-preview": "observatory", "creator-morph": "morph", "creator-privacy": "health", "creator-benchmarks": "weight", "creator-submissions": "contribution", "creator-species-submissions": "reptile", "creator-vivarium": "enclosure", "creator-observations": "observatory", "creator-terminology": "morph", "creator-issues": "testing", "creator-community": "community", "creator-conversations": "messages", "creator-submission-conversations": "messages", "creator-mentor": "mentorship",
};
function quickIconFor(id: string): TinyTitansIconName { return QUICK_ICON_MAP[id] ?? "titan"; }
const latestProductUpdateId = [...communityUpdates].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))[0]?.id ?? null;
function hasUnseenProductUpdate() { if (!latestProductUpdateId || typeof window === "undefined") return false; try { return window.localStorage.getItem("tinytitans:community-product-update:last-seen") !== latestProductUpdateId; } catch { return false; } }

function Navigation() {
  const { profile, user, loading, profileLoading } = useAuth();
  const { isEasyNav } = useEasyNav();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<WorkspacePresentation>(() => getWorkspacePresentation());
  const [creatorAuthorized, setCreatorAuthorized] = useState(false);
  const [testerAuthorized, setTesterAuthorized] = useState(false);
  const [educatorAuthorized, setEducatorAuthorized] = useState(false);
  const [communityUnreadCount, setCommunityUnreadCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [unseenProductUpdate, setUnseenProductUpdate] = useState(hasUnseenProductUpdate);
  const userId = user?.uid;
  const authReady = !loading && !profileLoading && Boolean(userId);

  useEffect(() => subscribeToWorkspacePresentation(setWorkspace), []);
  useEffect(() => { if (!authReady) return; let active = true; void Promise.all([hasCapability("creator", profile), hasCapability("tester", profile), hasCapability("educator", profile)]).then(([creator, tester, educator]) => { if (!active) return; setCreatorAuthorized(creator); setTesterAuthorized(tester); setEducatorAuthorized(educator); }).catch(() => { if (!active) return; setCreatorAuthorized(false); setTesterAuthorized(false); setEducatorAuthorized(false); }); return () => { active = false; }; }, [authReady, profile]);
  useEffect(() => { if (!authReady || !userId) return; let active = true; const refresh = () => { void getCommunityUnreadCount(userId, { isTester: profile?.isTester === true, isAdmin: profile?.role === "admin" }).then((count) => { if (active) setCommunityUnreadCount(count); }).catch(() => { if (active) setCommunityUnreadCount(0); }); setUnseenProductUpdate(hasUnseenProductUpdate()); }; refresh(); window.addEventListener("focus", refresh); window.addEventListener("storage", refresh); window.addEventListener("community-read-state-changed", refresh); window.addEventListener("community-product-update-read", refresh); return () => { active = false; window.removeEventListener("focus", refresh); window.removeEventListener("storage", refresh); window.removeEventListener("community-read-state-changed", refresh); window.removeEventListener("community-product-update-read", refresh); }; }, [authReady, userId, profile?.isTester, profile?.role]);

  const sections: NavigationSection[] = getFreeKeeperNavigationGroups().map(({ group, items }) => ({
    label: group,
    links: items.map((item) => [item.path, item.icon, item.label] as NavigationLink),
  }));
  const standardPaths = new Set(sections.flatMap((section) => section.links.map(([path]) => path)));
  const workspaceLinks: NavigationLink[] = workspace.productId === "personal" ? [] : workspace.product.nav
    .filter(({ path }) => !standardPaths.has(path))
    .map(({ path, label }) => [path, quickIconFor(path.split("/").filter(Boolean).pop() ?? "home"), label]);
  const visibleSections: NavigationSection[] = workspaceLinks.length
    ? [{ label: `WORKSPACE · ${workspace.product.eyebrow}`, links: workspaceLinks }, ...sections]
    : sections;
  const restricted: NavigationSection[] = [];
  if (educatorAuthorized) restricted.push({ label: "Educator", links: [["/educator", "educator", "Educator Centre"]] });
  if (creatorAuthorized) restricted.push({ label: "Creator", links: [["/creator", "creator", "Creator Centre"], ["/creator/morph-library", "morph", "Morph Library Editor"], ["/creator/community", "community", "Community Manager"], ["/creator/mentor-review", "mentorship", "Mentor Review"]] });
  if (testerAuthorized) restricted.push({ label: "Testing", links: [["/creator/tester", "testing", "Tester Centre"]] });
  const authorisedCapabilities = new Set<QuickNavCapability>(["everyone"]);
  if (creatorAuthorized) authorisedCapabilities.add("creator"); if (testerAuthorized) authorisedCapabilities.add("tester"); if (educatorAuthorized) authorisedCapabilities.add("educator");
  const quickItems = [...quickNavSearchItems(quickSearch, authorisedCapabilities), { id: "marketplace", label: "Marketplace", icon: "marketplace", path: "/marketplace", group: "Community", description: "Browse active reptile marketplace listings.", keywords: ["market", "seller", "listing", "shop"] as string[] }].filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index);
  const quickGroups = quickItems.reduce<Record<string, typeof quickItems>>((groups, item) => { (groups[item.group] ??= []).push(item); return groups; }, {});

  if (isEasyNav) {
    const openMore = () => setMoreOpen((current) => !current);
    const openQuickItem = (path: string) => { setMoreOpen(false); setQuickSearch(""); navigate(path); };
    return <>
      <nav className="app-navigation tt-easy-nav-strip" aria-label="Quick Mode navigation"><div className="tt-easy-nav-inner"><NavLink to="/" end className="tt-easy-nav-link"><TinyTitansIcon name="home" size={24} /><small>At a Glance</small></NavLink><NavLink to="/snakes" className="tt-easy-nav-link"><TinyTitansIcon name="reptile" size={24} /><small>{workspace.product.terminology.animals || "My Snakes"}</small></NavLink><NavLink to="/reminders" className="tt-easy-nav-link"><TinyTitansIcon name="reminders" size={24} /><small>Due</small></NavLink><button type="button" data-route-guide-target="quick-more" className={`tt-easy-nav-link tt-easy-nav-more${moreOpen ? " active" : ""}`} onClick={openMore} aria-expanded={moreOpen} aria-controls="tt-easy-more-menu"><TinyTitansIcon name="menu" size={24} /><small>Everything</small></button></div></nav>
      {moreOpen && <div className="tt-easy-more-backdrop" role="presentation" onClick={() => setMoreOpen(false)}><section id="tt-easy-more-menu" className="tt-easy-more" role="dialog" aria-modal="true" aria-label="Quick Mode full app navigation" onClick={(event) => event.stopPropagation()}><div className="tt-easy-more-head"><div><span>QUICK MODE · FULL APP</span><h2>{workspace.product.name}</h2><p>Quick Mode changes navigation only — the full TinyTitans feature set remains available.</p></div><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close full navigation">×</button></div><label className="tt-easy-search"><TinyTitansIcon name="search" size={20} /><input value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} placeholder="Find anything in TinyTitans…" aria-label="Search the full TinyTitans app" autoFocus /></label>{Object.entries(quickGroups).map(([group, items]) => <section className="tt-easy-more-group" key={group}><h3>{group}</h3><div className="tt-easy-more-grid">{items.map((item) => <button type="button" data-route-guide-target={item.id === "account" ? "quick-my-account" : undefined} className="tt-easy-feature-link" key={item.id} onClick={() => openQuickItem(item.path)}><span className="app-navigation-icon" aria-hidden="true"><TinyTitansIcon name={quickIconFor(item.id)} size={24} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span></button>)}</div></section>)}{quickItems.length === 0 && <div className="tt-easy-no-results"><strong>Nothing matched.</strong><span>Try a broader search such as feeding, genetics, community or account.</span></div>}<div className="tt-easy-more-foot"><button type="button" onClick={() => { setMoreOpen(false); navigate("/account/personalise?quick-mode=1"); }}>Customise Quick Mode</button></div></section></div>}
    </>;
  }

  return <nav className="app-navigation" aria-label="Main navigation"><div className="app-navigation-inner">{visibleSections.concat(restricted).map((section) => <section className="app-navigation-section" key={section.label} aria-labelledby={`nav-${section.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><h2 className="app-navigation-section-label" id={`nav-${section.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{section.label}</h2><ul className="app-navigation-list">{section.links.map(([to, icon, label]) => <li className="app-navigation-item" key={`${to}-${label}`}><NavLink data-route-guide-target={to === "/account" ? "standard-my-account" : undefined} to={to} end={to === "/"} onClick={() => setMoreOpen(false)} className="app-navigation-link"><span className="app-navigation-icon" aria-hidden="true"><TinyTitansIcon name={icon} size={25} /></span><span className="app-navigation-label">{label}</span>{to === "/community" && (communityUnreadCount > 0 || unseenProductUpdate) && <span className="community-unread-dot" aria-label="New Community Hub updates" title="New Community Hub updates" />}</NavLink></li>)}</ul></section>)}</div></nav>;
}
export default Navigation;
