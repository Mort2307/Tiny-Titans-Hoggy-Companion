import { NavLink } from "react-router-dom";

const adminSections = [
  { label: "Dashboard", path: "/creator" },
  { label: "Users", path: "/creator/users" },
  { label: "Activity", path: "/creator/activity" },
  { label: "Analytics", path: "/creator/analytics" },
  { label: "Health", path: "/creator/health" },
  { label: "Genetics", path: "/creator/genetics" },
  { label: "Content", path: "/creator/content" },
];

export default function CreatorAdminNav() {
  return (
    <nav className="creator-admin__nav" aria-label="Creator Centre">
      <div className="creator-admin__brand">
        <span aria-hidden="true">👑</span>
        <span>Creator Centre</span>
      </div>
      <div className="creator-admin__links">
        {adminSections.map((section) => (
          <NavLink
            key={section.path}
            to={section.path}
            end={section.path === "/creator"}
            className={({ isActive }) =>
              isActive
                ? "creator-admin__link creator-admin__link--active"
                : "creator-admin__link"
            }
          >
            {section.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
