import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createClassroom, getEducatorClassrooms, type Classroom } from "../services/educatorService";
import type { AgeBand } from "../types/Profile";
import "../styles/EducatorDashboard.css";

const ageOptions: AgeBand[] = ["7-10", "11-14", "15-18"];

export default function EducatorDashboard() {
  const { user, profile } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Biology");
  const [ages, setAges] = useState<AgeBand[]>(["11-14"]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    void getEducatorClassrooms(user.uid).then(setClassrooms).catch((err) => setError(err instanceof Error ? err.message : "Unable to load classrooms."));
  }, [user]);

  function toggleAge(age: AgeBand) {
    setAges((current) => current.includes(age) ? current.filter((item) => item !== age) : [...current, age]);
  }

  async function handleCreate() {
    if (!user || !name.trim() || ages.length === 0) return;
    setCreating(true); setError("");
    try {
      const classroom = await createClassroom(user.uid, { name: name.trim(), subject: subject.trim() || "Biology", studentAgeBands: ages });
      setClassrooms((current) => [classroom, ...current]);
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create classroom.");
    } finally { setCreating(false); }
  }

  return (
    <main className="page-container educator-page">
      <section className="educator-shell">
        <header className="educator-hero">
          <div><p className="educator-eyebrow">Tiny Titans Education</p><h1>Educator Centre</h1><p>Build classroom activities around reptiles, genetics, husbandry and biological data.</p></div>
          <span className="educator-badge">🧑‍🏫 Educator</span>
        </header>

        <section className="educator-stats">
          <article><strong>{classrooms.length}</strong><span>Classrooms</span></article>
          <article><strong>0</strong><span>Activities assigned</span></article>
          <article><strong>0%</strong><span>Completion</span></article>
          <article><strong>{profile?.experienceLevel ?? "—"}</strong><span>Experience layer</span></article>
        </section>

        <section className="educator-grid">
          <article className="educator-card">
            <p className="educator-eyebrow">Start teaching</p><h2>Create a classroom</h2>
            <label>Class name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Year 8 Biology" /></label>
            <label>Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Biology" /></label>
            <fieldset><legend>Student age band</legend><div className="educator-options">{ageOptions.map((age) => <button type="button" key={age} className={ages.includes(age) ? "selected" : ""} onClick={() => toggleAge(age)}>{age}</button>)}</div></fieldset>
            {error && <p className="educator-error" role="alert">{error}</p>}
            <button className="educator-primary" type="button" onClick={() => void handleCreate()} disabled={creating || !name.trim() || ages.length === 0}>{creating ? "Creating…" : "Create Classroom"}</button>
          </article>

          <article className="educator-card"><p className="educator-eyebrow">Ready-made learning</p><h2>Lesson library</h2><div className="lesson-list"><div>🧬 <strong>Genetics & Inheritance</strong><small>Punnett squares and trait prediction</small></div><div>⚖️ <strong>Growth Data</strong><small>Read and interpret animal growth records</small></div><div>🐍 <strong>Reptile Biology</strong><small>Adaptations, ecdysis and behaviour</small></div><div>🌡️ <strong>Environment</strong><small>Temperature, gradients and animal choice</small></div></div></article>
        </section>

        <section className="educator-card"><div className="educator-section-heading"><div><p className="educator-eyebrow">Your classrooms</p><h2>Classroom hub</h2></div><span>{classrooms.length} active</span></div>{classrooms.length === 0 ? <p>Create your first classroom above. Student identities can be kept privacy-first using class codes rather than requiring public student names.</p> : <div className="classroom-list">{classrooms.map((classroom) => <article key={classroom.id}><div><strong>{classroom.name}</strong><small>{classroom.subject} • Ages {classroom.studentAgeBands.join(", ")}</small></div><code>{classroom.classCode}</code></article>)}</div>}</section>

        <p className="educator-note">Educational mode is designed to tailor explanation depth to the class. It does not require the teacher to be a reptile expert.</p>
        <Link className="educator-back" to="/">← Back to Tiny Titans</Link>
      </section>
    </main>
  );
}
