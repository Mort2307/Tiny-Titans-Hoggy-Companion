import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { hasCreatorClaim } from "../../services/creatorAuthService";
import "./Navigation.css";

function Navigation() {
  const { profile, user, loading, profileLoading } = useAuth();
  const [creatorAuthorized, setCreatorAuthorized] = useState(false);

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

  const links: [string, string, string][] = [
    ["/", "🏠", "Home"],
    ["/snakes", "🐍", "My Snakes"],
    ["/morph-library", "🧬", "Morph Library"],
    ["/calculator", "🧮", "Genetics Calculator"],
    ["/knowledge-base", "📚", "Knowledge Base"],
    ["/challenge", "🧠", "Titans Challenge"],
    ["/community", "🌿", "Community Hub"],
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
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
