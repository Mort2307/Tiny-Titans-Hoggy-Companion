import logo from "../../assets/TinyTitans-Logo.JPG.jpg";

function Header() {
  return (
    <header className="app-header">
      <img src={logo} alt="Tiny Titans logo" />
      <h1>Tiny Titans Hoggy Companion</h1>
    </header>
  );
}

export default Header;