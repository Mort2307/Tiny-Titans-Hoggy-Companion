import { useEffect, useMemo, useState } from "react";
import { getPaidTierDefinition, PAID_TIER_ORDER, type PaidTierId } from "../config/paidTiers";
import { useAuth } from "../context/useAuth";
import { getPaidAccess, startPaidSubscriptionCheckout, type PaidAccess } from "../services/paidSubscriptionService";
import PageBackButton from "../components/PageBackButton";
import "../styles/PaidPlans.css";

export default function PaidPlans() {
  const { user } = useAuth();
  const [access, setAccess] = useState<PaidAccess | null>(null);
  const [selectedTier, setSelectedTier] = useState<PaidTierId>("titan_pro");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { if (!user) return; let active = true; void getPaidAccess(user.uid).then((next) => { if (active) { setAccess(next); setSelectedTier(next.actualTier === "free" ? "titan_pro" : next.actualTier); } }).catch(() => { if (active) setAccess(null); }); return () => { active = false; }; }, [user]);
  const selected = useMemo(() => getPaidTierDefinition(selectedTier), [selectedTier]);
  async function subscribe() { if (!user || selectedTier === "free") return; setBusy(true); setError(""); try { const result = await startPaidSubscriptionCheckout(selectedTier); if (!result.url) throw new Error("Stripe did not return a checkout URL."); window.location.assign(result.url); } catch (err) { setError(err instanceof Error ? err.message : "Paid checkout could not be started."); setBusy(false); } }
  if (!user) return null;
  return <main className="paid-plans-page"><PageBackButton fallbackPath="/account" label="Back to My Account" /><header className="paid-plans-hero"><div><span className="paid-kicker">TINY TITANS · PLANS</span><h1>Choose your Tiny Titans tier</h1><p>Every plan is built around a useful reptile keeper experience. Paid tiers add capability; they do not remove the core app just to force an upgrade.</p></div><div className="paid-plan-status"><strong>{access ? getPaidTierDefinition(access.effectiveTier).name : "Checking…"}</strong><span>{access?.source === "tester" ? "Creator tester override" : access?.source === "subscription" ? "Active subscription" : "Current plan"}</span></div></header>
    {error && <section className="paid-message paid-error" role="alert">{error}</section>}
    <section className="paid-plan-grid" aria-label="Tiny Titans subscription plans">{PAID_TIER_ORDER.map((tierId) => { const tier = getPaidTierDefinition(tierId); const current = access?.effectiveTier === tierId; const selected = selectedTier === tierId; return <button key={tierId} type="button" className={`paid-plan-card ${selected ? "is-selected" : ""} ${current ? "is-current" : ""}`} onClick={() => setSelectedTier(tierId)} aria-pressed={selected}><span className="paid-kicker">{tier.eyebrow}</span><h2>{tier.name}</h2><strong className="paid-price">{tier.priceGbpMonthly === 0 ? "Free" : `£${tier.priceGbpMonthly.toFixed(2)}`}<small>{tier.priceGbpMonthly === 0 ? "" : " / month"}</small></strong><p>{tier.description}</p><small className="paid-audience">{tier.audience}</small><div className="paid-highlights">{tier.highlights.map((item) => <span key={item}>✓ {item}</span>)}</div>{current && <span className="paid-current-badge">CURRENT ACCESS</span>}</button>; })}</section>
    <section className="paid-plan-detail"><div><span className="paid-kicker">SELECTED PLAN</span><h2>{selected.name}</h2><p>{selected.description}</p><div className="paid-entitlement-grid">{selected.entitlements.map((item) => <span key={item}>{item.replaceAll("_", " ")}</span>)}</div>{selected.note && <p className="paid-note">{selected.note}</p>}</div><aside><strong>{selected.priceLabel}</strong>{selectedTier === "free" ? <><p>No subscription required. Your existing core app continues to work.</p><button type="button" onClick={() => window.location.assign("/account/billing")}>Go to billing</button></> : <><p>Checkout is hosted securely by Stripe. Tiny Titans does not handle your card details.</p><button type="button" className="paid-primary" onClick={() => void subscribe()} disabled={busy}>{busy ? "Opening secure checkout…" : `Start ${selected.name}`}</button><button type="button" onClick={() => window.location.assign("/account/billing")} disabled={busy}>Manage existing subscription</button></>}</aside></section>
    <section className="paid-message"><strong>🧪 Want to test the paid experience first?</strong><p>Creator testing can temporarily grant any plan to an account without touching Stripe billing. Test access is stored separately from the real subscription.</p></section>
  </main>;
}
