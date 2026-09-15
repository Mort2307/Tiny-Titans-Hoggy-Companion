import { useCallback, useEffect, useState } from "react";
import { createCreatorPromoCode, deactivateCreatorPromoCode, listCreatorPromoCodes, type CreatorPromoCode } from "../services/creatorPromoService";
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

  async function handleDeactivate(id: string, label: string) {
    if (!window.confirm(`Deactivate ${label}? Existing subscriptions are not changed.`)) return;
    setBusy(true); setError(""); setNotice("");
    try { await deactivateCreatorPromoCode(id); setCodes((current) => current.filter((item) => item.id !== id)); setNotice(`${label} has been deactivated.`); }
    catch (err) { setError(err instanceof Error ? err.message : "Unable to deactivate promotion code."); }
    finally { setBusy(false); }
  }

  return <section className="creator-promo-panel">
    <div className="creator-promo-header"><div><span className="creator-promo-eyebrow">PRIVATE CREATOR BILLING CONTROL</span><h2>🎟️ Promo Codes</h2><p>Create and manage Stripe promotion codes for TinyTitans Rescue without opening Stripe Dashboard.</p></div><span className="creator-promo-product">TinyTitans Rescue · £59/month</span></div>
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
        {codes.length === 0 ? <p className="creator-promo-empty">No active Rescue promotion codes found.</p> : codes.map((item) => <article className="creator-promo-code" key={item.id}><div><strong>{item.code}</strong><span>{item.percentOff}% off · {item.timesRedeemed}{item.maxRedemptions ? ` / ${item.maxRedemptions}` : ""} redeemed</span></div><button type="button" onClick={() => void handleDeactivate(item.id, item.code)} disabled={busy}>Deactivate</button></article>)}
      </div>
    </div>
    {notice && <div className="creator-promo-notice">✓ {notice}</div>}
    {error && <div className="creator-promo-error">{error}</div>}
    <small className="creator-promo-footnote">Codes created here are restricted to the TinyTitans Rescue product. Deactivating a code stops new redemptions; it does not cancel discounts already attached to active subscriptions.</small>
  </section>;
}
