import { Link } from "react-router-dom";
import "./TitanAdvancedChatPreview.css";
import TinyTitansIcon from "../TinyTitansIcon";

export default function TitanAdvancedChatPreview() {
  return (
    <section className="titan-advanced-preview">
      <div>
        <span className="titan-eyebrow">ASK TITAN · PAID FEATURE</span>
        <h2>Unlock the conversational intelligence layer</h2>
        <p>Free users keep the core Tiny Titans intelligence already available. Every paid tier adds Ask Titan, allowing the intelligence system to investigate authorised records, use deterministic analysis and retrieve relevant web evidence.</p>
      </div>
      <div className="titan-preview-grid">
        <span><TinyTitansIcon name="titan" size={16} /> Ask natural-language questions</span>
        <span><TinyTitansIcon name="analytics" size={16} /> Analyse your recorded data</span>
        <span><TinyTitansIcon name="search" size={16} /> Find supported patterns</span>
        <span><TinyTitansIcon name="community" size={16} /> Search current evidence when useful</span>
      </div>
      <Link className="titan-preview-cta" to="/plans?tier=titan_pro">Compare paid tiers <TinyTitansIcon name="forward" size={13} /></Link>
    </section>
  );
}