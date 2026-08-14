import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navigation.css";

function Navigation() {
  const { profile } = useAuth();

  const links: [string, string, string][] = [
    ["/", "🏠", "Home"],
    ["/snakes", "🐍", "My Snakes"],
    ["/morph-library", "🧬", "Morph Library"],
    ["/calculator", "🧮", "Genetics Calculator"],
    ["/knowledge-base", "📚", "Knowledge Base"],
    ["/challenge", "🧠", "Titans Challenge"],
    ["/account", "🧑", "My Account"],
    ["/report-issue", "🐛", "Report an Issue"],
    ["/become-a-titan", "🐍", "Become a Titan"],
  ];

  if (profile?.profileType === "educator") links.push(["/educator", "🧑‍🏫", "Educator Centre"]);
  if (profile?.role === "admin") links.push(["/creator", "🛠️", "Creator Centre"]);

  return <nav className="app-navigation" aria-label="Main navigation"><div className="app-navigation-inner"><ul className="app-navigation-list">{links.map(([to, icon, label]) => <li className="app-navigation-item" key={to}><NavLink to={to} className="app-navigation-link"><span className="app-navigation-icon" aria-hidden="true">{icon}</span><span className="app-navigation-label">{label}</span></NavLink></li>)}</ul></div></nav>;
}

export default Navigation;
