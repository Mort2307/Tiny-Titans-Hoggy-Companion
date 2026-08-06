import { Link } from "react-router-dom";

function BackHomeButton() {
  return (
    <Link to="/" className="back-home-button">
      ← Home
    </Link>
  );
}

export default BackHomeButton;