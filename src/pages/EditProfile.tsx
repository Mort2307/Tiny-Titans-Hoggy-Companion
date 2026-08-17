import { useEffect, useState } from "react";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import app from "../firebase/config";

const db = getFirestore(app);

export default function EditProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => setDisplayName(profile?.displayName ?? user?.displayName ?? ""), [profile?.displayName, user?.displayName]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    const name = displayName.trim();
    if (!name) { setMessage("Please enter a display name."); return; }
    setSaving(true); setMessage("");
    try {
      await setDoc(doc(db, "users", user.uid), { displayName: name, updatedAt: serverTimestamp() }, { merge: true });
      await refreshProfile();
      setMessage("Profile saved successfully.");
    } catch (error) {
      console.error("Tiny Titans: unable to save profile", error);
      setMessage("We couldn't save your profile. Please try again.");
    } finally { setSaving(false); }
  }

  return <main className="page-container"><section className="personalisation-shell">
    <p className="personalisation-eyebrow">My Account</p><h1>Edit Profile</h1><p>Update the information shown on your Tiny Titans account.</p>
    <form className="personalisation-card" onSubmit={save}>
      <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" maxLength={60} /></label>
      <div className="account-detail"><span>Email</span><strong>{user?.email ?? "Not available"}</strong></div>
      <p>Learning level, age range and reptile experience can be changed from Personalise Experience.</p>
      {message && <p className="personalisation-saved">{message}</p>}
      <button className="personalisation-save" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
      <button className="personalisation-back" type="button" onClick={() => navigate("/account")}>← Back to My Account</button>
    </form>
  </section></main>;
}
