import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../context/AuthContext";
import { app } from "../firebase/config";
import { saveTitanWallProfile, type WallVisibility } from "../services/titanSupportService";
import "../styles/CreatorTools.css";
import "../styles/titanWall.css";

const supportOptions = [
  { key: "little", amount: 5, label: "Little Titan", icon: "🐍" },
  { key: "growing", amount: 10, label: "Growing Titan", icon: "🐍" },
  { key: "champion", amount: 20, label: "Champion Titan", icon: "👑" },
  { key: "legendary", amount: 40, label: "Legendary Titan", icon: "🏆" },
  { key: "broken", amount: 100, label: "You Just Broke Me", icon: "💀" },
] as const;

const MIN_CUSTOM_AMOUNT = 1;
const MAX_CUSTOM_AMOUNT = 1000;

const functions = getFunctions(app, "europe-west2");
const db = getFirestore(app);
const createTitanCheckout = httpsCallable<{ tier: string; customAmountGbp?: number }, { url: string }>(functions, "createTitanCheckout");

export default function BecomeATitan() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedTier, setSelectedTier] = useState("growing");
  const [customAmount, setCustomAmount] = useState("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wallVisibility, setWallVisibility] = useState<WallVisibility>("anonymous");
  const [wallName, setWallName] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [wallSaving, setWallSaving] = useState(false);
  const [wallSaved, setWallSaved] = useState(false);
  const [wallReady, setWallReady] = useState(false);

  const selected = useMemo(
    () => supportOptions.find((option) => option.key === selectedTier),
    [selectedTier]
  );
  const parsedCustomAmount = Number(customAmount.replace(",", "."));
  const customAmountValid = Number.isFinite(parsedCustomAmount) && parsedCustomAmount >= MIN_CUSTOM_AMOUNT && parsedCustomAmount <= MAX_CUSTOM_AMOUNT;
  const selectedAmount = selected?.amount ?? (customAmountValid ? parsedCustomAmount : 0);
  const selectedLabel = selected?.label ?? "Custom Titan";
  const paymentState = searchParams.get("payment");

  useEffect(() => {
    if (!user || paymentState !== "success") return;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkPayment = async () => {
      attempts += 1;
      try {
        const supporter = await getDoc(doc(db, "supporters", user.uid));
        if (supporter.exists() && supporter.data().status === "active") {
          const data = supporter.data();
          if (!cancelled) {
            await saveTitanWallProfile(user.uid, { visibility: "anonymous" }, {
              tierLabel: String(data.tierLabel || "Titan Supporter"),
              amountGbp: Number(data.amountGbp || 0),
              supportedAt: data.lastPaymentAt,
            });
            setWallReady(true);
          }
          return;
        }
      } catch (pollError) {
        console.warn("Unable to confirm Titan supporter wall entry", pollError);
      }
      if (!cancelled && attempts < 12) timer = setTimeout(checkPayment, 2500);
    };

    void checkPayment();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [user, paymentState]);

  if (!user) return null;

  const handleCheckout = async () => {
    setError("");
    if (selectedTier === "custom" && !customAmountValid) {
      setError(`Please enter a custom support amount between £${MIN_CUSTOM_AMOUNT} and £${MAX_CUSTOM_AMOUNT}.`);
      return;
    }
    setLoading(true);
    try {
      const result = await createTitanCheckout(
        selectedTier === "custom"
          ? { tier: "custom", customAmountGbp: Number(parsedCustomAmount.toFixed(2)) }
          : { tier: selectedTier }
      );
      window.location.assign(result.data.url);
    } catch (checkoutError) {
      console.error("Titan checkout failed", checkoutError);
      setError("We couldn't open Stripe Checkout. Please try again in a moment.");
      setLoading(false);
    }
  };

  const handleWallSave = async () => {
    setError("");
    setWallSaved(false);
    setWallSaving(true);
    try {
      const supporterSnapshot = await getDoc(doc(db, "supporters", user.uid));
      if (!supporterSnapshot.exists() || supporterSnapshot.data().status !== "active") throw new Error("Your payment is still being confirmed by Stripe. Please try again in a moment.");
      const supporter = supporterSnapshot.data();
      await saveTitanWallProfile(user.uid, { visibility: wallVisibility, displayName: wallName, socialUrl }, {
        tierLabel: String(supporter.tierLabel || "Titan Supporter"),
        amountGbp: Number(supporter.amountGbp || 0),
        supportedAt: supporter.lastPaymentAt,
      });
      setWallSaved(true);
      setWallReady(true);
    } catch (wallError) {
      setError(wallError instanceof Error ? wallError.message : "We couldn't update your Wall of Titans entry.");
    } finally {
      setWallSaving(false);
    }
  };

  return (
    <section className="creator-tools-page">
      <div className="creator-tools-card">
        <div className="creator-tools-header"><span>🐍</span><div><h1>Become a Titan</h1><p>Help Tiny Titans grow.</p></div></div>

        {paymentState === "success" && <div className="creator-success" role="status"><strong>Thank you for becoming a Titan! 🐍💚</strong><span>Stripe has confirmed your checkout. Your supporter status is being confirmed by Tiny Titans.</span></div>}
        {paymentState === "cancelled" && <div className="creator-founder-callout" role="status"><strong>Checkout cancelled.</strong><span>No payment was taken. You can choose a tier and try again whenever you like.</span></div>}

        <div className="creator-founder-grid">
          <div><h2>Support Tiny Titans</h2><p>Tiny Titans is built to give keepers a genuinely useful place to track their hoggies, understand genetics and learn better husbandry. If you enjoy the app and want to help keep it growing, you can become a Titan supporter.</p><ul><li>Help cover hosting and development costs</li><li>Support continued genetics research and database work</li><li>Help fund new features and educational content</li><li>Support an independent reptile project built by a keeper</li></ul></div>
          <div className="creator-founder-callout"><strong>Every Titan counts. 🐍</strong><span>Support is completely optional and does not unlock admin access or change your normal account permissions.</span></div>
        </div>

        <div className="creator-form">
          <h2>Choose your Titan level</h2>
          <div className="creator-actions" style={{ flexWrap: "wrap" }}>
            {supportOptions.map((option) => <button key={option.key} type="button" className={selectedTier === option.key ? "creator-primary" : ""} onClick={() => setSelectedTier(option.key)} disabled={loading}>{option.icon} {option.label} · £{option.amount}</button>)}
            <button type="button" className={selectedTier === "custom" ? "creator-primary" : ""} onClick={() => setSelectedTier("custom")} disabled={loading}>💚 Custom amount</button>
          </div>

          {selectedTier === "custom" && <div className="creator-founder-callout">
            <strong>Choose your own support amount</strong>
            <span>Enter whatever you'd like to give. There is no fixed custom tier — you choose the amount yourself.</span>
            <label style={{ display: "grid", gap: "0.45rem", marginTop: "0.75rem" }}>
              <span>Custom support amount (£)</span>
              <input
                type="number"
                min={MIN_CUSTOM_AMOUNT}
                max={MAX_CUSTOM_AMOUNT}
                step="0.01"
                inputMode="decimal"
                value={customAmount}
                onChange={(event) => setCustomAmount(event.target.value)}
                placeholder="Enter any amount"
                disabled={loading}
              />
            </label>
            {!customAmountValid && <span role="alert">Enter an amount from £{MIN_CUSTOM_AMOUNT} to £{MAX_CUSTOM_AMOUNT}.</span>}
          </div>}

          <div className="creator-founder-callout"><strong>Selected support: {selectedAmount > 0 ? `£${selectedAmount.toFixed(2)} · ${selectedLabel}` : "Choose an amount"}</strong><span>You'll be taken to Stripe's secure hosted checkout. Tiny Titans never handles or stores your card details.</span></div>
          {error && <div className="creator-error" role="alert">{error}</div>}
          <div className="creator-actions"><button type="button" onClick={() => navigate(-1)} disabled={loading}>Back</button><button type="button" className="creator-primary" onClick={handleCheckout} disabled={loading || (selectedTier === "custom" && !customAmountValid)}>{loading ? "Opening Stripe…" : `🐍 Support Tiny Titans · ${selectedAmount > 0 ? `£${selectedAmount.toFixed(2)}` : "Choose amount"}`}</button></div>
        </div>

        {paymentState === "success" && <section className="titan-wall-support-choice" aria-labelledby="wall-choice-title">
          <h2 id="wall-choice-title">Take your place on the Wall of Titans 🏆</h2>
          <p className="titan-wall-note">Every confirmed supporter is placed on the wall automatically as an anonymous Titan. You can then choose to be recognised by name and optionally add a social media link.</p>
          {!wallReady ? <div className="creator-founder-callout"><strong>Confirming your Titan support…</strong><span>Stripe confirmation can take a few seconds. Your place on the wall will be created automatically when payment confirmation arrives.</span></div> : <>
            <div className="titan-wall-support-choice__options">
              <button type="button" className={`titan-wall-support-choice__option ${wallVisibility === "anonymous" ? "is-selected" : ""}`} onClick={() => setWallVisibility("anonymous")}><strong>🥷 Anonymous Titan</strong><span>Show my support without my name.</span></button>
              <button type="button" className={`titan-wall-support-choice__option ${wallVisibility === "named" ? "is-selected" : ""}`} onClick={() => setWallVisibility("named")}><strong>🏆 Recognised Titan</strong><span>Show my name and optionally my social link.</span></button>
            </div>
            {wallVisibility === "named" && <div className="titan-wall-support-choice__fields"><label>Name to display<input value={wallName} onChange={(event) => setWallName(event.target.value)} maxLength={80} placeholder="Your name or reptile keeper name" /></label><label>Social media link (optional)<input value={socialUrl} onChange={(event) => setSocialUrl(event.target.value)} inputMode="url" placeholder="https://…" /></label></div>}
            <button type="button" className="creator-primary" onClick={handleWallSave} disabled={wallSaving}>{wallSaving ? "Updating your wall entry…" : "🏆 Save my Wall of Titans choice"}</button>
            {wallSaved && <div className="creator-success" role="status"><strong>Your Wall of Titans entry is saved. 🐍💚</strong><span>You can change this choice whenever you return to Become a Titan.</span></div>}
          </>}
        </section>}

        <div className="creator-actions"><button type="button" onClick={() => navigate("/wall-of-titans")}>🏆 View the Wall of Titans</button></div>
      </div>
    </section>
  );
}
