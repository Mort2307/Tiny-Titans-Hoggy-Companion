import { useState } from "react";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { AgeBand, LearningLevel, ProfileType } from "../types/Profile";
import app from "../firebase/config";
import "../styles/Personalisation.css";

const db = getFirestore(app);
const profileTypes: Array<[ProfileType, string, string]> = [["keeper", "🐍", "Keeper"], ["learner", "🎓", "Learner"], ["educator", "🧑‍🏫", "Educator"], ["professional", "🔬", "Professional"]];
const levels: Array<[AgeBand, LearningLevel, string]> = [["7-10", "explorer", "Explorer"], ["11-14", "learner", "Learner"], ["15-18", "student", "Student"], ["adult", "adult", "Adult"]];

export default function Personalisation() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [profileType, setProfileType] = useState<ProfileType>(profile?.profileType === "creator" ? "professional" : profile?.profileType ?? "keeper");
  const [ageBand, setAgeBand] = useState<AgeBand>(profile?.ageBand ?? "adult");
  const [learningLevel, setLearningLevel] = useState<LearningLevel>(profile?.learningLevel ?? "adult");
  const [experience, setExperience] = useState(profile?.experienceLevel ?? "beginner");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!user) return;
    setSaving(true); setSaved(false);
    await setDoc(doc(db, "users", user.uid), { profileType, ageBand, learningLevel, experienceLevel: experience, updatedAt: serverTimestamp() }, { merge: true });
    await refreshProfile();
    setSaved(true); setSaving(false);
  }

  return <main className="page-container personalisation-page"><section className="personalisation-shell"><p className="personalisation-eyebrow">Tiny Titans Profile</p><h1>Personalise your experience</h1><p>Change how Tiny Titans explains information without changing your access to the underlying tools.</p><section className="personalisation-card"><h2>How do you use Tiny Titans?</h2><div className="personalisation-grid">{profileTypes.map(([id, icon, title]) => <button key={id} className={profileType === id ? "selected" : ""} onClick={() => setProfileType(id)}>{icon} {title}</button>)}</div></section><section className="personalisation-card"><h2>Learning layer</h2><div className="personalisation-grid">{levels.map(([age, level, title]) => <button key={age} className={ageBand === age ? "selected" : ""} onClick={() => { setAgeBand(age); setLearningLevel(level); }}>{title}<small>{age === "adult" ? "Adult" : `Approx. ages ${age}`}</small></button>)}</div></section><section className="personalisation-card"><h2>Reptile experience</h2><div className="personalisation-grid"><button className={experience === "beginner" ? "selected" : ""} onClick={() => setExperience("beginner")}>🌱 Beginner</button><button className={experience === "intermediate" ? "selected" : ""} onClick={() => setExperience("intermediate")}>🦎 Intermediate</button><button className={experience === "pro" ? "selected" : ""} onClick={() => setExperience("pro")}>🧬 Advanced</button></div></section>{saved && <p className="personalisation-saved">✓ Preferences saved</p>}<button className="personalisation-save" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save preferences"}</button>{profileType === "educator" && <Link className="personalisation-link" to="/educator">Open Educator Centre →</Link>}<button className="personalisation-back" onClick={() => navigate(-1)}>← Back</button></section></main>;
}
