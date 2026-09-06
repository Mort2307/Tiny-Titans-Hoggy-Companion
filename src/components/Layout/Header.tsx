import { Link } from "react-router-dom";

import logo from "../../assets/TinyTitans-Logo.jpg";
import TitanCommandPalette from "../TitanCommandPalette/TitanCommandPalette";

function Header() {
  return (
    <header className="app-header">
      <Link
        to="/"
        className="logo-link"
        aria-label="Tiny Titans Reptile Companion home"
      >
        <img
          src={logo}
          alt="Tiny Titans Reptile Companion"
          className="tiny-titans-logo"
        />
      </Link>

      <div className="app-brand-lockup">
        <span className="app-brand-name" aria-label="Tiny Titans Reptile Companion">
          Tiny Titans Reptile Companion
        </span>
      </div>

      <div className="app-header-actions">
        <TitanCommandPalette />
      </div>
    </header>
  );
}

export default Header;
