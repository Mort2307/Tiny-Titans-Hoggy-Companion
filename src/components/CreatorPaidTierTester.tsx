import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "../context/useAuth";
import { db } from "../firebase/config";
import { getPaidAccess, setPaidTesterOverride, type PaidAccess } from "../services/paidTierService";
import { getPaidTierDefinition, PAID_TIER_ORDER, type PaidTierId, type PaidTierTesterMode } from "../config/paidTiers";
import PageBackButton from "./PageBackButton";
import "../styles/CreatorTools.css";
import "../styles/CreatorUsers.css";

type UserRow = { uid: string; displayName: string; profileType?: string; platform?: string; appVersion?: string };

export default function CreatorPaidTierTester() {
  const { user, profile } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]); const [selectedUid, setSelectedUid] = useState(""); const [access, setAccess] = useState<PaidAccess | null>(null);
  const [search, setSearch] = useState(""); const [tier, setTier] = useState<PaidTierId>("titan_pro"); const [mode, setMode] = useState<PaidTierTesterMode>("visible"); const [expiry, setExpiry] = useState("never"); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");

  const loadUsers = useCallback(async () => {
    const snapshot = await getDocs(collection(db, "users"));
    const next = snapshot.docs.map((item) => {
      const data = item.data();
      return { uid: item.id, displayName: String(data.displayName || "Unnamed user"), profileType: typeof data.profileType === "string" ? data.profileType : undefined, platform: typeof data.platform === "string" ? data.platform : undefined, appVersion: typeof data.appVersion === "string" ? data.appVersion : undefined };
    });
    next.sort((a, b) => a.displayName.localeCompare(b.displayName));
    setUsers(next);
    setSelectedUid((current) => current || user?.uid || "");
  }, [user?.uid]);

  async function loadAccess(uid: string) { if (!uid) { setAccess(null); return; } setAccess(await getPaidAccess(uid)); }
  useEffect(() => { if (!user || (profile?.role !== "admin" && profile?.profileType !== "creator")) return; void loadUsers().catch((err) => setError(err instanceof Error ? err.message : "Users could not be loaded.")); }, [profile?.profileType, profile?.role, user, loadUsers]);
  useEffect(() => { if (!selectedUid) return; void loadAccess(selectedUid).catch((err) => setError(err instanceof Error ? err.message : "Paid access could not be loaded.")); }, [selectedUid]);

  const filtered = useMemo(() => { const term = search.trim().toLowerCase(); return term ? users.filter((item) => [item.displayName, item.profileType, item.platform, item.appVersion].some((value) => String(value || "").toLowerCase().includes(term))) : users; }, [search, users]);
  const selectedUser = users.find((item) => item.uid === selectedUid); const selectedDefinition = getPaidTierDefinition(tier); const effectiveDefinition = access ? getPaidTierDefinition(access.effectiveTier) : null;
  function expiryValue(): string | null { if (expiry === "never") return null; const date = new Date(); date.setDate(date.getDate() + Number(expiry)); return date.toISOString(); }
  async function applyOverride(enabled: boolean) { if (!selectedUid) return; setBusy(true); setMessage(""); setError(""); try { await setPaidTesterOverride(selectedUid, enabled, tier, mode, expiryValue()); setAccess(await getPaidAccess(selectedUid)); setMessage(enabled ? `${selectedUser?.displayName || "User"} is now testing ${selectedDefinition.name}.` : `${selectedUser?.displayName || "User"} tester access is OFF. Their normal subscription tier is restored.`); } catch (err) { setError(err instanceof Error ? err.message : "Paid tester access could not be changed."); } finally { setBusy(false); } }

  if (!user || (profile?.role !== "admin" && profile?.profileType !== "creator")) return null;
  return <section className="creator-tools-page"><div className="creator-tools-card"><PageBackButton fallbackPath="/creator/tester" label="Back to Tester Centre" /><div className="creator-tools-header"><span>🧪</span><div><h1>Paid Tier Tester</h1><p>Grant any selected user a real paid-tier experience without changing their subscription or creating any Stripe charge.</p></div></div>
    {message && <div className="creator-success" role="status">{message}</div>}{error && <div className="creator-error" role="alert">{error}</div>}
    <div className="creator-founder-grid"><div><h2>1. Select user</h2><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users…" aria-label="Search users for paid tier testing" /><div className="creator-list" style={{ marginTop: 10, maxHeight: 360, overflow: "auto" }}>{filtered.map((item) => <button key={item.uid} type="button" className="creator-user-row" onClick={() => { setSelectedUid(item.uid); setMessage(""); setError(""); }} aria-pressed={selectedUid === item.uid}><span className="creator-user-avatar">{item.displayName.charAt(0).toUpperCase()}</span><span className="creator-user-main"><strong>{item.displayName}</strong><small>{item.profileType || "user"} · {item.platform || "platform unknown"}</small></span><span aria-hidden="true">{selectedUid === item.uid ? "✓" : "→"}</span></button>)}{filtered.length === 0 && <div className="creator-list-item"><strong>No users found</strong><span>Try another search.</span></div>}</div></div>
      <div><h2>2. Configure test access</h2>{selectedUser ? <div className="creator-list-card" style={{ marginBottom: 12 }}><strong>{selectedUser.displayName}</strong><span>Real tier: {access ? getPaidTierDefinition(access.actualTier).name : "Loading…"}</span><span>Effective tier: {effectiveDefinition ? effectiveDefinition.name : "Loading…"}</span><span>Tester override: {access?.testerOverride ? "ON" : "OFF"}</span></div> : <div className="creator-founder-callout"><strong>Select a user first</strong><span>The selected account will remain on its normal commercial tier unless you explicitly enable tester access.</span></div>}
        <label>Test tier<select value={tier} onChange={(event) => setTier(event.target.value as PaidTierId)} disabled={busy}>{PAID_TIER_ORDER.filter((item) => item !== "free").map((item) => <option key={item} value={item}>{getPaidTierDefinition(item).name} · {getPaidTierDefinition(item).priceLabel}</option>)}</select></label>
        <label>Tester visibility<select value={mode} onChange={(event) => setMode(event.target.value as PaidTierTesterMode)} disabled={busy}><option value="visible">Visible — tell the tester</option><option value="silent">Silent — no tester-facing notice</option></select></label>
        <label>Access duration<select value={expiry} onChange={(event) => setExpiry(event.target.value)} disabled={busy}><option value="never">No expiry</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select></label>
        <div className="creator-founder-callout"><strong>{selectedDefinition.name}</strong><span>{selectedDefinition.description}</span><small>Billing remains unchanged. Tester access is stored separately as a Creator override.</small></div>
        <div className="creator-actions"><button type="button" className="creator-primary" disabled={busy || !selectedUid} onClick={() => void applyOverride(true)}>{busy ? "Applying…" : `🧪 Enable ${selectedDefinition.name}`}</button><button type="button" disabled={busy || !selectedUid} onClick={() => void applyOverride(false)}>Turn tester access OFF</button></div>
      </div></div>
    <div className="creator-user-detail-section"><h3>🔒 Billing safety</h3><p>The tester override never writes a Stripe subscription, payment intent, invoice or customer charge. The user's actual subscription tier is retained separately from the effective testing tier.</p></div>
  </div></section>;
}
