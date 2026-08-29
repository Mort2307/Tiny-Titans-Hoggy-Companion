import { Link } from "react-router-dom";

import logo from "../../assets/TinyTitans-Logo.jpg";

function Header() {
  return (
    <header className="app-header">
      <Link
        to="/"
        className="logo-link"
        aria-label="Tiny Titans home"
      >
        <img
          src={logo}
          alt="Tiny Titans"
          className="tiny-titans-logo"
        />
      </Link>

      <div className="app-brand-lockup">
        <span className="app-brand-name" aria-label="Tiny Titans">Tiny Titans</span>
        <span className="app-brand-tagline">Hoggy Companion</span>
      </div>
    </header>
  );
}

export default Header;
