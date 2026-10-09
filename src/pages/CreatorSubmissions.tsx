import { Link } from "react-router-dom";
import CreatorReviewStudio from "./CreatorReviewStudio";
import TinyTitansIcon from "../components/TinyTitansIcon";
import CreatorVariationCardReview from "../components/CreatorVariationCardReview";

export default function CreatorSubmissions() {
  return <>
    <CreatorReviewStudio />
    <div style={{ maxWidth: 1200, margin: "-18px auto 42px", padding: "0 20px" }}><CreatorVariationCardReview /></div>
    <div style={{ maxWidth: 1200, margin: "-42px auto 42px", padding: "0 20px", textAlign: "right" }}>
      <Link to="/creator/morph-terminology" className="creator-tool-button"><TinyTitansIcon name="community" size={14} /> Open terminology review</Link>
    </div>
  </>;
}
