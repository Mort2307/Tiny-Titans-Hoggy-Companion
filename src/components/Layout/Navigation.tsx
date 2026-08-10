import { NavLink } from "react-router-dom";

import "./Navigation.css";

function Navigation() {
  return (
    <nav
      className="app-navigation"
      aria-label="Main navigation"
    >
      <ul className="app-navigation-list">

        <li className="app-navigation-item">
          <NavLink
            to="/"
            className="app-navigation-link"
          >
            <span className="app-navigation-icon">
              🏠
            </span>

            <span className="app-navigation-label">
              Home
            </span>
          </NavLink>
        </li>

        <li className="app-navigation-item">
          <NavLink
            to="/snakes"
            className="app-navigation-link"
          >
            <span className="app-navigation-icon">
              🐍
            </span>

            <span className="app-navigation-label">
              My Snakes
            </span>
          </NavLink>
        </li>

        <li className="app-navigation-item">
          <NavLink
            to="/morph-library"
            className="app-navigation-link"
          >
            <span className="app-navigation-icon">
              🧬
            </span>

            <span className="app-navigation-label">
              Morph Library
            </span>
          </NavLink>
        </li>

        <li className="app-navigation-item">
          <NavLink
            to="/calculator"
            className="app-navigation-link"
          >
            <span className="app-navigation-icon">
              🧮
            </span>

            <span className="app-navigation-label">
              Genetics Calculator
            </span>
          </NavLink>
        </li>

        <li className="app-navigation-item">
          <NavLink
            to="/knowledge-base"
            className="app-navigation-link"
          >
            <span className="app-navigation-icon">
              📚
            </span>

            <span className="app-navigation-label">
              Knowledge Base
            </span>
          </NavLink>
        </li>

        <li className="app-navigation-item">
          <NavLink
            to="/account"
            className="app-navigation-link"
          >
            <span className="app-navigation-icon">
              🧑
            </span>

            <span className="app-navigation-label">
              My Account
            </span>
          </NavLink>
        </li>

      </ul>
    </nav>
  );
}

export default Navigation;