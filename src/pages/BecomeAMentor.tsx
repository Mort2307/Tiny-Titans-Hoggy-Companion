import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { saveMentorApplication } from "../services/mentorshipRepository";
import type { MentorApplication, MentorRole } from "../services/mentorNetwork";
import "../styles/KeeperMeetsBreeder.css";

const specialities = ["husbandry", "behaviour", "genetics", "breeding", "hatchlings", "records", "enclosures"] as const;
const labels: Record<string, string> = { husbandry: "Husbandry", behaviour: "Behaviour", genetics: "Genetics", breeding: "Breeding", hatchlings: "Hatchlings", records: "Records", enclosures: "Enclosures" };
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

  const toggleRole = (role: MentorRole) => setRoles((current) => current.includes(role) ? current.filter((item) => item !== role) : [...current, role]);
  const toggleSpeciality = (item: string) => setSelected((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item]);
  const roleSpecialities = useMemo(() => {
    const allowed = new Set<string>();
    if (roles.includes("keeper")) keeperSpecialities.forEach((item) => allowed.add(item));
    if (roles.includes("breeder")) breederSpecialities.forEach((item) => allowed.add(item));
    return [...allowed];
  }, [roles]);
  const ready = Number.isFinite(Number(experienceYears)) && Number(experienceYears) >= 0 && Number(experienceYears) <= 80 && roles.length > 0 && selected.length > 0 && experience.trim().length >= 30 && conduct;

  const submit = async () => {
    if (!user) return;
    const years = Number(experienceYears);
    if (!Number.isFinite(years) || years < 0 || years > 80) return setError("Enter a valid experience period between 0 and 80 years.");
    if (!roles.length) return setError("Choose at least one mentor role.");
    if (!selected.length) return setError("Choose at least one speciality.");
    if (experience.trim().length < 30) return setError("Tell us a little more about your real-world experience (at least 30 characters).");
    if (roles.includes("breeder") && breeding.trim().length < 30) return setError("Because you selected Breeder Mentor, please describe your actual breeding experience (at least 30 characters).");
    if (!conduct) return setError("Accept the community conduct agreement before submitting.");
    setSaving(true); setError("");
    try {
      const application: MentorApplication = { id: crypto.randomUUID(), applicantId: user.uid, status: "submitted", mentorRoles: roles, requestedVerification: verification, specialities: selected, experienceYears: years, experienceSummary: experience.trim(), breedingExperience: breeding.trim() || undefined, evidenceNotes: evidence.trim() || undefined, conductAccepted: true };
      await saveMentorApplication(application);
      setSubmitted(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Your application could not be submitted. Try again shortly."); }
    finally { setSaving(false); }
  };

  if (submitted) return <main className="kmb-page"><header className="kmb-hero"><div className="kmb-hero-mark">✅</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">APPLICATION RECEIVED</span><h1>You're in the review queue</h1><p>Your mentor application has been sent to Creator Centre. Approval is reviewed by a TTHC creator; it is not automatic.</p></div></header><section className="kmb-recommendation"><span className="kmb-label">NEXT STEP</span><h2>What happens now?</h2><p>A creator can approve you, request more evidence or decline the application. If approved, your mentor profile can be published to the appropriate community directory.</p><div className="kmb-modal-actions"><button type="button" className="kmb-primary-button" onClick={() => navigate("/community/keeper-meets-breeder")}>Back to Keeper Meets Breeder</button><button type="button" className="kmb-secondary" onClick={() => navigate("/creator/mentor-review")}>Open Creator review</button></div></section></main>;

  return <main className="kmb-page">
    <header className="kmb-hero"><div className="kmb-hero-mark">🧑‍🏫</div><div className="kmb-hero-copy"><span className="kmb-eyebrow">KEEPER MEETS BREEDER · CONTRIBUTOR</span><h1>Become a Mentor</h1><p>Tell us what you genuinely know, what you can help with and where your experience comes from. Creator Centre reviews every application before publication.</p></div></header>

    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">01 · MENTOR ROLE</span><h2>What kind of mentor are you?</h2><p>Keeper and breeder mentoring are separate roles. You can apply for both if your experience genuinely covers both areas.</p></div></div><div className="kmb-goal-grid">
      {(["keeper", "breeder"] as MentorRole[]).map((role) => <button type="button" key={role} className={`kmb-goal ${roles.includes(role) ? "selected" : ""}`} onClick={() => toggleRole(role)}><span className="kmb-goal-icon">{role === "keeper" ? "🦎" : "🐍"}</span><span><strong>{role === "keeper" ? "Keeper Mentor" : "Breeder Mentor"}</strong><small>{role === "keeper" ? "Husbandry, behaviour, enclosures and keeper confidence." : "Genetics, breeding, clutches and hatchling experience."}</small></span></button>)}
    </div></section>

    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">02 · SPECIALITIES</span><h2>What can you genuinely help with?</h2></div></div><div className="kmb-record-grid">{specialities.filter((item) => roleSpecialities.includes(item)).map((item) => <label className={`kmb-record ${selected.includes(item) ? "selected" : ""}`} key={item}><input type="checkbox" checked={selected.includes(item)} onChange={() => toggleSpeciality(item)} /><span>{labels[item]}</span></label>)}</div></section>

    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">03 · EXPERIENCE</span><h2>Tell us what you've actually done</h2></div></div><label className="kmb-field-label">Years of relevant experience<input className="kmb-textarea" type="number" min="0" max="80" step="0.5" value={experienceYears} onChange={(event) => setExperienceYears(event.target.value)} /></label><label className="kmb-field-label">Your real-world experience<textarea className="kmb-textarea" rows={6} value={experience} onChange={(event) => setExperience(event.target.value)} placeholder="What have you kept, worked with, learned or confidently helped others with?" /></label>{roles.includes("breeder") && <label className="kmb-field-label">Breeding experience<textarea className="kmb-textarea" rows={6} value={breeding} onChange={(event) => setBreeding(event.target.value)} placeholder="Describe your actual breeding experience: pairings, genetics, clutches, incubation, hatchlings or other relevant hands-on experience." /></label>}<label className="kmb-field-label">Optional evidence or community contribution<textarea className="kmb-textarea" rows={4} value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Useful examples, projects, educational contributions or other context for reviewers." /></label></section>

    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">04 · VERIFICATION</span><h2>How should your contribution be reviewed?</h2><p>This is separate from your mentor role. Choosing Breeder Mentor above makes you a breeder mentor applicant; it does not automatically grant breeder verification.</p></div></div><select className="kmb-textarea" value={verification} onChange={(event) => setVerification(event.target.value as Exclude<MentorApplication["requestedVerification"], "breeder">)}><option value="community">Community Mentor</option><option value="verified">Verified Mentor</option><option value="educator">TTHC Educator</option><option value="veterinary">Veterinary professional</option></select></section>

    <section className="kmb-section"><div className="kmb-section-heading"><div><span className="kmb-label">05 · COMMUNITY STANDARD</span><h2>Keep mentorship useful and safe</h2></div></div><label className={`kmb-record ${conduct ? "selected" : ""}`}><input type="checkbox" checked={conduct} onChange={(event) => setConduct(event.target.checked)} /><span>I agree to communicate respectfully, distinguish personal experience from established information and stay within my competence.</span></label></section>

    {error && <div className="kmb-coming"><span>⚠️</span><div><strong>{error}</strong></div></div>}

    <section className="kmb-workspace-launch"><div><span className="kmb-label">06 · REVIEW & SUBMIT</span><h2>Application readiness</h2><p>{ready ? "Everything required is complete. Your application can now be sent to Creator Centre." : "Complete the highlighted requirements before submitting."}</p><div className="kmb-focus-list"><span>{roles.length ? "✓ Mentor role selected" : "○ Choose a mentor role"}</span><span>{selected.length ? `✓ ${selected.length} speciality selected` : "○ Choose at least one speciality"}</span><span>{Number.isFinite(Number(experienceYears)) ? "✓ Experience period entered" : "○ Enter your experience period"}</span><span>{experience.trim().length >= 30 ? "✓ Experience described" : "○ Add your experience"}</span><span>{!roles.includes("breeder") || breeding.trim().length >= 30 ? "✓ Role-specific experience complete" : "○ Add breeding experience"}</span><span>{conduct ? "✓ Community agreement accepted" : "○ Accept community agreement"}</span></div></div><button type="button" className="kmb-primary-button" disabled={saving || !ready} onClick={() => void submit()}>{saving ? "Submitting…" : "Submit for Creator Centre review"}</button></section>
  </main>;
}
