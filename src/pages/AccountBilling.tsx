import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { getPaidTierDefinition } from "../config/paidTiers";
import { getPaidAccess, openBillingPortal, type PaidAccess } from "../services/paidSubscriptionService";
import PageBackButton from "../components/PageBackButton";
import "../styles/PaidPlans.css";

function formatPeriodEnd(value: unknown) { if (!value) return "Not set"; const millis = typeof value === "object" && value !== null && "toMillis" in value && typeof (value as { toMillis?: unknown }).toMillis === "function" ? Number((value as { toMillis: () => number }).toMillis()) : new Date(String(value)).getTime(); return Number.isFinite(millis) ? new Date(millis).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "Not set"; }

export default function AccountBilling() {
  const { user } = useAuth();
  const [access, setAccess] = useState<PaidAccess | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { if (!user) return; let active = true; void getPaidAccess(user.uid).then((next) => { if (active) setAccess(next); }); return () => { active = false; }; }, [user]);
  async function portal() { if (!user) return; setBusy(true); setMessage(""); try { const result = await openBillingPortal(); if (!result.url) throw new Error("Stripe did not return a billing portal URL."); window.location.assign(result.url); } catch (err) { setMessage(err instanceof Error ? err.message : "The billing portal could not be opened."); setBusy(false); } }
  if (!user) return null;
  const actual = getPaidTierDefinition(access?.actualTier ?? "free"); const effective = getPaidTierDefinition(access?.effectiveTier ?? "free");
  return <main className="paid-plans-page"><PageBackButton fallbackPath="/account" label="Back to My Account" /><header className="paid-plans-hero"><div><span className="paid-kicker">ACCOUNT · BILLING</span><h1>Your Tiny Titans subscription</h1><p>Your commercial subscription and any Creator test override are deliberately shown separately.</p></div><div className="paid-plan-status"><strong>{effective.name}</strong><span>{access?.source === "tester" ? "Testing override active" : access?.source === "subscription" ? "Subscription active" : "Free plan"}</span></div></header>
    {message && <section className="paid-message paid-error" role="alert">{message}</section>}
    <section className="paid-billing-grid"><div className="paid-plan-detail"><div><span className="paid-kicker">REAL BILLING</span><h2>{actual.name}</h2><p>{actual.priceLabel}. Subscription status: <strong>{access?.subscriptionStatus ?? "free"}</strong>.</p><p>Next/current period end: <strong>{formatPeriodEnd(access?.currentPeriodEnd)}</strong>.</p></div><aside><button type="button" onClick={() => window.location.assign("/plans")}>Change plan</button>{actual.id !== "free" && <button type="button" className="paid-primary" disabled={busy} onClick={() => void portal()}>{busy ? "Opening Stripe…" : "Manage billing in Stripe"}</button>}</aside></div>
      <div className="paid-plan-detail"><div><span className="paid-kicker">EFFECTIVE ACCESS</span><h2>{effective.name}</h2><p>{access?.source === "tester" ? "This account is currently receiving a Creator tester override. The override changes feature access only; it does not change the commercial subscription." : "This is the plan whose entitlements are currently used by Tiny Titans."}</p></div><aside><strong>{effective.entitlements.length} capabilities</strong><p>Feature gates resolve against effective access so paid-plan testing exercises the same UI paths real subscribers use.</p></aside></div></section>
    {access?.source === "tester" && access.testerOverride && <section className="paid-message"><strong>🧪 Tester override</strong><p>{effective.name} · {access.testerOverride.mode === "silent" ? "silent" : "visible"} mode · {access.testerOverride.expiresAt ? `expires ${formatPeriodEnd(access.testerOverride.expiresAt)}` : "no expiry"}.</p></section>}
    <section className="paid-message"><strong>Need a different plan?</strong><p>Open the plan comparison to see exactly which capabilities change before starting checkout.</p><button type="button" onClick={() => window.location.assign("/plans")}>View all plans →</button></section>
  </main>;
}
