import { useEffect, useState } from "react";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, type UserCategory } from "../context/useAuth";
import { getUserSnakes } from "../services/snakeService";
import type { Snake } from "../types/Snake";
import type { AgeBand, EducatorTeachingLevel, LearningLevel, ProfileType } from "../types/Profile";
import { TITAN_AT_A_GLANCE_OPTIONS, TITAN_WEEKLY_METRIC_OPTIONS, WEEK_START_OPTIONS, MAX_SLICES, MIN_SLICES, MAX_WEEKLY_METRICS, MIN_WEEKLY_METRICS, useEasyNav, type TitanAtAGlanceSliceId, type TitanWeeklyMetricId, type WeekStartDay } from "../context/EasyNavContext";
import "../styles/Personalisation.css";

const db = getFirestore();
const profileTypes: Array<[ProfileType, string, string]> = [["keeper", "🐍", "Keeper"], ["learner", "🎓", "Learner"], ["educator", "🧑‍🏫", "Educator"], ["professional", "🔬", "Professional"]];
const levels: Array<[AgeBand, LearningLevel, string]> = [["7-10", "explorer", "Explorer"], ["11-14", "learner", "Learner"], ["15-18", "student", "Student"], ["adult", "adult", "Adult"]];
const teachingLevels: Array<[EducatorTeachingLevel, string]> = [["primary", "Primary"], ["secondary", "Secondary"], ["college", "College"], ["university", "University"], ["homeschool", "Homeschool"], ["club", "Club / Group"], ["other", "Other"]];

export default function Personalisation() {
  const { user, profile, refreshProfile } = useAuth();
  const { mode, slices, setMode, setSlices, resetSlices, weekStartDay, weeklyMetrics, setWeekStartDay, setWeeklyMetrics, resetWeeklyPreferences, getSlicesForSnake, setSnakeSlices, resetSnakeSlices } = useEasyNav();
  const navigate = useNavigate();
  const [profileType, setProfileType] = useState<ProfileType>(profile?.profileType === "creator" ? "professional" : profile?.profileType ?? "keeper");
  const [category, setCategory] = useState<UserCategory>(profile?.category ?? "adult");
  const [ageBand, setAgeBand] = useState<AgeBand>(profile?.ageBand ?? "adult");
  const [learningLevel, setLearningLevel] = useState<LearningLevel>(profile?.learningLevel ?? "adult");
  const [experience, setExperience] = useState(profile?.experienceLevel ?? "beginner");
  const [teachingLevel, setTeachingLevel] = useState<EducatorTeachingLevel>(profile?.educatorProfile?.teachingLevel ?? "other");
  const [subjects, setSubjects] = useState(profile?.educatorProfile?.subjects?.join(", ") ?? "Biology, Science");
  const [organisationName, setOrganisationName] = useState(profile?.educatorProfile?.organisationName ?? "");
  const [snakes, setSnakes] = useState<Snake[]>([]);
  const [selectedPieSnakeId, setSelectedPieSnakeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user || mode !== "easy") return undefined;
    let active = true;
    void getUserSnakes(user.uid).then((records) => {
      if (active) setSnakes(records.filter((snake) => snake.status !== "Deceased"));
    }).catch(() => {
      if (active) setSnakes([]);
    });
    return () => { active = false; };
  }, [user, mode]);

  async function save() {
    if (!user) return;
    setSaving(true); setSaved(false);
    const data: Record<string, unknown> = { profileType, category, ageBand, learningLevel, experienceLevel: experience, updatedAt: serverTimestamp() };
    if (profileType === "educator") data.educatorProfile = { teachingLevel, subjects: subjects.split(",").map((item) => item.trim()).filter(Boolean), studentAgeBands: profile?.educatorProfile?.studentAgeBands?.length ? profile.educatorProfile.studentAgeBands : ["11-14"], reptileExperience: experience === "pro" ? "advanced" : experience, organisationName: organisationName.trim() || undefined, verified: profile?.educatorProfile?.verified === true };
    await setDoc(doc(db, "users", user.uid), data, { merge: true });
    await refreshProfile();
    setSaved(true); setSaving(false);
  }

  async function chooseMode(nextMode: "standard" | "easy") { await setMode(nextMode); }

  async function toggleSlice(id: TitanAtAGlanceSliceId) {
    if (slices.includes(id)) {
      if (slices.length <= MIN_SLICES) return;
      await setSlices(slices.filter((slice) => slice !== id));
      return;
    }
    if (slices.length >= MAX_SLICES) return;
    await setSlices([...slices, id]);
  }

  async function moveSlice(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= slices.length) return;
    const next = [...slices];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    await setSlices(next);
  }

  const selectedPieSlices = selectedPieSnakeId ? getSlicesForSnake(selectedPieSnakeId) : slices;

  async function toggleTitanSlice(id: TitanAtAGlanceSliceId) {
    if (!selectedPieSnakeId) return;
    if (selectedPieSlices.includes(id)) {
      if (selectedPieSlices.length <= MIN_SLICES) return;
      await setSnakeSlices(selectedPieSnakeId, selectedPieSlices.filter((slice) => slice !== id));
      return;
    }
    if (selectedPieSlices.length >= MAX_SLICES) return;
    await setSnakeSlices(selectedPieSnakeId, [...selectedPieSlices, id]);
  }

  async function moveTitanSlice(index: number, direction: -1 | 1) {
    if (!selectedPieSnakeId) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selectedPieSlices.length) return;
    const next = [...selectedPieSlices];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    await setSnakeSlices(selectedPieSnakeId, next);
  }

  async function resetTitanPie() {
    if (selectedPieSnakeId) await resetSnakeSlices(selectedPieSnakeId);
  }

  async function toggleWeeklyMetric(id: TitanWeeklyMetricId) {
    if (weeklyMetrics.includes(id)) {
      if (weeklyMetrics.length <= MIN_WEEKLY_METRICS) return;
      await setWeeklyMetrics(weeklyMetrics.filter((metric) => metric !== id));
      return;
    }
    if (weeklyMetrics.length >= MAX_WEEKLY_METRICS) return;
    await setWeeklyMetrics([...weeklyMetrics, id]);
  }

  async function chooseWeekStart(value: string) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 6) await setWeekStartDay(parsed as WeekStartDay);
  }

  return <main className="page-container personalisation-page"><section className="personalisation-shell"><p className="personalisation-eyebrow">Tiny Titans Profile</p><h1>Personalise your experience</h1><p>These settings change language, examples and educational depth. They do not remove features or change the scientific facts.</p>
    <section className="personalisation-card tt-nav-mode-card"><h2>🐍 Navigation Mode</h2><p>Choose how Tiny Titans feels to use. <strong>Easy Nav stays active until you change it.</strong> Your intelligence, records, genetics and every underlying feature continue to work normally.</p><div className="personalisation-grid"><button className={mode === "standard" ? "selected" : ""} onClick={() => void chooseMode("standard")}>🧭 Standard<small>Full navigation</small></button><button className={mode === "easy" ? "selected" : ""} onClick={() => void chooseMode("easy")}>🥧 Easy Nav<small>At-a-Glance keeper view</small></button></div></section>
    {mode === "easy" && <>
      <section className="personalisation-card tt-pie-settings"><div className="tt-pie-settings-heading"><div><h2>🥧 Your Titan Pie</h2><p>Choose {MIN_SLICES}–{MAX_SLICES} things you want at your fingertips. Each slice is a live shortcut and can open the relevant tool in one tap.</p></div><span>{slices.length}/{MAX_SLICES}</span></div><div className="tt-selected-slices">{slices.map((id, index) => { const option = TITAN_AT_A_GLANCE_OPTIONS.find((item) => item.id === id)!; return <div key={id} className="tt-selected-slice"><span>{option.icon}</span><strong>{option.label}</strong><div><button aria-label={`Move ${option.label} left`} onClick={() => void moveSlice(index, -1)} disabled={index === 0}>←</button><button aria-label={`Move ${option.label} right`} onClick={() => void moveSlice(index, 1)} disabled={index === slices.length - 1}>→</button><button aria-label={`Remove ${option.label}`} onClick={() => void toggleSlice(id)} disabled={slices.length <= MIN_SLICES}>×</button></div></div>; })}</div><div className="tt-pie-options"><h3>Add a slice</h3><div className="tt-pie-option-grid">{TITAN_AT_A_GLANCE_OPTIONS.filter((option) => !slices.includes(option.id)).map((option) => <button key={option.id} className="tt-pie-option" onClick={() => void toggleSlice(option.id)} disabled={slices.length >= MAX_SLICES}><span>{option.icon}</span><strong>{option.label}</strong><small>{option.description}</small></button>)}</div></div><button className="tt-pie-reset" onClick={() => void resetSlices()}>Reset to essentials</button></section>
      <section className="personalisation-card tt-titan-pie-settings"><div className="tt-pie-settings-heading"><div><h2>🐍 Per-Titan Pie</h2><p>Give individual snakes their own quick actions. Each Titan can have a different Pie, while uncustomised Titans use your main Pie.</p></div></div><label className="tt-week-start-label" htmlFor="tt-pie-titan">Customise Pie for<select id="tt-pie-titan" value={selectedPieSnakeId} onChange={(event) => setSelectedPieSnakeId(event.target.value)}><option value="">Choose a Titan</option>{snakes.map((snake) => <option key={snake.id} value={snake.id}>{snake.name}</option>)}</select></label>{selectedPieSnakeId && <><div className="tt-selected-slices">{selectedPieSlices.map((id, index) => { const option = TITAN_AT_A_GLANCE_OPTIONS.find((item) => item.id === id)!; return <div key={id} className="tt-selected-slice"><span>{option.icon}</span><strong>{option.label}</strong><div><button aria-label={`Move ${option.label} left`} onClick={() => void moveTitanSlice(index, -1)} disabled={index === 0}>←</button><button aria-label={`Move ${option.label} right`} onClick={() => void moveTitanSlice(index, 1)} disabled={index === selectedPieSlices.length - 1}>→</button><button aria-label={`Remove ${option.label}`} onClick={() => void toggleTitanSlice(id)} disabled={selectedPieSlices.length <= MIN_SLICES}>×</button></div></div>; })}</div><div className="tt-pie-options"><h3>Add a Titan-specific slice</h3><div className="tt-pie-option-grid">{TITAN_AT_A_GLANCE_OPTIONS.filter((option) => !selectedPieSlices.includes(option.id)).map((option) => <button key={option.id} className="tt-pie-option" onClick={() => void toggleTitanSlice(option.id)} disabled={selectedPieSlices.length >= MAX_SLICES}><span>{option.icon}</span><strong>{option.label}</strong><small>{option.description}</small></button>)}</div></div><button className="tt-pie-reset" onClick={() => void resetTitanPie()}>Use my main Pie for this Titan</button></>}</section>
      <section id="this-week" className="personalisation-card tt-week-settings"><div className="tt-week-settings-heading"><div><h2>📅 This Week</h2><p>Make the week match your real keeper routine. Your settings are remembered for the next week and all weekly totals come from existing records.</p></div></div><label className="tt-week-start-label" htmlFor="tt-week-start">Week starts on<select id="tt-week-start" value={String(weekStartDay)} onChange={(event) => void chooseWeekStart(event.target.value)}>{WEEK_START_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><div className="tt-week-metric-heading"><h3>Track in This Week</h3><span>{weeklyMetrics.length}/{MAX_WEEKLY_METRICS}</span></div><p className="tt-week-limit">Choose {MIN_WEEKLY_METRICS}–{MAX_WEEKLY_METRICS} weekly measures.</p><div className="tt-week-metric-grid">{TITAN_WEEKLY_METRIC_OPTIONS.map((option) => <button key={option.id} className={`tt-week-metric-option${weeklyMetrics.includes(option.id) ? " selected" : ""}`} onClick={() => void toggleWeeklyMetric(option.id)} disabled={!weeklyMetrics.includes(option.id) && weeklyMetrics.length >= MAX_WEEKLY_METRICS}><span>{option.icon}</span><strong>{option.label}</strong><small>{option.description}</small></button>)}</div><button className="tt-pie-reset" onClick={() => void resetWeeklyPreferences()}>Reset weekly preferences</button></section>
    </>}
    <section className="personalisation-card"><h2>How do you use Tiny Titans?</h2><div className="personalisation-grid">{profileTypes.map(([id, icon, title]) => <button key={id} className={profileType === id ? "selected" : ""} onClick={() => setProfileType(id)}>{icon} {title}</button>)}</div></section>
    <section className="personalisation-card"><h2>Who is this account for?</h2><div className="personalisation-grid"><button className={category === "adult" ? "selected" : ""} onClick={() => setCategory("adult")}>🧑 Adult</button><button className={category === "child" ? "selected" : ""} onClick={() => setCategory("child")}>👦 Child</button></div><p>Child mode uses simpler language and stronger learning scaffolding; it does not change the underlying science.</p></section>
    <section className="personalisation-card"><h2>Learning layer</h2><div className="personalisation-grid">{levels.map(([age, level, title]) => <button key={age} className={ageBand === age ? "selected" : ""} onClick={() => { setAgeBand(age); setLearningLevel(level); }}>{title}<small>{age === "adult" ? "Adult" : `Approx. ages ${age}`}</small></button>)}</div></section>
    <section className="personalisation-card"><h2>Reptile experience</h2><div className="personalisation-grid"><button className={experience === "beginner" ? "selected" : ""} onClick={() => setExperience("beginner")}>🌱 Beginner</button><button className={experience === "intermediate" ? "selected" : ""} onClick={() => setExperience("intermediate")}>🦎 Intermediate</button><button className={experience === "pro" ? "selected" : ""} onClick={() => setExperience("pro")}>🧬 Advanced</button></div></section>
    {profileType === "educator" && <section className="personalisation-card"><h2>🧑‍🏫 Educator settings</h2><label>Teaching environment<select value={teachingLevel} onChange={(event) => setTeachingLevel(event.target.value as EducatorTeachingLevel)}>{teachingLevels.map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select></label><label>Subjects<input value={subjects} onChange={(event) => setSubjects(event.target.value)} /></label><label>Organisation (optional)<input value={organisationName} onChange={(event) => setOrganisationName(event.target.value)} /></label></section>}
    {saved && <p className="personalisation-saved">✓ Preferences saved</p>}<button className="personalisation-save" onClick={() => void save()} disabled={saving}>{saving ? "Saving…" : "Save preferences"}</button>{profileType === "educator" && <Link className="personalisation-link" to="/educator">Open Educator Centre →</Link>}<button className="personalisation-back" onClick={() => navigate(-1)}>← Back</button>
  </section></main>;
}
