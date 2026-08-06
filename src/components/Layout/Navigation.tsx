import { NavLink } from "react-router-dom";
import "./Navigation.css";

function Navigation() {
  return (
    <nav>
      <ul>
        <li>
          <NavLink to="/">Home</NavLink>
        </li>

        <li>
          <NavLink to="/snakes">My Snakes</NavLink>
        </li>

        <li>
          <NavLink to="/morph-library">Morph Library</NavLink>
        </li>

        <li>
          <NavLink to="/calculator">Genetics Calculator</NavLink>
        </li>

        <li>
          <NavLink to="/knowledge-base">Knowledge Base</NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;