import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { hasCapability } from "../../services/capabilityService";
import { getCommunityUnreadCount } from "../../services/communityReadStateService";
import "./Navigation.css";

type NavigationLink = [string, string, string];
type NavigationSection = { label: string; links: NavigationLink[] };

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
    void Promise.all([
      hasCapability("creator", profile),
      hasCapability("tester", profile),
      hasCapability("educator", profile),
    ]).then(([creator, tester, educator]) => {
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
      void getCommunityUnreadCount(userId, {
        isTester: profile?.isTester === true,
        isAdmin: profile?.role === "admin",
      }).then((count) => {
        if (active) setCommunityUnreadCount(count);
      }).catch(() => {
        if (active) setCommunityUnreadCount(0);
      });
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

  const sections: NavigationSection[] = [
    {
      label: "Overview",
      links: [
        ["/", "⌂", "Home"],
        ["/snakes", "🐍", "My Snakes"],
        ["/reptile-room", "▦", "Reptile Room"],
      ],
    },
    {
      label: "Care",
      links: [
        ["/husbandry", "✦", "Husbandry & Care"],
        ["/behaviour", "◉", "Behaviour Journal"],
        ["/health", "+", "Health & Vet"],
        ["/enclosure-intelligence", "⌘", "Enclosure Intelligence"],
      ],
    },
    {
      label: "Genetics & Breeding",
      links: [
        ["/morph-library", "🧬", "Morph Library"],
        ["/calculator", "∑", "Genetics Calculator"],
        ["/breeding", "🥚", "Breeding Planner"],
        ["/breeding/academy", "▣", "Breeding Academy"],
      ],
    },
    {
      label: "Learn & Community",
      links: [
        ["/knowledge-base", "▤", "Knowledge Base"],
        ["/challenge", "◆", "Titans Challenge"],
        ["/community", "◌", "Community Hub"],
        ["/community/mentorship", "↔", "Mentorship"],
        ["/community/wall-of-titans", "★", "Wall of Titans"],
      ],
    },
    {
      label: "Account",
      links: [
        ["/account", "●", "My Account"],
        ["/become-a-titan", "✦", "Become a Titan"],
      ],
    },
  ];

  const restricted: NavigationSection[] = [];
  if (educatorAuthorized) restricted.push({ label: "Educator", links: [["/educator", "▣", "Educator Centre"]] });
  if (creatorAuthorized) restricted.push({ label: "Creator", links: [["/creator", "⚒", "Creator Centre"], ["/creator/community", "◈", "Community Manager"], ["/creator/mentor-review", "↔", "Mentor Review"]] });
  if (testerAuthorized) restricted.push({ label: "Testing", links: [["/creator/tester", "◇", "Tester Centre"]] });

  const renderLink = ([to, icon, label]: NavigationLink) => (
    <li className="app-navigation-item" key={to}>
      <NavLink to={to} className="app-navigation-link">
        <span className="app-navigation-icon" aria-hidden="true">{icon}</span>
        <span className="app-navigation-label">{label}</span>
        {to === "/community" && communityUnreadCount > 0 && (
          <span
            className="community-unread-dot"
            aria-label={`${communityUnreadCount} unread community update${communityUnreadCount === 1 ? "" : "s"}`}
            title={`${communityUnreadCount} unread community update${communityUnreadCount === 1 ? "" : "s"}`}
          />
        )}
      </NavLink>
    </li>
  );

  return (
    <nav className="app-navigation" aria-label="Main navigation">
      <div className="app-navigation-inner">
        {sections.concat(restricted).map((section) => (
          <section className="app-navigation-section" key={section.label} aria-labelledby={`nav-${section.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
            <h2 className="app-navigation-section-label" id={`nav-${section.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
              {section.label}
            </h2>
            <ul className="app-navigation-list">{section.links.map(renderLink)}</ul>
          </section>
        ))}
      </div>
    </nav>
  );
}

export default Navigation;
