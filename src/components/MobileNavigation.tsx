import { useEffect, useState } from "react";
import "../styles/mobileNavigation.css";

type NavItem = { to: string; label: string; icon: string };

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", icon: "🏠" },
  { to: "/snakes", label: "My Snakes", icon: "🐍" },
  { to: "/reptile-room", label: "Reptile Room", icon: "🦎" },
  { to: "/husbandry", label: "Husbandry & Care", icon: "🌡️" },
  { to: "/behaviour", label: "Behaviour Journal", icon: "👀" },
  { to: "/health", label: "Health & Vet", icon: "🩺" },
  { to: "/enclosure-intelligence", label: "Enclosure Intelligence", icon: "🏠" },
  { to: "/morph-library", label: "Morph Library", icon: "🧬" },
  { to: "/calculator", label: "Genetics Calculator", icon: "🧮" },
  { to: "/breeding", label: "Breeding Planner", icon: "🥚" },
  { to: "/breeding/academy", label: "Breeding Academy", icon: "🎓" },
  { to: "/knowledge-base", label: "Knowledge Base", icon: "📚" },
  { to: "/challenge", label: "Titans Challenge", icon: "🧠" },
  { to: "/community", label: "Community Hub", icon: "🌿" },
  { to: "/community/mentorship", label: "Mentorship", icon: "🤝" },
  { to: "/community/wall-of-titans", label: "Wall of Titans", icon: "🏆" },
  { to: "/account", label: "My Account", icon: "🧑" },
  { to: "/become-a-titan", label: "Become a Titan", icon: "🐍" },
  { to: "/educator", label: "Educator Centre", icon: "🧑‍🏫" },
  { to: "/creator", label: "Creator Centre", icon: "🛠️" },
  { to: "/creator/community", label: "Community Manager", icon: "📢" },
  { to: "/creator/mentor-review", label: "Mentor Review", icon: "🤝" },
  { to: "/creator/tester", label: "Tester Centre", icon: "🧪" },
];

export default function MobileNavigation() {
  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setOpen(false);
    };
    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const navigate = (to: string) => {
    if (to === currentPath) {
      setOpen(false);
      return;
    }
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <>
      <button
        type="button"
        className={`mobile-nav-trigger ${open ? "is-open" : ""}`}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-controls="tiny-titans-mobile-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        <strong>Menu</strong>
      </button>

      {open && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="tiny-titans-mobile-navigation"
        className={`mobile-nav-drawer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
      >
        <div className="mobile-nav-header">
          <div>
            <span className="mobile-nav-kicker">TINY TITANS</span>
            <strong>Navigation</strong>
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation">
            ✕
          </button>
        </div>
        <nav className="mobile-nav-scroll" aria-label="Tiny Titans navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = item.to === "/" ? currentPath === "/" : currentPath.startsWith(item.to);
            return (
              <button
                key={item.to}
                type="button"
                className={`mobile-nav-item ${isActive ? "is-active" : ""}`}
                onClick={() => navigate(item.to)}
              >
                <span className="mobile-nav-icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
                <span className="mobile-nav-arrow" aria-hidden="true">›</span>
              </button>
            );
          })}
        </nav>
        <div className="mobile-nav-footer">Swipe/scroll for more · tap any item to navigate</div>
      </aside>
    </>
  );
}
