import { Link } from "react-router-dom";
import CreatorReviewStudio from "./CreatorReviewStudio";

export default function CreatorSubmissions() {
  return <>
    <CreatorReviewStudio />
    <div style={{ maxWidth: 1200, margin: "-42px auto 42px", padding: "0 20px", textAlign: "right" }}>
      <Link to="/creator/morph-terminology" className="creator-tool-button">🌎 Open terminology review</Link>
    </div>
  </>;
}
