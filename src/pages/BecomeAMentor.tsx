import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { saveMentorApplication } from "../services/mentorshipRepository";
import type { MentorApplication, MentorRole } from "../services/mentorNetwork";
import "../styles/KeeperMeetsBreeder.css";

const specialities = ["husbandry", "behaviour", "genetics", "breeding", "hatchlings", "records", "enclosures"] as const;
const labels: Record<string, string> = { husbandry: "Husbandry", behaviour: "Behaviour", genetics: "Genetics", breeding: "Breeding", hatchlings: "Hatchlings", records: "Records", enclosures: "Enclosures" };
const descriptions: Record<string, string> = { husbandry: "Routine care, feeding, shedding and day-to-day keeper decisions.", behaviour: "Reading behaviour, handling confidence and recognising normal variation.", genetics: "Morph genetics, inheritance and responsible terminology.", breeding: "Pairings, preparation, breeding decisions and clutch management.", hatchlings: "Hatchling care, feeding progression and early keeper support.", records: "Using keeper records to spot trends and make better decisions.", enclosures: "Enclosure design, heating, substrate and environmental management." };
const keeperSpecialities = new Set(["husbandry", "behaviour", "records", "enclosures"]);
const breederSpecialities = new Set(["genetics", "breeding", "hatchlings", "records"]);

export default function BecomeAMentor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<MentorRole[]>(["keeper"]);
  const [selected, setSelected] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState("10");
  const [experience, setExperience] = useState("");
  const [breeding, setBreeding] = useState("");
  const [evidence, setEvidence] = useState("");
  const [verification, setVerification] = useState<Exclude<MentorApplication["requestedVerification"], "breeder">>("community");
  const [conduct, setConduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const toggleRole = (role: MentorRole) => { setRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]); setError(""); };
  const toggleSpeciality = (item: string) => { setSelected((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]); setError(""); };
  const roleSpecialities = useMemo(() => { const allowed = new Set<string>(); if (roles.includes("keeper")) keeperSpecialities.forEach((item) => allowed.add(item)); if (roles.includes("breeder")) breederSpecialities.forEach((item) => allowed.add(item)); return specialities.filter((item) => allowed.has(item)); }, [roles]);
  const years = Number(experienceYears);
  const validYears = Number.isFinite(years) && years >= 0 && years <= 80;
  const experienceReady = experience.trim().length >= 30;
  const breedingReady = !roles.includes("breeder") || breeding.trim().length >= 30;
  const ready = validYears && roles.length > 0 && selected.length > 0 && experienceReady && breedingReady && conduct;

  const submit = async () => {
    if (!user) return setError("You need to be signed in to submit a mentor application.");
    if (!validYears) return setError("Enter a valid experience period between 0 and 80 years.");
    if (!roles.length) return setError("Choose at least one mentor role.");
    if (!selected.length) return setError("Choose at least one speciality.");
    if (!experienceReady) return setError("Tell us a little more about your real-world experience (at least 30 characters).");
    if (!breedingReady) return setError("Because you selected Breeder Mentor, please describe your actual breeding experience (at least 30 characters).");
    if (!conduct) return setError("Accept the community conduct agreement before submitting.");
    setSaving(true); setError("");
    try {
      const application: MentorApplication = { id: crypto.randomUUID(), applicantId: user.uid, status: "submitted", mentorRoles: roles, requestedVerification: verification, specialities: selected, experienceYears: years, experienceSummary: experience.trim(), breedingExperience: breeding.trim() || undefined, evidenceNotes: evidence.trim() || undefined, conductAccepted: true };
      await saveMentorApplication(application);
      setSubmitted(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Your application could not be submitted. Try again shortly."); }
    finally { setSaving(false); }
  };

  if (submitted) return <main className="kmb-page"><header className="kmb-hero"><div className="kmb-hero-mark">✅</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">APPLICATION RECEIVED</span><h1>You're in the review queue</h1><p>Your application has been saved and sent to Creator Centre. A creator must review it before your mentor profile becomes visible.</p></div></header><section className="kmb-section"><div className="kmb-recommendation"><span className="kmb-label">WHAT HAPPENS NEXT</span><h2>Human review, not an automatic badge</h2><p>The reviewer can approve the application, ask for more evidence or decline it. Your selected mentor role(s) and specialities will be carried into the mentor profile when approved.</p><div className="kmb-focus-list"><span>✓ {roles.map((role) => role === "keeper" ? "Keeper Mentor" : "Breeder Mentor").join(" + ")}</span><span>✓ {selected.length} speciality submitted</span><span>✓ {years} year{years === 1 ? "" : "s"} of relevant experience</span><span>✓ {verification === "community" ? "Community Mentor" : verification === "verified" ? "Verified Mentor" : "TTHC Educator"} review requested</span></div><div className="kmb-modal-actions"><button type="button" className="kmb-primary-button" onClick={() => navigate("/community/keeper-meets-breeder")}>Back to Keeper Meets Breeder</button><button type="button" className="kmb-secondary" onClick={() => navigate("/creator/mentor-review")}>Open Creator review</button></div></div></section></main>;

  return <main className="kmb-page">
    <header className="kmb-hero"><div className="kmb-hero-mark">🧑‍🏫</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">KEEPER MEETS BREEDER · CONTRIBUTOR</span><h1>Become a Mentor</h1><p>Tell TTHC what you genuinely know, what you can help with and where that experience comes from. Every application is reviewed before publication.</p></div></header>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">01 · MENTOR ROLE</span><h2>Choose the kind of mentor you want to be</h2><p>Keeper and breeder mentoring are deliberately separate. You can select both if your experience genuinely covers both.</p></div></div><div className="kmb-goal-grid">{(["keeper", "breeder"] as MentorRole[]).map((role) => <button type="button" key={role} className={`kmb-goal ${roles.includes(role) ? "selected" : ""}`} onClick={() => toggleRole(role)} aria-pressed={roles.includes(role)}><span className="kmb-goal-icon">{role === "keeper" ? "🏡" : "🐍"}</span><span><strong>{role === "keeper" ? "Keeper Mentor" : "Breeder Mentor"}</strong><small>{role === "keeper" ? "Husbandry, behaviour, enclosures, records and keeper confidence." : "Genetics, pairings, breeding decisions, clutches and hatchlings."}</small></span><span aria-hidden="true">{roles.includes(role) ? "✓" : "＋"}</span></button>)}</div></section>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">02 · SPECIALITIES</span><h2>What can you genuinely help with?</h2><p>Only specialities relevant to your selected mentor role(s) are shown.</p></div></div><div className="kmb-record-grid">{roleSpecialities.map((item) => <label className={`kmb-record ${selected.includes(item) ? "selected" : ""}`} key={item}><input type="checkbox" checked={selected.includes(item)} onChange={() => toggleSpeciality(item)} /><span><strong>{labels[item]}</strong><small>{descriptions[item]}</small></span></label>)}</div></section>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">03 · EXPERIENCE</span><h2>Tell us what you've actually done</h2><p>Ten years is absolutely a valid experience period. What matters is that the description supports the experience you are claiming.</p></div></div><label className="kmb-field-label">Years of relevant experience<input className="kmb-textarea" type="number" min="0" max="80" step="0.5" value={experienceYears} onChange={(event) => setExperienceYears(event.target.value)} /></label><label className="kmb-field-label">Your real-world experience<textarea className="kmb-textarea" rows={6} maxLength={1200} value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="What have you kept, worked with, learned or confidently helped others with? Include the areas you have hands-on experience in." /><small>{experience.trim().length}/30 minimum · {experience.length}/1200</small></label>{roles.includes("breeder") && <label className="kmb-field-label">Breeding experience<textarea className="kmb-textarea" rows={6} maxLength={1200} value={breeding} onChange={(event) => setBreeding(event.target.value)} placeholder="Describe your actual breeding experience: pairings, genetics, clutches, incubation, hatchlings or other hands-on work." /><small>{breeding.trim().length}/30 minimum for Breeder Mentor</small></label>}<label className="kmb-field-label">Optional evidence or community contribution<textarea className="kmb-textarea" rows={4} maxLength={1000} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Useful examples, projects, educational contributions or other context a reviewer should know." /><small>{evidence.length}/1000</small></label></section>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">04 · TRUST LEVEL</span><h2>How should your contribution be reviewed?</h2><p>Mentor role and verification are separate. Selecting Breeder Mentor does not automatically grant breeder verification.</p></div></div><select className="kmb-textarea" value={verification} onChange={(event) => setVerification(event.target.value as Exclude<MentorApplication["requestedVerification"], "breeder">)}><option value="community">Community Mentor — contribution reviewed</option><option value="verified">Verified Mentor — experience/details reviewed</option><option value="educator">TTHC Educator — teaching contribution reviewed</option></select></section>
    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">05 · COMMUNITY STANDARD</span><h2>Keep mentorship useful and safe</h2></div></div><label className={`kmb-record ${conduct ? "selected" : ""}`}><input type="checkbox" checked={conduct} onChange={(event) => setConduct(event.target.checked)} /><span><strong>I agree to the community conduct standard.</strong><small>Communicate respectfully, distinguish personal experience from established information, stay within my competence and make it clear when professional advice is needed.</small></span></label></section>
    {error && <div className="kmb-network-error" role="alert">⚠️ {error}</div>}
    <section className="kmb-workspace-launch"><div><span className="kmb-label">06 · REVIEW & SUBMIT</span><h2>{ready ? "Ready for Creator Centre" : "Complete your application"}</h2><p>{ready ? "Everything required is complete. Submit it for human review." : "Use this checklist to see exactly what is still missing."}</p><div className="kmb-focus-list"><span>{roles.length ? `✓ ${roles.map((role) => role === "keeper" ? "Keeper Mentor" : "Breeder Mentor").join(" + ")}` : "○ Choose at least one mentor role"}</span><span>{selected.length ? `✓ ${selected.length} speciality selected` : "○ Choose at least one speciality"}</span><span>{validYears ? `✓ ${years} year${years === 1 ? "" : "s"} entered` : "○ Enter a valid experience period"}</span><span>{experienceReady ? "✓ Experience described" : "○ Add at least 30 characters of experience"}</span><span>{breedingReady ? "✓ Role-specific experience complete" : "○ Add at least 30 characters of breeding experience"}</span><span>{conduct ? "✓ Community agreement accepted" : "○ Accept the community agreement"}</span></div></div><button type="button" className="kmb-primary-button" disabled={saving || !ready} onClick={() => void submit()}>{saving ? "Submitting…" : "Submit for Creator Centre review"}</button></section>
  </main>;
}
