import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import { useAuth } from "../context/useAuth";
import { removeFamilyMember, type FamilyAccount, type FamilyMember } from "../services/familyService";
import { getFamilyManagerData, setFamilyMemberAccessMode } from "../services/familyManagerService";
import type { FamilyAccessMode } from "../services/familyPermissionsService";
import "../styles/family-manager.css";

const modes: Array<{ id: FamilyAccessMode; title: string; icon: string; summary: string; detail: string }> = [
  { id: "full", title: "Full Permission", icon: "✅", summary: "Full editing abilities", detail: "Changes to shared records are applied immediately. Give this only to someone you trust to maintain real keeper records." },
  { id: "review", title: "Moderate Permissions", icon: "🛡️", summary: "Every edit is reviewed", detail: "The member can propose changes, but nothing changes for real until the Family Head approves it." },
  { id: "sandbox", title: "No Permission / Sandbox Mode", icon: "🧪", summary: "No real editing", detail: "Real family records cannot be edited. Use the Family Sandbox for learning and hypothetical changes." },
];

function memberLabel(member: FamilyMember): string {
  return member.role === "child" ? "Child" : member.role === "adult" ? "Adult member" : "Family Head";
}

export default function FamilyManager() {
  const { user } = useAuth();
  const [family, setFamily] = useState<FamilyAccount | null>(null);
  const [selected, setSelected] = useState("");
  const [modesByUid, setModesByUid] = useState<Record<string, FamilyAccessMode>>({});
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = await getFamilyManagerData(user.uid);
      setFamily(data.family);
      setModesByUid(data.modes);
      setSelected((current) => current || data.family?.members.find((item) => item.uid !== user.uid)?.uid || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load Family Manager.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user]);

  async function changeMode(memberUid: string, mode: FamilyAccessMode) {
    if (!user) return;
    setBusyUid(memberUid);
    setError("");
    setMessage("");
    try {
      await setFamilyMemberAccessMode(user.uid, memberUid, mode);
      setModesByUid((current) => ({ ...current, [memberUid]: mode }));
      setMessage("Family permission updated. The new access level is now active for that account.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update family permission.");
    } finally {
      setBusyUid("");
    }
  }

  async function remove(memberUid: string) {
    if (!user) return;
    const member = family?.members.find((item) => item.uid === memberUid);
    if (!member || !window.confirm(`Remove ${member.displayName} from this family? Their personal account will remain intact.`)) return;
    setBusyUid(memberUid);
    setError("");
    setMessage("");
    try {
      await removeFamilyMember(user.uid, memberUid);
      setMessage(`${member.displayName} has been removed from the family.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to remove that family member.");
    } finally {
      setBusyUid("");
    }
  }

  if (!user) return null;

  if (loading) {
    return (
      <main className="page-container family-manager-page">
        <BackHomeButton />
        <section className="family-manager-card">
          <p className="family-manager-kicker">FAMILY MANAGER</p>
          <h1>Loading family controls...</h1>
        </section>
      </main>
    );
  }

  if (!family) {
    return (
      <main className="page-container family-manager-page">
        <BackHomeButton />
        <section className="family-manager-card">
          <p className="family-manager-kicker">FAMILY MANAGER</p>
          <h1>No family connected</h1>
          <p>Create or join a Tiny Titans Family before opening Family Manager.</p>
          <Link className="family-manager-button family-manager-button--primary" to="/account/family">Go to My Family</Link>
        </section>
      </main>
    );
  }

  if (family.ownerUid !== user.uid) {
    return (
      <main className="page-container family-manager-page">
        <BackHomeButton />
        <section className="family-manager-card">
          <p className="family-manager-kicker">FAMILY MANAGER</p>
          <h1>Family Head access required</h1>
          <p>Only the Family Head can change another family member&apos;s permission level.</p>
          <Link className="family-manager-button family-manager-button--primary" to="/account/family">Back to My Family</Link>
        </section>
      </main>
    );
  }

  const members = family.members.filter((member) => member.uid !== user.uid);
  const activeMember = members.find((member) => member.uid === selected) || members[0];
  const activeMode = activeMember ? modesByUid[activeMember.uid] || "review" : "review";

  return (
    <main className="page-container family-manager-page">
      <BackHomeButton />
      <header className="family-manager-hero">
        <div>
          <p className="family-manager-kicker">FAMILY MANAGER</p>
          <h1>Control who can change the real records</h1>
          <p>Every family member can have their own access level. Permissions are controlled by the Family Head and recorded in family history.</p>
        </div>
        <div className="family-manager-hero-actions">
          <Link className="family-manager-button" to="/account/family/review">Family Review</Link>
          <Link className="family-manager-button" to="/account/family/history">Family History</Link>
        </div>
      </header>

      {message && <div className="family-manager-message" role="status">{message}</div>}
      {error && <div className="family-manager-error" role="alert">{error}</div>}

      <section className="family-manager-layout">
        <aside className="family-manager-card family-manager-members">
          <div className="family-manager-section-head">
            <div>
              <p className="family-manager-kicker">MEMBERS</p>
              <h2>{family.members.length} / 4 accounts</h2>
            </div>
            <span>Family Head + members</span>
          </div>

          <div className="family-manager-member-list">
            <button type="button" className="family-manager-member family-manager-member--head">
              <span className="family-manager-avatar">👑</span>
              <span><strong>You</strong><small>Family Head · Full Permission</small></span>
            </button>

            {members.map((member) => (
              <button
                type="button"
                className={`family-manager-member ${selected === member.uid ? "is-active" : ""}`}
                key={member.uid}
                onClick={() => setSelected(member.uid)}
              >
                <span className="family-manager-avatar">{member.role === "child" ? "🧒" : "👤"}</span>
                <span>
                  <strong>{member.displayName}</strong>
                  <small>{memberLabel(member)} · {modesByUid[member.uid] === "full" ? "Full" : modesByUid[member.uid] === "sandbox" ? "Sandbox" : "Moderate"}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="family-manager-card family-manager-permissions">
          {!activeMember ? (
            <div className="family-manager-empty">
              <div>👨‍👩‍👧‍👦</div>
              <h2>No additional members yet</h2>
              <p>Use your Family Code on My Family to add trusted family accounts. Each member can then receive their own permission mode.</p>
              <Link className="family-manager-button family-manager-button--primary" to="/account/family">Open My Family</Link>
            </div>
          ) : (
            <>
              <div className="family-manager-section-head">
                <div>
                  <p className="family-manager-kicker">PERMISSIONS FOR</p>
                  <h2>{activeMember.displayName}</h2>
                  <span className="family-manager-muted">{memberLabel(activeMember)} · {activeMember.email || "Email not supplied"}</span>
                </div>
                <button
                  type="button"
                  className="family-manager-button family-manager-button--danger"
                  disabled={busyUid === activeMember.uid}
                  onClick={() => void remove(activeMember.uid)}
                >
                  Remove from family
                </button>
              </div>

              <div className="family-manager-mode-list">
                {modes.map((mode) => (
                  <label
                    className={`family-manager-mode ${activeMode === mode.id ? "is-selected" : ""}`}
                    key={mode.id}
                  >
                    <input
                      type="checkbox"
                      checked={activeMode === mode.id}
                      disabled={busyUid === activeMember.uid}
                      onChange={() => void changeMode(activeMember.uid, mode.id)}
                    />
                    <span className="family-manager-mode-icon">{mode.icon}</span>
                    <span className="family-manager-mode-copy">
                      <strong>{mode.title}</strong>
                      <b>{mode.summary}</b>
                      <small>{mode.detail}</small>
                    </span>
                    {activeMode === mode.id && <span className="family-manager-current">CURRENT</span>}
                  </label>
                ))}
              </div>

              <div className="family-manager-warning">
                <strong>🛡️ Safety rule</strong>
                <p>Moderate members never silently change a real family record. Sandbox members cannot edit real family data at all.</p>
              </div>

              <div className="family-manager-quick-grid">
                <Link to="/account/family/review" className="family-manager-quick">
                  <strong>📝 Review pending edits</strong>
                  <span>Approve or reject proposed changes.</span>
                </Link>
                <Link to="/account/family/history" className="family-manager-quick">
                  <strong>📚 View family history</strong>
                  <span>See permission and review activity.</span>
                </Link>
                <Link to="/sandbox" className="family-manager-quick">
                  <strong>🧪 Open Sandbox</strong>
                  <span>Learning and hypothetical experiments.</span>
                </Link>
              </div>
            </>
          )}
        </section>
      </section>

      <section className="family-manager-card family-manager-policy">
        <p className="family-manager-kicker">THE THREE MODES</p>
        <div className="family-manager-policy-grid">
          {modes.map((mode) => (
            <div key={mode.id}>
              <span>{mode.icon}</span>
              <strong>{mode.title}</strong>
              <small>{mode.id === "full" ? "Real edits happen immediately." : mode.id === "review" ? "Real edits wait for Family Head approval." : "No real edits. Learning only."}</small>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
