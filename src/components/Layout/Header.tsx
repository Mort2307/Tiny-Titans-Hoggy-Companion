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

      <span className="app-brand-name" aria-label="Tiny Titans">Tiny Titans</span>
    </header>
  );
}

export default Header;
