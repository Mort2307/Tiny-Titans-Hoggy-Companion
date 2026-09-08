import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { hasCapability } from "../../services/capabilityService";
import { getCommunityUnreadCount } from "../../services/communityReadStateService";
import { useEasyNav } from "../../context/EasyNavContext";
import { QUICK_NAV_ITEMS, quickNavSearchItems, type QuickNavItem } from "../../data/quickNavigation";
import communityUpdates from "../../data/communityUpdates.json";
import "./Navigation.css";

type NavigationLink = [string, string, string];
type NavigationSection = { label: string; links: NavigationLink[] };

const latestProductUpdateId = [...communityUpdates].sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))[0]?.id ?? null;

function hasUnseenProductUpdate() {
  if (!latestProductUpdateId || typeof window === "undefined") return false;
  try { return window.localStorage.getItem("tinytitans:community-product-update:last-seen") !== latestProductUpdateId; } catch { return false; }
}

function Navigation() {
  const { profile, user, loading, profileLoading } = useAuth();
  const { isEasyNav } = useEasyNav();
  const navigate = useNavigate();
  const [creatorAuthorized, setCreatorAuthorized] = useState(false);
  const [testerAuthorized, setTesterAuthorized] = useState(false);
  const [educatorAuthorized, setEducatorAuthorized] = useState(false);
  const [communityUnreadCount, setCommunityUnreadCount] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState("");
  const [unseenProductUpdate, setUnseenProductUpdate] = useState(hasUnseenProductUpdate);
  const userId = user?.uid;
  const authReady = !loading && !profileLoading && Boolean(userId);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    void Promise.all([hasCapability("creator", profile), hasCapability("tester", profile), hasCapability("educator", profile)]).then(([creator, tester, educator]) => {
      if (!active) return;
      setCreatorAuthorized(creator); setTesterAuthorized(tester); setEducatorAuthorized(educator);
    }).catch(() => {
      if (!active) return;
      setCreatorAuthorized(false); setTesterAuthorized(false); setEducatorAuthorized(false);
    });
    return () => { active = false; };
  }, [authReady, profile]);

  useEffect(() => {
    if (!authReady || !userId) return;
    let active = true;
    const refresh = () => {
      void getCommunityUnreadCount(userId, { isTester: profile?.isTester === true, isAdmin: profile?.role === "admin" }).then((count) => {
        if (active) setCommunityUnreadCount(count);
      }).catch(() => { if (active) setCommunityUnreadCount(0); });
      setUnseenProductUpdate(hasUnseenProductUpdate());
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("community-read-state-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("community-read-state-changed", refresh);
    };
  }, [authReady, userId, profile?.isTester, profile?.role]);

  const sections: NavigationSection[] = [
    { label: "Overview", links: [["/", "⌂", "Home"], ["/snakes", "🐍", "My Snakes"], ["/reptile-room", "▦", "Reptile Room"], ["/conversations", "💬", "Message Centre"]] },
    { label: "Care", links: [["/reminders", "🔔", "Reminder Hub"], ["/husbandry", "✦", "Husbandry & Care"], ["/weights", "⚖️", "Weight Records"], ["/feeding", "🍽️", "Feeding Tracker"], ["/shedding", "🐍", "Shed Intelligence"], ["/behaviour", "◉", "Behaviour Journal"], ["/health", "+", "Health & Vet"], ["/enclosure-intelligence", "⌘", "Enclosure Intelligence"]] },
    { label: "Genetics & Breeding", links: [["/morph-library", "🧬", "Morph Library"], ["/calculator", "∑", "Genetics Calculator"], ["/breeding", "🥚", "Breeding Planner"], ["/breeding/academy", "▣", "Breeding Academy"]] },
    { label: "Learn & Community", links: [["/keeper-handbook", "📖", "Keeper Behaviour Handbook"], ["/behaviour-observatory", "🔭", "Behaviour Observatory"], ["/make-contribution", "＋", "Make a Contribution"], ["/knowledge-base", "▤", "Knowledge Base"], ["/challenge", "◆", "Titans Challenge"], ["/community", "◌", "Community Hub"], ["/community/mentorship", "↔", "Mentorship"], ["/community/wall-of-titans", "★", "Wall of Titans"]] },
    { label: "Account", links: [["/account", "●", "My Account"], ["/account/family", "👨‍👩‍👧", "My Family"], ["/become-a-titan", "✦", "Become a Titan"]] },
  ];
  const restricted: NavigationSection[] = [];
  if (educatorAuthorized) restricted.push({ label: "Educator", links: [["/educator", "▣", "Educator Centre"]] });
  if (creatorAuthorized) restricted.push({ label: "Creator", links: [["/creator", "⚒", "Creator Centre"], ["/creator/morph-library", "🖼️", "Morph Library Editor"], ["/creator/community", "◈", "Community Manager"], ["/creator/mentor-review", "↔", "Mentor Review"]] });
  if (testerAuthorized) restricted.push({ label: "Testing", links: [["/creator/tester", "◇", "Tester Centre"]] });

  const quickRestrictedItems: QuickNavItem[] = [
    ...(educatorAuthorized ? [{ id: "educator", label: "Educator Centre", icon: "▣", path: "/educator", group: "Educator", description: "Teaching and classroom tools." } satisfies QuickNavItem] : []),
    ...(creatorAuthorized ? [
      { id: "creator", label: "Creator Centre", icon: "⚒", path: "/creator", group: "Creator", description: "Creator administration and tools." },
      { id: "creator-morph", label: "Morph Library Editor", icon: "🖼️", path: "/creator/morph-library", group: "Creator", description: "Review and manage morph submissions." },
      { id: "creator-community", label: "Community Manager", icon: "◈", path: "/creator/community", group: "Creator", description: "Publish official Community Hub content." },
      { id: "creator-mentor", label: "Mentor Review", icon: "↔", path: "/creator/mentor-review", group: "Creator", description: "Review mentor applications." },
    ] satisfies QuickNavItem[] : []),
    ...(testerAuthorized ? [{ id: "tester", label: "Tester Centre", icon: "◇", path: "/creator/tester", group: "Testing", description: "Tester tools and focused test flows." } satisfies QuickNavItem] : []),
  ];
  const quickItems = useMemo(() => quickNavSearchItems(quickSearch).concat(quickRestrictedItems.filter((item) => quickNavSearchItems(quickSearch).every((candidate) => candidate.id !== item.id))), [quickSearch, educatorAuthorized, creatorAuthorized, testerAuthorized]);
  const quickGroups = useMemo(() => quickItems.reduce<Record<string, QuickNavItem[]>>((groups, item) => { (groups[item.group] ??= []).push(item); return groups; }, {}), [quickItems]);

  const renderLink = ([to, icon, label]: NavigationLink) => <li className="app-navigation-item" key={to}><NavLink to={to} end={to === "/"} onClick={() => setMoreOpen(false)} className="app-navigation-link"><span className="app-navigation-icon" aria-hidden="true">{icon}</span><span className="app-navigation-label">{label}</span>{to === "/community" && (communityUnreadCount > 0 || unseenProductUpdate) && <span className="community-unread-dot" aria-label="New Community Hub updates" title="New Community Hub updates" />}</NavLink></li>;

  if (isEasyNav) {
    const openMore = () => setMoreOpen((current) => !current);
    const openQuickItem = (item: QuickNavItem) => { setMoreOpen(false); setQuickSearch(""); navigate(item.path); };
    return <>
      <nav className="app-navigation tt-easy-nav-strip" aria-label="Quick Mode navigation"><div className="tt-easy-nav-inner"><NavLink to="/" end className="tt-easy-nav-link"><span>🏠</span><small>At a Glance</small></NavLink><NavLink to="/snakes" className="tt-easy-nav-link"><span>🐍</span><small>My Snakes</small></NavLink><NavLink to="/reminders" className="tt-easy-nav-link"><span>🔔</span><small>Due</small></NavLink><button type="button" className={`tt-easy-nav-link tt-easy-nav-more${moreOpen ? " active" : ""}`} onClick={openMore} aria-expanded={moreOpen} aria-controls="tt-easy-more-menu"><span>☰</span><small>Everything</small></button></div></nav>
      {moreOpen && <div className="tt-easy-more-backdrop" role="presentation" onClick={() => setMoreOpen(false)}><section id="tt-easy-more-menu" className="tt-easy-more" role="dialog" aria-modal="true" aria-label="Quick Mode full app navigation" onClick={(event) => event.stopPropagation()}><div className="tt-easy-more-head"><div><span>QUICK MODE · FULL APP</span><h2>Everything in Tiny Titans</h2><p>Quick Mode changes how you navigate — it never removes a feature.</p></div><button type="button" onClick={() => setMoreOpen(false)} aria-label="Close full navigation">×</button></div><label className="tt-easy-search"><span aria-hidden="true">⌕</span><input value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} placeholder="Find anything in Tiny Titans…" aria-label="Search the full Tiny Titans app" autoFocus /></label>{Object.entries(quickGroups).map(([group, items]) => <section className="tt-easy-more-group" key={group}><h3>{group}</h3><div className="tt-easy-more-grid">{items.map((item) => <button type="button" className="tt-easy-feature-link" key={item.id} onClick={() => openQuickItem(item)}><span className="app-navigation-icon" aria-hidden="true">{item.icon}</span><span><strong>{item.label}</strong><small>{item.description}</small></span></button>)}</div></section>)}{quickItems.length === 0 && <div className="tt-easy-no-results"><strong>Nothing matched.</strong><span>Try a broader search such as feeding, genetics, community or account.</span></div>}<div className="tt-easy-more-foot"><button type="button" onClick={() => { setMoreOpen(false); navigate("/account/personalise?quick-mode=1"); }}>⚡ Customise Quick Mode</button></div></section></div>}
    </>;
  }

  return <nav className="app-navigation" aria-label="Main navigation"><div className="app-navigation-inner">{sections.concat(restricted).map((section) => <section className="app-navigation-section" key={section.label} aria-labelledby={`nav-${section.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}><h2 className="app-navigation-section-label" id={`nav-${section.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{section.label}</h2><ul className="app-navigation-list">{section.links.map(renderLink)}</ul></section>)}</div></nav>;
}
export default Navigation;
