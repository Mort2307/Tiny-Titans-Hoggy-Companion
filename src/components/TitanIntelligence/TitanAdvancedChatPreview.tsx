import { Link } from "react-router-dom";
import "./TitanAdvancedChatPreview.css";

export default function TitanAdvancedChatPreview() {
  return (
    <section className="titan-advanced-preview">
      <div>
        <span className="titan-eyebrow">ASK TITAN · PAID FEATURE</span>
        <h2>Unlock the conversational intelligence layer</h2>
        <p>Free users keep the core Tiny Titans intelligence already available. Every paid tier adds Ask Titan, allowing the intelligence system to investigate authorised records, use deterministic analysis and retrieve relevant web evidence.</p>
      </div>
      <div className="titan-preview-grid">
        <span>🧠 Ask natural-language questions</span>
        <span>📊 Analyse your recorded data</span>
        <span>🔎 Find supported patterns</span>
        <span>🌍 Search current evidence when useful</span>
      </div>
      <Link className="titan-preview-cta" to="/plans?tier=titan_pro">Compare paid tiers →</Link>
    </section>
  );
}