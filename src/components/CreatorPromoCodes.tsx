import { useCallback, useEffect, useState } from "react";
import { createCreatorPromoCode, deactivateCreatorPromoCode, listCreatorPromoCodes, type CreatorPromoCode } from "../services/creatorPromoService";
import TinyTitansIcon from "./TinyTitansIcon";
import ConfirmActionDialog from "./ConfirmActionDialog";
import TinyTitansFeedback from "./TinyTitansFeedback";
import TinyTitansEmptyState from "./TinyTitansEmptyState";
import "../styles/creatorPromoCodes.css";

export default function CreatorPromoCodes() {
  const [codes, setCodes] = useState<CreatorPromoCode[]>([]);
  const [code, setCode] = useState("");
  const [percentOff, setPercentOff] = useState("34");
  const [maxRedemptions, setMaxRedemptions] = useState("25");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<CreatorPromoCode | null>(null);

  const refresh = useCallback(async () => {
    setError("");
    try { setCodes(await listCreatorPromoCodes()); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to load promotion codes."); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const created = await createCreatorPromoCode({
        code: code.trim() || undefined,
        percentOff: Number(percentOff),
        maxRedemptions: maxRedemptions.trim() ? Number(maxRedemptions) : null,
        expiresAt: expiresAt || null,
      });
      setCodes((current) => [created, ...current]); setCode(""); setNotice(`${created.code} is live.`);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to create promotion code."); }
    finally { setBusy(false); }
  }

  async function handleDeactivate() {
    const target = deactivateTarget;
    if (!target) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await deactivateCreatorPromoCode(target.id);
      setCodes((current) => current.filter((item) => item.id !== target.id));
      setNotice(`${target.code} has been deactivated.`);
      setDeactivateTarget(null);
    }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to deactivate promotion code."); }
    finally { setBusy(false); }
  }

  return <section className="creator-promo-panel">
    <div className="creator-promo-header"><div><span className="creator-promo-eyebrow">PRIVATE CREATOR BILLING CONTROL</span><h2><TinyTitansIcon name="billing" size={21} /> Promo Codes</h2><p>Create and manage Stripe promotion codes for TinyTitans Rescue without opening Stripe Dashboard.</p></div><span className="creator-promo-product">TinyTitans Rescue · £59/month</span></div>
    <div className="creator-promo-grid">
      <form className="creator-promo-form" onSubmit={handleCreate}>
        <label>Customer-facing code<input value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. RESCUEWELCOME" autoComplete="off" /></label>
        <label>Discount %<input type="number" min="1" max="100" step="1" value={percentOff} onChange={(event) => setPercentOff(event.target.value)} required /></label>
        <label>Maximum redemptions<input type="number" min="1" step="1" value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value)} placeholder="Unlimited" /></label>
        <label>Expiry date <span className="creator-promo-muted">optional</span><input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
        <button className="creator-promo-primary" disabled={busy} type="submit">{busy ? "Working…" : "Create promo code"}</button>
      </form>
      <div className="creator-promo-live">
        <div className="creator-promo-live-heading"><strong>Active Rescue codes</strong><button type="button" onClick={() => void refresh()} disabled={busy}>Refresh</button></div>
        {codes.length === 0 ? <TinyTitansEmptyState compact icon="billing" title="No active Rescue promotion codes" description="Create a promotion code using the form to make it available for new Rescue subscriptions." /> : codes.map((item) => <article className="creator-promo-code" key={item.id}><div><strong>{item.code}</strong><span>{item.percentOff}% off · {item.timesRedeemed}{item.maxRedemptions ? ` / ${item.maxRedemptions}` : ""} redeemed</span></div><button type="button" onClick={() => setDeactivateTarget(item)} disabled={busy}>Deactivate</button></article>)}
      </div>
    </div>
    {notice && <TinyTitansFeedback kind="success" className="creator-promo-notice">{notice}</TinyTitansFeedback>}
    {error && <TinyTitansFeedback kind="error" className="creator-promo-error">{error}</TinyTitansFeedback>}
    <small className="creator-promo-footnote">Codes created here are restricted to the TinyTitans Rescue product. Deactivating a code stops new redemptions; it does not cancel discounts already attached to active subscriptions.</small>
    <ConfirmActionDialog
      open={Boolean(deactivateTarget)}
      title={deactivateTarget ? `Deactivate ${deactivateTarget.code}?` : "Deactivate promo code?"}
      description="This stops new redemptions. Existing subscriptions and discounts already attached to them are not changed."
      confirmLabel="Deactivate code"
      busy={busy}
      destructive
      onConfirm={() => void handleDeactivate()}
      onCancel={() => { if (!busy) setDeactivateTarget(null); }}
    />
  </section>;
}
