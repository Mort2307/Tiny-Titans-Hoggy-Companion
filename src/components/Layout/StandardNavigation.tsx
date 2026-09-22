import { NavLink } from "react-router-dom";
import TinyTitansIcon from "../TinyTitansIcon";
import AnimatedAnimalIcon from "../AnimatedAnimalIcon";
import type { TinyTitansIconName } from "../TinyTitansIcon";

export type NavigationLink = [string, TinyTitansIconName, string];
export type NavigationSection = { label: string; links: NavigationLink[] };

type Props = {
  sections: NavigationSection[];
  restricted: NavigationSection[];
  communityUnreadCount: number;
  unseenProductUpdate: boolean;
  onNavigate: () => void;
};

function StandardNavigation({
  sections,
  restricted,
  communityUnreadCount,
  unseenProductUpdate,
  onNavigate,
}: Props) {
  return (
    <nav className="app-navigation" aria-label="Main navigation">
      <div className="app-navigation-inner">
        {sections.concat(restricted).map((section) => {
          const id = `nav-${section.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
          return (
            <section className="app-navigation-section" key={section.label} aria-labelledby={id}>
              <h2 className="app-navigation-section-label" id={id}>{section.label}</h2>
              <ul className="app-navigation-list">
                {section.links.map(([to, icon, label]) => (
                  <li className="app-navigation-item" key={`${to}-${label}`}>
                    <NavLink
                      data-route-guide-target={to === "/account" ? "standard-my-account" : undefined}
                      to={to}
                      end={to === "/"}
                      onClick={onNavigate}
                      className="app-navigation-link"
                    >
                      <span className="app-navigation-icon" aria-hidden="true">{to === "/snakes" ? <AnimatedAnimalIcon size={25} /> : <TinyTitansIcon name={icon} size={25} />}</span>
                      <span className="app-navigation-label">{label}</span>
                      {to === "/community" && (communityUnreadCount > 0 || unseenProductUpdate) && (
                        <span className="community-unread-dot" aria-label="New Community Hub updates" title="New Community Hub updates" />
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </nav>
  );
}

export default StandardNavigation;
