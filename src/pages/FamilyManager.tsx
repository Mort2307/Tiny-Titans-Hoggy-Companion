import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { useFamilyManager } from "../hooks/useFamilyManager";
import "../styles/family-manager.css";

export default function FamilyManager() {
  const {
    user, family, selected, setSelected, modesByUid, loading, busyUid, message, error,
    changeMode, remove, members, activeMember, activeMode, modes, memberLabel,
  } = useFamilyManager();

  if (!user) return null;
  if (loading) return (
    <main className="page-container family-manager-page">
      <BackHomeButton />
      <section className="family-manager-card"><p className="family-manager-kicker">FAMILY MANAGER</p><h1>Loading family controls...</h1></section>
    </main>
  );
  if (!family) return (
    <main className="page-container family-manager-page">
      <BackHomeButton />
      <section className="family-manager-card"><p className="family-manager-kicker">FAMILY MANAGER</p><h1>No family connected</h1><p>Create or join a Tiny Titans Family before opening Family Manager.</p><Link className="family-manager-button family-manager-button--primary" to="/account/family"><TinyTitansIcon name="add" size={17} /> Go to My Family</Link></section>
    </main>
  );
  if (family.ownerUid !== user.uid) return (
    <main className="page-container family-manager-page">
      <BackHomeButton />
      <section className="family-manager-card"><p className="family-manager-kicker">FAMILY MANAGER</p><h1>Family Head access required</h1><p>Only the Family Head can change another family member&apos;s permission level.</p><Link className="family-manager-button family-manager-button--primary" to="/account/family"><TinyTitansIcon name="back" size={17} /> Back to My Family</Link></section>
    </main>
  );

  return (
    <main className="page-container family-manager-page">
      <BackHomeButton />
      <header className="family-manager-hero">
        <div><p className="family-manager-kicker">FAMILY MANAGER</p><h1>Control who can change the real records</h1><p>Every family member can have their own access level. Permissions are controlled by the Family Head and recorded in family history.</p></div>
        <div className="family-manager-hero-actions"><Link className="family-manager-button" to="/account/family/review"><TinyTitansIcon name="search" size={17} /> Family Review</Link><Link className="family-manager-button" to="/account/family/history"><TinyTitansIcon name="timeline" size={17} /> Family History</Link></div>
      </header>

      {message && <div className="family-manager-message" role="status"><TinyTitansIcon name="check" size={16} /> {message}</div>}
      {error && <div className="family-manager-error" role="alert"><TinyTitansIcon name="warning" size={16} /> {error}</div>}

      <section className="family-manager-layout">
        <aside className="family-manager-card family-manager-members">
          <div className="family-manager-section-head"><div><p className="family-manager-kicker">MEMBERS</p><h2>{family.members.length} / 4 accounts</h2></div><span>Family Head + members</span></div>
          <div className="family-manager-member-list">
            <button type="button" className="family-manager-member family-manager-member--head"><span className="family-manager-avatar"><TinyTitansIcon name="family" size={22} /></span><span><strong>You</strong><small>Family Head · Full Permission</small></span></button>
            {members.map((member) => <button type="button" className={`family-manager-member ${selected === member.uid ? "is-active" : ""}`} key={member.uid} onClick={() => setSelected(member.uid)}><span className="family-manager-avatar"><TinyTitansIcon name={member.role === "child" ? "family" : "account"} size={22} /></span><span><strong>{member.displayName}</strong><small>{memberLabel(member)} · {modesByUid[member.uid] === "full" ? "Full" : modesByUid[member.uid] === "sandbox" ? "Sandbox" : "Moderate"}</small></span></button>)}
          </div>
        </aside>

        <section className="family-manager-card family-manager-permissions">
          {!activeMember ? (
            <div className="family-manager-empty"><div><TinyTitansIcon name="family" size={34} /></div><h2>No additional members yet</h2><p>Use your Family Code on My Family to add trusted family accounts. Each member can then receive their own permission mode.</p><Link className="family-manager-button family-manager-button--primary" to="/account/family"><TinyTitansIcon name="add" size={17} /> Open My Family</Link></div>
          ) : (
            <>
              <div className="family-manager-section-head"><div><p className="family-manager-kicker">PERMISSIONS FOR</p><h2>{activeMember.displayName}</h2><span className="family-manager-muted">{memberLabel(activeMember)} · {activeMember.email || "Email not supplied"}</span></div><button type="button" className="family-manager-button family-manager-button--danger" disabled={busyUid === activeMember.uid} onClick={() => void remove(activeMember.uid)}><TinyTitansIcon name="delete" size={17} /> Remove from family</button></div>
              <div className="family-manager-mode-list">{modes.map((mode) => <label className={`family-manager-mode ${activeMode === mode.id ? "is-selected" : ""}`} key={mode.id}><input type="checkbox" checked={activeMode === mode.id} disabled={busyUid === activeMember.uid} onChange={() => void changeMode(activeMember.uid, mode.id)} /><span className="family-manager-mode-icon"><TinyTitansIcon name={mode.icon} size={23} /></span><span className="family-manager-mode-copy"><strong>{mode.title}</strong><b>{mode.summary}</b><small>{mode.detail}</small></span>{activeMode === mode.id && <span className="family-manager-current"><TinyTitansIcon name="check" size={14} /> CURRENT</span>}</label>)}</div>
              <div className="family-manager-warning"><strong><TinyTitansIcon name="health" size={17} /> Safety rule</strong><p>Moderate members never silently change a real family record. Sandbox members cannot edit real family data at all.</p></div>
              <div className="family-manager-quick-grid"><Link to="/account/family/review" className="family-manager-quick"><strong><TinyTitansIcon name="search" size={17} /> Review pending edits</strong><span>Approve or reject proposed changes.</span></Link><Link to="/account/family/history" className="family-manager-quick"><strong><TinyTitansIcon name="timeline" size={17} /> View family history</strong><span>See permission and review activity.</span></Link><Link to="/sandbox" className="family-manager-quick"><strong><TinyTitansIcon name="testing" size={17} /> Open Sandbox</strong><span>Learning and hypothetical experiments.</span></Link></div>
            </>
          )}
        </section>
      </section>

      <section className="family-manager-card family-manager-policy"><p className="family-manager-kicker">THE THREE MODES</p><div className="family-manager-policy-grid">{modes.map((mode) => <div key={mode.id}><span><TinyTitansIcon name={mode.icon} size={24} /></span><strong>{mode.title}</strong><small>{mode.id === "full" ? "Real edits happen immediately." : mode.id === "review" ? "Real edits wait for Family Head approval." : "No real edits. Learning only."}</small></div>)}</div></section>
    </main>
  );
}
