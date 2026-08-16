import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getManagedUsers, setManagedUserRole, type ManagedRole, type ManagedUser } from "../services/adminManagementService";
import "../styles/CreatorTools.css";

export default function AdminCentre() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [workingUid, setWorkingUid] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try { setUsers(await getManagedUsers()); }
    catch (e) { setError(e instanceof Error ? e.message : "Users could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => `${u.displayName} ${u.email} ${u.uid} ${u.role}`.toLowerCase().includes(q));
  }, [users, search]);

  async function changeRole(user: ManagedUser, role: ManagedRole) {
    if (user.role === "creator") { setError("The Creator account cannot be changed from the Admin Centre."); return; }
    if (!window.confirm(`${role === "admin" ? "Grant" : "Remove"} admin access for ${user.displayName || user.email || user.uid}?`)) return;
    setWorkingUid(user.uid); setError(""); setMessage("");
    try {
      await setManagedUserRole(user.uid, role);
      setMessage(`${user.displayName || user.email || "User"} is now ${role}.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "The user role could not be changed."); }
    finally { setWorkingUid(""); }
  }

  return <main className="creator-admin-page">
    <header className="creator-admin-header">
      <div><span className="creator-admin-kicker">TINY TITANS ADMIN</span><h1>🛡️ Admin Centre</h1><p>A focused admin area for everyday moderation and user administration. Advanced Creator controls remain private to the Creator Hub.</p></div>
      <Link className="creator-global-card" to="/">Return to Tiny Titans →</Link>
    </header>
    {message && <div className="creator-success" role="status">{message}</div>}
    {error && <div className="creator-error" role="alert">{error}</div>}
    <section className="creator-admin-section">
      <div className="creator-section-heading"><div><span className="creator-admin-kicker">USER ADMINISTRATION</span><h2>Users & access</h2><p>Admins can manage admin access. The Creator account is protected from role changes here.</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "↻ Loading…" : "↻ Refresh"}</button></div>
      <label className="creator-search"><span>Search users</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email or UID" /></label>
      {loading ? <p className="creator-loading">Loading users…</p> : <div className="creator-list">{filtered.map((user) => <article className="creator-list-card" key={user.uid}><div className="creator-list-top"><div><span className="creator-badge">{user.role}</span>{user.isTester && <span className="creator-badge">tester</span>}<h3>{user.displayName || "Unnamed user"}</h3></div><small>{user.email || user.uid}</small></div><div className="creator-actions">{user.role === "admin" ? <button disabled={workingUid === user.uid} onClick={() => void changeRole(user, "user")}>{workingUid === user.uid ? "Saving…" : "Remove admin"}</button> : user.role === "creator" ? <strong>Creator — protected</strong> : <button disabled={workingUid === user.uid} onClick={() => void changeRole(user, "admin")}>{workingUid === user.uid ? "Saving…" : "Make admin"}</button>}</div></article>)}</div>}
      {!loading && filtered.length === 0 && <p className="creator-muted">No users match that search.</p>}
    </section>
    <section className="creator-admin-section"><h2>What admins can do</h2><div className="creator-global-grid"><div className="creator-global-card"><span>🛡️</span><label>Moderation</label><small>Handle community reports and routine admin tasks.</small></div><div className="creator-global-card"><span>👥</span><label>User access</label><small>Grant or remove admin access where authorised.</small></div><div className="creator-global-card"><span>🤖</span><label>Tester tools</label><small>Use the Tester Centre when your account has tester access.</small></div></div></section>
  </main>;
}
