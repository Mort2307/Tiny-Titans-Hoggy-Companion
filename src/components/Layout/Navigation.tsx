import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { hasCreatorClaim } from "../../services/creatorAuthService";
import { getCommunityUnreadCount } from "../../services/communityReadStateService";
import "./Navigation.css";

function Navigation() {
  const { profile, user, loading, profileLoading } = useAuth();
  const [creatorAuthorized, setCreatorAuthorized] = useState(false);
  const [communityUnreadCount, setCommunityUnreadCount] = useState(0);

  useEffect(() => {
    if (loading || profileLoading || !user) {
      setCreatorAuthorized(false);
      return;
    }

    let active = true;
    void hasCreatorClaim(false)
      .then((claimAuthorized) => {
        if (!active) return;
        const legacyCreatorAuthorized = profile?.role === "admin" || profile?.profileType === "creator";
        setCreatorAuthorized(claimAuthorized || legacyCreatorAuthorized);
      })
      .catch(() => {
        if (!active) return;
        setCreatorAuthorized(profile?.role === "admin" || profile?.profileType === "creator");
      });

    return () => {
      active = false;
    };
  }, [user, profile, loading, profileLoading]);

  useEffect(() => {
    if (loading || profileLoading || !user) {
      setCommunityUnreadCount(0);
      return;
    }

    let active = true;
    void getCommunityUnreadCount(user.uid, {
      isTester: profile?.isTester === true,
      isAdmin: profile?.role === "admin",
    })
      .then((count) => {
        if (active) setCommunityUnreadCount(count);
      })
      .catch(() => {
        if (active) setCommunityUnreadCount(0);
      });

    const refresh = () => {
      void getCommunityUnreadCount(user.uid, {
        isTester: profile?.isTester === true,
        isAdmin: profile?.role === "admin",
      }).then((count) => {
        if (active) setCommunityUnreadCount(count);
      }).catch(() => undefined);
    };

    window.addEventListener("focus", refresh);
    window.addEventListener("community-read-state-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("community-read-state-changed", refresh);
    };
  }, [user?.uid, profile?.isTester, profile?.role, loading, profileLoading]);

  const links: [string, string, string][] = [
    ["/", "🏠", "Home"],
    ["/snakes", "🐍", "My Snakes"],
    ["/morph-library", "🧬", "Morph Library"],
    ["/calculator", "🧮", "Genetics Calculator"],
    ["/knowledge-base", "📚", "Knowledge Base"],
    ["/challenge", "🧠", "Titans Challenge"],
    ["/community", "🌿", "Community Hub"],
    ["/community/wall-of-titans", "🏆", "Wall of Titans"],
    ["/account", "🧑", "My Account"],
    ["/become-a-titan", "🐍", "Become a Titan"],
  ];

  if (profile?.profileType === "educator") {
    links.push(["/educator", "🧑‍🏫", "Educator Centre"]);
  }

  if (creatorAuthorized) {
    links.push(["/creator", "🛠️", "Creator Centre"]);
    links.push(["/creator/community", "📢", "Community Manager"]);
    links.push(["/creator/tester", "🧪", "Tester Centre"]);
  }

  return (
    <nav className="app-navigation" aria-label="Main navigation">
      <div className="app-navigation-inner">
        <ul className="app-navigation-list">
          {links.map(([to, icon, label]) => (
            <li className="app-navigation-item" key={to}>
              <NavLink to={to} className="app-navigation-link">
                <span className="app-navigation-icon" aria-hidden="true">{icon}</span>
                <span className="app-navigation-label">{label}</span>
                {to === "/community" && communityUnreadCount > 0 && (
                  <span className="community-unread-dot" aria-label={`${communityUnreadCount} unread community update${communityUnreadCount === 1 ? "" : "s"}`} title={`${communityUnreadCount} unread community update${communityUnreadCount === 1 ? "" : "s"}`} />
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
