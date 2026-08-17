import { useNavigate, useSearchParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../context/AuthContext";
import { app } from "../firebase/config";
import "../styles/CreatorTools.css";

const supportOptions = [
  { key: "starter", amount: 1, label: "Become a Titan", icon: "🐍" },
  { key: "little", amount: 5, label: "Little Titan", icon: "🐍" },
  { key: "growing", amount: 10, label: "Growing Titan", icon: "🐍" },
  { key: "champion", amount: 20, label: "Champion Titan", icon: "👑" },
  { key: "legendary", amount: 40, label: "Legendary Titan", icon: "🏆" },
  { key: "broken", amount: 100, label: "You Just Broke Me", icon: "💀" },
] as const;

const functions = getFunctions(app, "europe-west2");
// Use the isolated V2 callable so the live app cannot accidentally hit the legacy Stripe implementation.
const createTitanCheckout = httpsCallable<{ tier: string; amountGbp?: string }, { url: string }>(functions, "createTitanCheckoutV2");

function checkoutErrorMessage(error: unknown) {
  const firebaseError = error as { code?: string; message?: string };
  const code = String(firebaseError.code || "");
  const message = String(firebaseError.message || "");
  if (code.includes("failed-precondition")) return message || "Stripe support payments are not configured correctly yet.";
  if (code.includes("invalid-argument")) return message || "Please check the support amount and try again.";
  if (code.includes("unauthenticated")) return "Please sign in again before starting Stripe Checkout.";
  return message || "Stripe Checkout could not be started. Please try again in a moment.";
}

export default function BecomeATitan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState("starter");
  const [customMode, setCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selected = useMemo(() => supportOptions.find((option) => option.key === selectedTier) ?? supportOptions[0], [selectedTier]);
  const customAmountNumber = Number(customAmount);
  const customAmountValid = /^\d+(?:\.\d{1,2})?$/.test(customAmount.trim()) && Number.isFinite(customAmountNumber) && customAmountNumber >= 1;
  const displayAmount = customMode ? (customAmountValid ? customAmountNumber.toFixed(2) : "—") : selected.amount.toFixed(2);
  if (!user) return null;
  const paymentState = searchParams.get("payment");
  const handleCheckout = async () => {
    setError("");
    if (customMode && !customAmountValid) { setError("Please enter a custom support amount of at least £1.00."); return; }
    setLoading(true);
    try {
      const result = customMode ? await createTitanCheckout({ tier: "custom", amountGbp: customAmount.trim() }) : await createTitanCheckout({ tier: selected.key });
      if (!result.data?.url) throw new Error("Stripe did not return a checkout URL.");
      window.location.assign(result.data.url);
    } catch (checkoutError) {
      console.error("Titan checkout failed", checkoutError);
      setError(checkoutErrorMessage(checkoutError));
      setLoading(false);
    }
  };
  return <section className="creator-tools-page"><div className="creator-tools-card"><div className="creator-tools-header"><span>🐍</span><div><h1>Become a Titan</h1><p>Help Tiny Titans grow.</p></div></div>{paymentState === "success" && <div className="creator-success" role="status"><strong>Thank you for supporting Tiny Titans! 🐍💚</strong><span>Stripe has confirmed your checkout. Your supporter status will be added to your account when the payment confirmation reaches Tiny Titans.</span></div>}{paymentState === "cancelled" && <div className="creator-founder-callout" role="status"><strong>Checkout cancelled.</strong><span>No payment was taken. You can choose another amount and try again whenever you like.</span></div>}<div className="creator-founder-grid"><div><h2>Support Tiny Titans</h2><p>Tiny Titans is built to give keepers a genuinely useful place to track their hoggies, understand genetics and learn better husbandry. If you enjoy the app and want to help keep it growing, you can support the project with a one-time contribution.</p><ul><li>Help cover hosting and development costs</li><li>Support continued genetics research and database work</li><li>Help fund new features and educational content</li><li>Support an independent reptile project built by a keeper</li></ul></div><div className="creator-founder-callout"><strong>Every Titan counts. 🐍</strong><span>Support is completely optional, one-time and does not unlock admin access or change your normal account permissions.</span></div></div><div className="creator-form"><h2>Choose your support</h2><p>Start with £1 or choose a preset amount. Want to give something different? Enter any custom amount from £1.00 upwards.</p><div className="creator-actions" style={{ flexWrap: "wrap" }}>{supportOptions.map((option) => <button key={option.key} type="button" className={!customMode && selectedTier === option.key ? "creator-primary" : ""} onClick={() => { setCustomMode(false); setSelectedTier(option.key); setError(""); }} disabled={loading}>{option.icon} {option.label} · £{option.amount}</button>)}<button type="button" className={customMode ? "creator-primary" : ""} onClick={() => { setCustomMode(true); setError(""); }} disabled={loading}>💚 Custom amount</button></div>{customMode && <label>Custom support amount <span> (minimum £1.00)</span><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><span aria-hidden="true">£</span><input inputMode="decimal" type="text" value={customAmount} onChange={(event) => { setCustomAmount(event.target.value.replace(/[^0-9.]/g, "")); setError(""); }} placeholder="1.00" aria-label="Custom support amount in pounds" disabled={loading} /></div><small>Enter pounds and pence, for example £1, £2.50 or £25.</small></label>}<div className="creator-founder-callout"><strong>Selected support: {displayAmount === "—" ? "Enter an amount" : `£${displayAmount}`}</strong><span>This is a one-time contribution. You'll be taken to Stripe's secure hosted checkout. Tiny Titans never handles or stores your card details.</span></div>{error && <div className="creator-error" role="alert">{error}</div>}<div className="creator-actions"><button type="button" onClick={() => navigate(-1)} disabled={loading}>Back</button><button type="button" className="creator-primary" onClick={handleCheckout} disabled={loading || (customMode && !customAmountValid)}>{loading ? "Opening Stripe…" : `🐍 Support Tiny Titans · ${displayAmount === "—" ? "Choose amount" : `£${displayAmount}`}`}</button></div></div></div></section>;
}
