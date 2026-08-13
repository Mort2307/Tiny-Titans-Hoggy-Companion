import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Navigation.css";

function Navigation() {
  const { profile } = useAuth();
  const links = [
    ["/", "🏠", "Home"], ["/snakes", "🐍", "My Snakes"], ["/morph-library", "🧬", "Morph Library"],
    ["/calculator", "🧮", "Genetics Calculator"], ["/knowledge-base", "📚", "Knowledge Base"], ["/account", "🧑", "My Account"],
    ["/report-issue", "🐛", "Report an Issue"], ["/founder", "👑", "Become a Founder"],
  ];
  if (profile?.role === "admin") links.push(["/creator", "🛠️", "Creator Centre"]);
  return <nav className="app-navigation" aria-label="Main navigation"><ul className="app-navigation-list">
    {links.map(([to, icon, label]) => <li className="app-navigation-item" key={to}><NavLink to={to} className="app-navigation-link"><span className="app-navigation-icon">{icon}</span><span className="app-navigation-label">{label}</span></NavLink></li>)}
  </ul></nav>;
}
export default Navigation;
