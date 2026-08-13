import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/CreatorTools.css";

const supportOptions = [
  { amount: 2, label: "Little Titan", icon: "🐍" },
  { amount: 5, label: "Growing Titan", icon: "🐍" },
  { amount: 10, label: "Titan Champion", icon: "👑" },
];

export default function BecomeATitan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState(5);

  if (!user) return null;

  return (
    <section className="creator-tools-page">
      <div className="creator-tools-card">
        <div className="creator-tools-header">
          <span>🐍</span>
          <div>
            <h1>Become a Titan</h1>
            <p>Help Tiny Titans grow.</p>
          </div>
        </div>

        <div className="creator-founder-grid">
          <div>
            <h2>Support Tiny Titans</h2>
            <p>
              Tiny Titans is built to give keepers a genuinely useful place to
              track their hoggies, understand genetics and learn better
              husbandry. If you enjoy the app and want to help keep it growing,
              you can become a Titan supporter.
            </p>
            <ul>
              <li>Help cover hosting and development costs</li>
              <li>Support continued genetics research and database work</li>
              <li>Help fund new features and educational content</li>
              <li>Support an independent reptile project built by a keeper</li>
            </ul>
          </div>

          <div className="creator-founder-callout">
            <strong>Every Titan counts. 🐍</strong>
            <span>
              Support is completely optional and does not unlock admin access
              or change your normal account permissions.
            </span>
          </div>
        </div>

        <div className="creator-form">
          <h2>Choose your Titan level</h2>
          <div className="creator-actions" style={{ flexWrap: "wrap" }}>
            {supportOptions.map((option) => (
              <button
                key={option.amount}
                type="button"
                className={selectedAmount === option.amount ? "creator-primary" : ""}
                onClick={() => setSelectedAmount(option.amount)}
              >
                {option.icon} {option.label} · £{option.amount}
              </button>
            ))}
          </div>

          <div className="creator-founder-callout">
            <strong>Selected support: £{selectedAmount}</strong>
            <span>
              Payment checkout will be connected to this supporter flow before
              it is enabled for live financial contributions.
            </span>
          </div>

          <div className="creator-actions">
            <button type="button" onClick={() => navigate(-1)}>Back</button>
            <button type="button" className="creator-primary" disabled>
              🐍 Support Tiny Titans
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
