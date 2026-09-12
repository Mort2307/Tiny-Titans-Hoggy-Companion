import { useEffect, useMemo, useState } from "react";
import { getPaidTierDefinition, PAID_TIER_ORDER, type PaidTierId } from "../config/paidTiers";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, getPaidTierPricing, startPaidSubscriptionCheckout, type LivePaidTierPrice, type PaidAccess } from "../services/paidSubscriptionService";
import PageBackButton from "../components/PageBackButton";
import "../styles/PaidPlans.css";
import { PAID_PROMOTIONS } from "../config/paidPromotions";
import { claimPaidPromotion } from "../services/paidPromotionService";

function toMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && value !== null && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") {
    return Number((value as { toMillis: () => number }).toMillis());
  }
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function trialDaysRemaining(value: unknown, nowMillis: number) {
  const millis = toMillis(value);
  return millis ? Math.max(0, Math.ceil((millis - nowMillis) / 86400000)) : 0;
}

export default function PaidPlans() {
  const { user } = useAuth();
  const [access, setAccess] = useState<PaidAccess | null>(null);
  const [selectedTier, setSelectedTier] = useState<PaidTierId>("titan_pro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [nowMillis, setNowMillis] = useState<number | null>(null);
  const [livePrices, setLivePrices] = useState<Record<PaidTierId, LivePaidTierPrice> | null>(null);
  const [pricingError, setPricingError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getPaidAccess(user.uid)
      .then((next) => {
        if (active) {
          setAccess(next);
          setSelectedTier(next.effectiveTier === "free" ? "titan_pro" : next.effectiveTier);
        }
      })
      .catch((err) => {
        if (active) {
          setAccess(null);
          setError(err instanceof Error ? err.message : "Your current paid access could not be loaded.");
        }
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getPaidTierPricing().then((prices) => {
      if (active) { setLivePrices(prices); setPricingError(""); }
    }).catch((err) => {
      if (active) setPricingError(err instanceof Error ? err.message : "Live Stripe pricing could not be loaded.");
    });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!access?.trial?.expiresAt) { setNowMillis(null); return; }
    setNowMillis(Date.now());
  }, [access?.trial?.expiresAt]);

  const selected = useMemo(() => getPaidTierDefinition(selectedTier), [selectedTier]);
  const selectedLivePrice = livePrices?.[selectedTier];
  const selectedStripeReady = selectedTier === "free" || selectedLivePrice?.configured === true;
  function formatLivePrice(tierId: PaidTierId): string {
    if (tierId === "free") return "Free";
    const live = livePrices?.[tierId];
    if (!live?.configured || live.unitAmount == null || !live.currency) return `Planned ${getPaidTierDefinition(tierId).priceLabel}`;
    const amount = live.unitAmount / 100;
    const currency = live.currency.toUpperCase();
    const formatted = new Intl.NumberFormat("en-GB", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
    const suffix = live.intervalCount === 1 ? ` / ${live.interval || "month"}` : ` / ${live.intervalCount ?? 1} ${live.interval || "month"}`;
    return `${formatted}${suffix}`;
  }

  async function subscribe() {
    if (!user || selectedTier === "free") return;
    setBusy(true);
    setError("");
    try {
      if (!selectedStripeReady) throw new Error("This tier is not connected to an active Stripe recurring price yet.");
      const result = await startPaidSubscriptionCheckout(selectedTier);
      if (!result.url) throw new Error("Stripe did not return a checkout URL.");
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Paid checkout could not be started.");
      setBusy(false);
    }
  }

  if (!user) return null;

  const effective = getPaidTierDefinition(access?.effectiveTier ?? "free");
  const statusLabel = access?.source === "tester"
    ? "Creator tester override"
    : access?.source === "subscription"
      ? "Active subscription"
      : access?.source === "trial"
        ? "Creator trial"
        : "Current plan";
  const trialExpiryMillis = toMillis(access?.trial?.expiresAt);
  const trialDays = trialExpiryMillis && nowMillis != null ? trialDaysRemaining(access?.trial?.expiresAt, nowMillis) : 0;
  const trialEndsLabel = trialExpiryMillis ? new Date(trialExpiryMillis).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "an unavailable date";

  return (
    <main className="paid-plans-page">
      <PageBackButton fallbackPath="/account" label="Back to My Account" />
      <header className="paid-plans-hero">
        <div><span className="paid-kicker">TINY TITANS · PLANS</span><h1>Choose your Tiny Titans tier</h1><p>Every plan is built around a useful reptile keeper experience. Paid tiers add capability; they do not remove the core app just to force an upgrade.</p></div>
        <div className="paid-plan-status"><strong>{effective.name}</strong><span>{statusLabel}</span></div>
      </header>
      {access?.source === "trial" && access.trial && <section className="paid-message"><strong>🎁 You are currently trialling {effective.name}</strong><p>You have about <strong>{trialDays} day{trialDays === 1 ? "" : "s"}</strong> remaining. The trial ends {trialEndsLabel} and does not create a Stripe subscription.</p></section>}
      {error && <section className="paid-message paid-error" role="alert">{error}</section>}
      {Object.values(PAID_PROMOTIONS).filter((promotion) => promotion.enabled && promotion.tier === "titan_pro").map((promotion) => (
        <section className="paid-message" key={promotion.id}><strong>🎁 {promotion.name}</strong><p>{promotion.description}</p><button type="button" className="paid-primary" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { await claimPaidPromotion(promotion.id); window.location.reload(); } catch (err) { setError(err instanceof Error ? err.message : "This promotion could not be claimed."); setBusy(false); } }}>Start free trial</button></section>
      ))}
      <section className="paid-plan-grid" aria-label="Tiny Titans subscription plans">
        {PAID_TIER_ORDER.map((tierId) => { const tier = getPaidTierDefinition(tierId); const current = access?.effectiveTier === tierId; const selected = selectedTier === tierId; return (
          <button key={tierId} type="button" className={`paid-plan-card tier-${tierId} ${selected ? "is-selected" : ""} ${current ? "is-current" : ""}`} onClick={() => setSelectedTier(tierId)} aria-pressed={selected}>
            <span className="paid-kicker">{tier.eyebrow}</span><h2><span className="tier-crest" aria-hidden="true">{tier.crest}</span> {tier.name}</h2><strong className="paid-price">{formatLivePrice(tierId)}</strong><p>{tier.description}</p><small className="paid-audience">{tier.audience}</small><div className="paid-highlights">{tier.highlights.map((item) => <span key={item}>✓ {item}</span>)}</div>{current && <span className="paid-current-badge">CURRENT ACCESS</span>}
          </button>
        ); })}
      </section>
      <section className="paid-plan-detail">
        <div><span className="paid-kicker"><span className="tier-crest" aria-hidden="true">{selected.crest}</span> SELECTED PLAN</span><h2>{selected.name}</h2><p>{selected.description}</p><div className="paid-entitlement-grid">{selected.entitlements.map((item) => <span key={item}>{item.replaceAll("_", " ")}</span>)}</div>{selected.note && <p className="paid-note">{selected.note}</p>}</div>
        <aside>
          <strong>{formatLivePrice(selectedTier)}</strong>
          {selectedTier !== "free" && <small className="paid-live-price-status">{selectedStripeReady ? "Live Stripe recurring price verified" : "Stripe recurring price not connected yet"}</small>}
          {pricingError && <p className="paid-note">Live Stripe pricing could not be verified: {pricingError}</p>}
          {selectedTier === "free" ? <><p>No subscription required. Your existing core app continues to work.</p><button type="button" onClick={() => window.location.assign("/account/billing")}>Go to billing</button></> : <><p>Checkout is hosted securely by Stripe. Tiny Titans does not handle your card details.</p><button type="button" className="paid-primary" onClick={() => void subscribe()} disabled={busy || access?.source === "subscription" || !selectedStripeReady}>{busy ? "Opening secure checkout…" : access?.source === "subscription" ? "Manage existing subscription" : `Start ${selected.name}`}</button>{!selectedStripeReady && <p className="paid-note">Stripe recurring pricing is not configured for this tier yet. Checkout is disabled until the live Stripe price exists.</p>}{access?.source === "subscription" && <button type="button" onClick={() => window.location.assign("/account/billing")}>Manage existing subscription</button>}</>}
        </aside>
      </section>
      <section className="paid-message"><strong>🧪 Want to test the paid experience first?</strong><p>Creator testing can temporarily grant any plan to an account without touching Stripe billing. Test access is stored separately from the real subscription.</p></section>
    </main>
  );
}
