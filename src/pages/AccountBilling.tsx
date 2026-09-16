import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getPaidTierDefinition } from "../config/paidTiers";
import { getPaidAccess, openBillingPortal, type PaidAccess } from "../services/paidSubscriptionService";
import PageBackButton from "../components/PageBackButton";
import PaidTierBadge from "../components/PaidTierBadge";
import "../styles/PaidPlans.css";

function toMillis(value: unknown): number | null { if (!value) return null; if (typeof value === "number") return Number.isFinite(value) ? value : null; if (typeof value === "object" && value !== null && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function") return Number((value as { toMillis: () => number }).toMillis()); const parsed = new Date(String(value)).getTime(); return Number.isFinite(parsed) ? parsed : null; }
function formatPeriodEnd(value: unknown) { const millis = toMillis(value); return millis ? new Date(millis).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not set"; }
function trialDaysRemaining(value: unknown) { const millis = toMillis(value); return millis ? Math.max(0, Math.ceil((millis - Date.now()) / 86400000)) : 0; }
function subscriptionActive(access: PaidAccess | null) { return Boolean(access && access.actualTier !== "free" && (access.subscriptionStatus === "active" || access.subscriptionStatus === "trialing")); }

export default function AccountBilling() {
  const { user, refreshProfile } = useAuth(); const [searchParams] = useSearchParams(); const [access, setAccess] = useState<PaidAccess | null>(null); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const checkoutSuccess = searchParams.get("subscription") === "success";

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getPaidAccess(user.uid).then((next) => { if (active) setAccess(next); }).catch((err) => { if (active) setMessage(err instanceof Error ? err.message : "Your billing state could not be loaded."); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user || !checkoutSuccess) return;
    let active = true;
    let attempts = 0;
    const maxAttempts = 10;
    const poll = async () => {
      try {
        const next = await getPaidAccess(user.uid);
        if (!active) return;
        setAccess(next);
        if (subscriptionActive(next)) {
          await refreshProfile();
          if (!active) return;
          setMessage(`Payment received — ${getPaidTierDefinition(next.actualTier).name} is now active on your account.`);
          window.history.replaceState({}, document.title, "/account/billing");
          return;
        }
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Payment was received, but account activation is still being checked.");
      }
      attempts += 1;
      if (active && attempts < maxAttempts) window.setTimeout(() => void poll(), 1500);
      else if (active) setMessage("Payment was received. Your new workspace is still being activated — refresh shortly if it has not appeared yet.");
    };
    setMessage("Payment received — activating your Tiny Titans workspace…");
    void poll();
    return () => { active = false; };
  }, [user, checkoutSuccess, refreshProfile]);

  async function portal() { if (!user) return; setBusy(true); setMessage(""); try { const result = await openBillingPortal(); if (!result.url) throw new Error("Stripe did not return a billing portal URL."); window.location.assign(result.url); } catch (err) { setMessage(err instanceof Error ? err.message : "The billing portal could not be opened."); setBusy(false); } }
  if (!user) return null;
  const actual = getPaidTierDefinition(access?.actualTier ?? "free"); const effective = getPaidTierDefinition(access?.effectiveTier ?? "free"); const sourceLabel = access?.source === "tester" ? "Testing override active" : access?.source === "subscription" ? "Subscription active" : access?.source === "trial" ? "Creator trial active" : "Free plan";
  return <main className="paid-plans-page"><PageBackButton fallbackPath="/account" label="Back to My Account" /><header className="paid-plans-hero"><div><span className="paid-kicker">ACCOUNT · BILLING</span><h1>Your Tiny Titans subscription</h1><p>Your commercial subscription, Creator trials and test overrides are shown separately so there is no ambiguity about what is actually being billed.</p></div><div className="paid-plan-status"><PaidTierBadge tierId={effective.id} size="md" /><strong>{effective.name}</strong><span>{sourceLabel}</span></div></header>
    {message && <section className="paid-message" role="status">{message}</section>}
    {access?.source === "trial" && access.trial && <section className="paid-message"><strong>🎁 Temporary {effective.name} access</strong><p>This is a Creator-granted trial. You currently have about <strong>{trialDaysRemaining(access.trial.expiresAt)} day{trialDaysRemaining(access.trial.expiresAt) === 1 ? "" : "s"}</strong> remaining, ending {formatPeriodEnd(access.trial.expiresAt)}. No Stripe subscription or charge was created by this trial.</p><button type="button" onClick={() => window.location.assign("/plans")}>View plans →</button></section>}
    <section className="paid-billing-grid"><div className="paid-plan-detail"><div><span className="paid-kicker">REAL BILLING</span><h2><PaidTierBadge tierId={actual.id} size="sm" />{actual.name}</h2><p>{actual.priceLabel}. Subscription status: <strong>{access?.subscriptionStatus ?? "free"}</strong>.</p><p>Next/current period end: <strong>{formatPeriodEnd(access?.currentPeriodEnd)}</strong>.</p></div><aside><button type="button" onClick={() => window.location.assign("/plans")}>Change plan</button>{actual.id !== "free" && <button type="button" className="paid-primary" disabled={busy} onClick={() => void portal()}>{busy ? "Opening Stripe…" : "Manage billing in Stripe"}</button>}</aside></div>
      <div className="paid-plan-detail"><div><span className="paid-kicker">EFFECTIVE ACCESS</span><h2><PaidTierBadge tierId={effective.id} size="sm" />{effective.name}</h2><p>{access?.source === "tester" ? "This account is currently receiving a Creator tester override. The override changes feature access only; it does not change the commercial subscription." : access?.source === "trial" ? "This temporary trial is the plan whose entitlements Tiny Titans is using right now." : "This is the plan whose entitlements are currently used by Tiny Titans."}</p></div><aside><strong>{effective.entitlements.length} capabilities</strong><p>Feature gates resolve against effective access so paid-plan testing and trials exercise the same UI paths real subscribers use.</p></aside></div></section>
    {access?.source === "tester" && access.testerOverride && <section className="paid-message"><strong>🧪 Tester override</strong><p>{effective.name} · {access.testerOverride.mode === "silent" ? "silent" : "visible"} mode · {access.testerOverride.expiresAt ? `expires ${formatPeriodEnd(access.testerOverride.expiresAt)}` : "no expiry"}.</p></section>}
    <section className="paid-message"><strong>Need a different plan?</strong><p>Open the plan comparison to see exactly which capabilities change before starting checkout.</p><button type="button" onClick={() => window.location.assign("/plans")}>View all plans →</button></section>
  </main>;
}
