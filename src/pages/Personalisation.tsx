import { useState } from "react";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type UserCategory } from "../context/AuthContext";
import type { AgeBand, EducatorTeachingLevel, LearningLevel, ProfileType } from "../types/Profile";
import app from "../firebase/config";
import "../styles/Personalisation.css";

const db = getFirestore(app);
const profileTypes: Array<[ProfileType, string, string]> = [["keeper", "🐍", "Keeper"], ["learner", "🎓", "Learner"], ["educator", "🧑‍🏫", "Educator"], ["professional", "🔬", "Professional"]];
const levels: Array<[AgeBand, LearningLevel, string]> = [["7-10", "explorer", "Explorer"], ["11-14", "learner", "Learner"], ["15-18", "student", "Student"], ["adult", "adult", "Adult"]];
const teachingLevels: Array<[EducatorTeachingLevel, string]> = [["primary", "Primary"], ["secondary", "Secondary"], ["college", "College"], ["university", "University"], ["homeschool", "Homeschool"], ["club", "Club / Group"], ["other", "Other"]];

export default function Personalisation() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [profileType, setProfileType] = useState<ProfileType>(profile?.profileType === "creator" ? "professional" : profile?.profileType ?? "keeper");
  const [category, setCategory] = useState<UserCategory>(profile?.category ?? "adult");
  const [ageBand, setAgeBand] = useState<AgeBand>(profile?.ageBand ?? "adult");
  const [learningLevel, setLearningLevel] = useState<LearningLevel>(profile?.learningLevel ?? "adult");
  const [experience, setExperience] = useState(profile?.experienceLevel ?? "beginner");
  const [teachingLevel, setTeachingLevel] = useState<EducatorTeachingLevel>(profile?.educatorProfile?.teachingLevel ?? "other");
  const [subjects, setSubjects] = useState(profile?.educatorProfile?.subjects?.join(", ") ?? "Biology, Science");
  const [organisationName, setOrganisationName] = useState(profile?.educatorProfile?.organisationName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (!user) return;
    setSaving(true); setSaved(false);
    const data: Record<string, unknown> = { profileType, category, ageBand, learningLevel, experienceLevel: experience, updatedAt: serverTimestamp() };
    if (profileType === "educator") data.educatorProfile = { teachingLevel, subjects: subjects.split(",").map((item) => item.trim()).filter(Boolean), studentAgeBands: profile?.educatorProfile?.studentAgeBands?.length ? profile.educatorProfile.studentAgeBands : ["11-14"], reptileExperience: experience === "pro" ? "advanced" : experience, organisationName: organisationName.trim() || undefined, verified: profile?.educatorProfile?.verified === true };
    await setDoc(doc(db, "users", user.uid), data, { merge: true });
    await refreshProfile();
    setSaved(true); setSaving(false);
  }

  return <main className="page-container personalisation-page"><section className="personalisation-shell"><p className="personalisation-eyebrow">Tiny Titans Profile</p><h1>Personalise your experience</h1><p>These settings change language, examples and educational depth. They do not remove features or change the scientific facts.</p>
    <section className="personalisation-card"><h2>How do you use Tiny Titans?</h2><div className="personalisation-grid">{profileTypes.map(([id, icon, title]) => <button key={id} className={profileType === id ? "selected" : ""} onClick={() => setProfileType(id)}>{icon} {title}</button>)}</div></section>
    <section className="personalisation-card"><h2>Who is this account for?</h2><div className="personalisation-grid"><button className={category === "adult" ? "selected" : ""} onClick={() => setCategory("adult")}>🧑 Adult</button><button className={category === "child" ? "selected" : ""} onClick={() => setCategory("child")}>👦 Child</button></div><p>Child mode uses simpler language and stronger learning scaffolding; it does not change the underlying science.</p></section>
    <section className="personalisation-card"><h2>Learning layer</h2><div className="personalisation-grid">{levels.map(([age, level, title]) => <button key={age} className={ageBand === age ? "selected" : ""} onClick={() => { setAgeBand(age); setLearningLevel(level); }}>{title}<small>{age === "adult" ? "Adult" : `Approx. ages ${age}`}</small></button>)}</div></section>
    <section className="personalisation-card"><h2>Reptile experience</h2><div className="personalisation-grid"><button className={experience === "beginner" ? "selected" : ""} onClick={() => setExperience("beginner")}>🌱 Beginner</button><button className={experience === "intermediate" ? "selected" : ""} onClick={() => setExperience("intermediate")}>🦎 Intermediate</button><button className={experience === "pro" ? "selected" : ""} onClick={() => setExperience("pro")}>🧬 Advanced</button></div></section>
    {profileType === "educator" && <section className="personalisation-card"><h2>🧑‍🏫 Educator settings</h2><label>Teaching environment<select value={teachingLevel} onChange={(event) => setTeachingLevel(event.target.value as EducatorTeachingLevel)}>{teachingLevels.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label><label>Subjects<input value={subjects} onChange={(event) => setSubjects(event.target.value)} /></label><label>Organisation (optional)<input value={organisationName} onChange={(event) => setOrganisationName(event.target.value)} /></label></section>}
    {saved && <p className="personalisation-saved">✓ Preferences saved</p>}<button className="personalisation-save" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save preferences"}</button>{profileType === "educator" && <Link className="personalisation-link" to="/educator">Open Educator Centre →</Link>}<button className="personalisation-back" onClick={() => navigate(-1)}>← Back</button>
  </section></main>;
}
