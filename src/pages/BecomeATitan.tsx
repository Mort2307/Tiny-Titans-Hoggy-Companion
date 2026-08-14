import { useNavigate, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../context/AuthContext";
import { app } from "../firebase/config";
import "../styles/CreatorTools.css";

const supportOptions = [
  { key: "little", amount: 5, label: "Little Titan", icon: "🐍" },
  { key: "growing", amount: 10, label: "Growing Titan", icon: "🐍" },
  { key: "champion", amount: 20, label: "Champion Titan", icon: "👑" },
  { key: "legendary", amount: 40, label: "Legendary Titan", icon: "🏆" },
  { key: "broken", amount: 100, label: "You Just Broke Me", icon: "💀" },
] as const;

const functions = getFunctions(app, "europe-west2");
const createTitanCheckout = httpsCallable<
  { tier: string },
  { url: string }
>(functions, "createTitanCheckout");

export default function BecomeATitan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState("growing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => supportOptions.find((option) => option.key === selectedTier) ?? supportOptions[1],
    [selectedTier]
  );

  if (!user) return null;

  const paymentState = searchParams.get("payment");

  const handleCheckout = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await createTitanCheckout({ tier: selected.key });
      window.location.assign(result.data.url);
    } catch (checkoutError) {
      console.error("Titan checkout failed", checkoutError);
      setError("We couldn't open Stripe Checkout. Please try again in a moment.");
      setLoading(false);
    }
  };

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

        {paymentState === "success" && (
          <div className="creator-success" role="status">
            <strong>Thank you for becoming a Titan! 🐍💚</strong>
            <span>
              Stripe has confirmed your checkout. Your supporter status will be
              added to your account when the payment confirmation reaches Tiny Titans.
            </span>
          </div>
        )}

        {paymentState === "cancelled" && (
          <div className="creator-founder-callout" role="status">
            <strong>Checkout cancelled.</strong>
            <span>No payment was taken. You can choose a tier and try again whenever you like.</span>
          </div>
        )}

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
                key={option.key}
                type="button"
                className={selectedTier === option.key ? "creator-primary" : ""}
                onClick={() => setSelectedTier(option.key)}
                disabled={loading}
              >
                {option.icon} {option.label} · £{option.amount}
              </button>
            ))}
          </div>

          <div className="creator-founder-callout">
            <strong>Selected support: £{selected.amount} · {selected.label}</strong>
            <span>
              You'll be taken to Stripe's secure hosted checkout. Tiny Titans
              never handles or stores your card details.
            </span>
          </div>

          {error && <div className="creator-error" role="alert">{error}</div>}

          <div className="creator-actions">
            <button type="button" onClick={() => navigate(-1)} disabled={loading}>
              Back
            </button>
            <button
              type="button"
              className="creator-primary"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? "Opening Stripe…" : `🐍 Support Tiny Titans · £${selected.amount}`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
