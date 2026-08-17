import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { createClassroom, getEducatorClassrooms, type Classroom } from "../services/educatorService";
import type { AgeBand } from "../types/Profile";
import "../styles/EducatorDashboard.css";

const ageOptions: AgeBand[] = ["7-10", "11-14", "15-18"];
const ageLabels: Record<AgeBand, string> = { "7-10": "Explorer", "11-14": "Learner", "15-18": "Student", adult: "Adult" };
const previews: Record<AgeBand, { title: string; text: string; question: string }> = {
  "7-10": { title: "Explorer explanation", text: "A gene is like a set of instructions that can help decide a trait. A baby snake gets one copy of each gene from each parent.", question: "What do you think could happen if the two copies are different?" },
  "11-14": { title: "Learner explanation", text: "Genes are sections of DNA that contribute to traits. Offspring inherit genetic information from both parents, so different combinations can occur.", question: "Why can siblings look different even when they have the same parents?" },
  "15-18": { title: "Student explanation", text: "Alleles are alternative forms of a gene. During reproduction, offspring receive genetic information from both parents, producing different genotype combinations and therefore different possible phenotypes.", question: "How would a Punnett square help estimate possible genotype frequencies?" },
  adult: { title: "Adult explanation", text: "Inheritance is probabilistic at the offspring level. Genotype frequencies can be estimated from parental genotypes, while phenotype expression depends on the specific genetic architecture of the trait.", question: "Which assumptions would make a simple Mendelian probability model inappropriate?" },
};

export default function EducatorDashboard() {
  const { user, profile } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Biology");
  const [ages, setAges] = useState<AgeBand[]>(profile?.educatorProfile?.studentAgeBands?.filter((age) => age !== "adult") ?? ["11-14"]);
  const [previewAge, setPreviewAge] = useState<AgeBand>(ages[0] ?? "11-14");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const preview = previews[previewAge];

  useEffect(() => { if (!user) return; void getEducatorClassrooms(user.uid).then(setClassrooms).catch((err) => setError(err instanceof Error ? err.message : "Unable to load classrooms.")); }, [user]);
  useEffect(() => { if (ages.length && !ages.includes(previewAge)) setPreviewAge(ages[0]); }, [ages, previewAge]);
  const teachingLabel = useMemo(() => profile?.educatorProfile?.teachingLevel ? profile.educatorProfile.teachingLevel.charAt(0).toUpperCase() + profile.educatorProfile.teachingLevel.slice(1) : "Educator", [profile]);
  function toggleAge(age: AgeBand) { setAges((current) => current.includes(age) ? current.filter((item) => item !== age) : [...current, age]); }
  async function handleCreate() { if (!user || !name.trim() || ages.length === 0) return; setCreating(true); setError(""); try { const classroom = await createClassroom(user.uid, { name: name.trim(), subject: subject.trim() || "Biology", studentAgeBands: ages }); setClassrooms((current) => [classroom, ...current]); setName(""); } catch (err) { setError(err instanceof Error ? err.message : "Unable to create classroom."); } finally { setCreating(false); } }

  return <main className="page-container educator-page"><section className="educator-shell"><header className="educator-hero"><div><p className="educator-eyebrow">Tiny Titans Education</p><h1>Educator Centre</h1><p>Build classroom activities around reptiles, genetics, husbandry and biological data.</p></div><span className="educator-badge">🧑‍🏫 {teachingLabel}</span></header>
    <section className="educator-stats"><article><strong>{classrooms.length}</strong><span>Classrooms</span></article><article><strong>0</strong><span>Activities assigned</span></article><article><strong>0%</strong><span>Completion</span></article><article><strong>{profile?.experienceLevel ?? "—"}</strong><span>Teacher experience</span></article></section>
    <section className="educator-grid"><article className="educator-card"><p className="educator-eyebrow">Start teaching</p><h2>Create a classroom</h2><label>Class name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Year 8 Biology" /></label><label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Biology" /></label><fieldset><legend>Student age band</legend><div className="educator-options">{ageOptions.map((age) => <button type="button" key={age} className={ages.includes(age) ? "selected" : ""} onClick={() => toggleAge(age)}>{ageLabels[age]} · {age}</button>)}</div></fieldset>{error && <p className="educator-error" role="alert">{error}</p>}<button className="educator-primary" type="button" onClick={() => void handleCreate()} disabled={creating || !name.trim() || ages.length === 0}>{creating ? "Creating…" : "Create Classroom"}</button></article>
      <article className="educator-card"><p className="educator-eyebrow">Lesson library</p><h2>Ready-made learning</h2><div className="lesson-list"><div>🧬 <strong>Genetics & Inheritance</strong><small>Punnett squares and trait probability</small></div><div>⚖️ <strong>Growth Data</strong><small>Read and interpret animal growth records</small></div><div>🐍 <strong>Reptile Biology</strong><small>Adaptations, ecdysis and behaviour</small></div><div>🌡️ <strong>Environment</strong><small>Temperature, gradients and animal choice</small></div></div></article></section>
    <section className="educator-card"><div className="educator-section-heading"><div><p className="educator-eyebrow">Adaptive teaching preview</p><h2>Same science, different explanation</h2></div><span>{ageLabels[previewAge]}</span></div><div className="educator-options">{ages.map((age) => <button type="button" key={age} className={previewAge === age ? "selected" : ""} onClick={() => setPreviewAge(age)}>{ageLabels[age]}</button>)}</div><div className="educator-preview"><p className="educator-eyebrow">{preview.title}</p><p>{preview.text}</p><strong>Discussion question</strong><p>{preview.question}</p></div></section>
    <section className="educator-card"><div className="educator-section-heading"><div><p className="educator-eyebrow">Your classrooms</p><h2>Classroom hub</h2></div><span>{classrooms.length} active</span></div>{classrooms.length === 0 ? <p>Create your first classroom above. Student identities can be kept privacy-first using class codes rather than requiring public student names.</p> : <div className="classroom-list">{classrooms.map((classroom) => <article key={classroom.id}><div><strong>{classroom.name}</strong><small>{classroom.subject} • Ages {classroom.studentAgeBands.join(", ")}</small></div><code>{classroom.classCode}</code></article>)}</div>}</section>
    <p className="educator-note">Educational mode tailors vocabulary and scaffolding to the learner. It never changes the underlying scientific facts or safety information.</p><Link className="educator-back" to="/">← Back to Tiny Titans</Link>
  </section></main>;
}
