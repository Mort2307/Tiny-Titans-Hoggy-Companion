import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { hasCapability } from "../../services/capabilityService";
import { getCommunityUnreadCount } from "../../services/communityReadStateService";
import "./Navigation.css";

function Navigation() {
  const { profile, user, loading, profileLoading } = useAuth();
  const userId = user?.uid;
  const [creatorAuthorized, setCreatorAuthorized] = useState(false);
  const [testerAuthorized, setTesterAuthorized] = useState(false);
  const [educatorAuthorized, setEducatorAuthorized] = useState(false);
  const [communityUnreadCount, setCommunityUnreadCount] = useState(0);
  const authReady = !loading && !profileLoading && Boolean(userId);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    void Promise.all([hasCapability("creator", profile), hasCapability("tester", profile), hasCapability("educator", profile)]).then(([creator, tester, educator]) => {
      if (!active) return;
      setCreatorAuthorized(creator);
      setTesterAuthorized(tester);
      setEducatorAuthorized(educator);
    }).catch(() => {
      if (!active) return;
      setCreatorAuthorized(false);
      setTesterAuthorized(false);
      setEducatorAuthorized(false);
    });
    return () => { active = false; };
  }, [authReady, profile]);

  useEffect(() => {
    if (!authReady || !userId) return;
    let active = true;
    const refresh = () => {
      void getCommunityUnreadCount(userId, { isTester: profile?.isTester === true, isAdmin: profile?.role === "admin" })
        .then((count) => { if (active) setCommunityUnreadCount(count); })
        .catch(() => { if (active) setCommunityUnreadCount(0); });
    };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("community-read-state-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("community-read-state-changed", refresh);
    };
  }, [authReady, userId, profile?.isTester, profile?.role]);

  const links: [string, string, string][] = [
    ["/", "ðŸ ", "Home"],
    ["/snakes", "ðŸ", "My Snakes"],
    ["/morph-library", "ðŸ§¬", "Morph Library"],
    ["/calculator", "ðŸ§®", "Genetics Calculator"],
    ["/breeding", "ðŸ¥š", "Breeding Planner"],
    ["/knowledge-base", "ðŸ“š", "Knowledge Base"],
    ["/challenge", "ðŸ§ ", "Titans Challenge"],
    ["/community", "ðŸŒ¿", "Community Hub"],
    ["/community/wall-of-titans", "ðŸ†", "Wall of Titans"],
    ["/account", "ðŸ§‘", "My Account"],
    ["/become-a-titan", "ðŸ", "Become a Titan"],
  ];
  if (educatorAuthorized) links.push(["/educator", "ðŸ§‘â€ðŸ«", "Educator Centre"]);
  if (creatorAuthorized) {
    links.push(["/creator", "ðŸ› ï¸", "Creator Centre"]);
    links.push(["/creator/community", "ðŸ“¢", "Community Manager"]);
  }
  if (testerAuthorized) links.push(["/creator/tester", "ðŸ§ª", "Tester Centre"]);

  return <nav className="app-navigation" aria-label="Main navigation"><div className="app-navigation-inner"><ul className="app-navigation-list">{links.map(([to, icon, label]) => <li className="app-navigation-item" key={to}><NavLink to={to} className="app-navigation-link"><span className="app-navigation-icon" aria-hidden="true">{icon}</span><span className="app-navigation-label">{label}</span>{to === "/community" && communityUnreadCount > 0 && <span className="community-unread-dot" aria-label={`${communityUnreadCount} unread community update${communityUnreadCount === 1 ? "" : "s"}`} title={`${communityUnreadCount} unread community update${communityUnreadCount === 1 ? "" : "s"}`} />}</NavLink></li>)}</ul></div></nav>;
}
export default Navigation;
