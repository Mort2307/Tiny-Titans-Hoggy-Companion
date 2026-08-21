import { useState } from "react";
import { getVerificationTrustNote, type MentorApplicationStatus, type MentorDirectoryEntry } from "../../services/mentorNetwork";
import { verificationLabels } from "../../services/mentorshipProfiles";
import { createMentorshipRequest, saveMentorApplication } from "../../services/mentorshipRepository";
import { useAuth } from "../../context/useAuth";

type Props = { goal: string; requestedRecords?: string[] };

const demoMentors: MentorDirectoryEntry[] = [
  { id: "mentor-demo-1", displayName: "TTHC Community Mentor", bio: "Experienced keeper focused on husbandry, behaviour and practical record keeping.", verification: "verified", specialities: ["husbandry", "behaviour", "records"], experienceYears: 8, availability: "accepting", mentoringGoals: ["husbandry", "mentor"], acceptingNewMentees: true, responseTimeLabel: "Usually replies within a few days" },
  { id: "mentor-demo-2", displayName: "TTHC Breeder Mentor", bio: "Breeding-focused mentor covering genetics, pairing decisions and hatchling preparation.", verification: "breeder", specialities: ["breeding", "genetics", "hatchlings"], experienceYears: 12, breedingYears: 7, clutchCount: 28, availability: "limited", mentoringGoals: ["genetics", "breeding", "first-clutch", "hatchlings"], acceptingNewMentees: true, responseTimeLabel: "Limited spaces" },
];

export default function MentorNetworkPreview({ goal, requestedRecords = [] }: Props) {
  const { user, profile } = useAuth();
  const [applicationStatus, setApplicationStatus] = useState<MentorApplicationStatus>("draft");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [selectedMentor, setSelectedMentor] = useState<MentorDirectoryEntry | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchingMentors = demoMentors.filter((mentor) => mentor.mentoringGoals.includes(goal));

  const submitRequest = async () => {
    if (!selectedMentor || !user) return;
    setBusy(true); setError(null);
    try {
      const id = await createMentorshipRequest({ id: crypto.randomUUID(), requesterId: user.uid, mentorId: selectedMentor.id, goal, message: message.trim() || `I'm working towards: ${goal}. I'd like guidance on the practical steps and would value your experience.`, requestedRecords, status: "sent", createdAt: new Date().toISOString() });
      setRequestId(id); setSelectedMentor(null); setMessage("");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "The mentorship request could not be saved."); }
    finally { setBusy(false); }
  };

  const startApplication = async () => {
    if (!user) return;
    setBusy(true); setError(null);
    try {
      await saveMentorApplication({ id: user.uid, applicantId: user.uid, status: "submitted", requestedVerification: "community", specialities: [], experienceSummary: "", conductAccepted: false });
      setApplicationStatus("submitted");
    } catch (applicationError) { setError(applicationError instanceof Error ? applicationError.message : "The mentor application could not be saved."); }
    finally { setBusy(false); }
  };

  return <section className="kmb-network"><div className="kmb-network-heading"><div><span className="kmb-label">STEP 4 · COMMUNITY</span><h2>Meet the people behind the knowledge</h2><p>Mentors will have transparent profiles, specialities, verification status and availability. No popularity-based expert badge.</p></div><span className="kmb-network-status">🚧 Network preview</span></div><div className="kmb-mentor-grid">{matchingMentors.length ? matchingMentors.map((mentor) => <article className="kmb-mentor-card" key={mentor.id}><div className="kmb-mentor-top"><div className="kmb-avatar">🐍</div><div><h3>{mentor.displayName}</h3><span className="kmb-verification">{verificationLabels[mentor.verification]}</span></div></div><p>{mentor.bio}</p><div className="kmb-mentor-stats"><span>🕒 {mentor.experienceYears}y experience</span>{mentor.breedingYears ? <span>🥚 {mentor.breedingYears}y breeding</span> : null}{mentor.clutchCount ? <span>🐣 {mentor.clutchCount} clutches</span> : null}</div><div className="kmb-focus-list">{mentor.specialities.map((item) => <span key={item}>{item}</span>)}</div><small>{mentor.responseTimeLabel}</small><button type="button" className="kmb-primary-button" onClick={() => { setSelectedMentor(mentor); setMessage(`I'm working towards: ${goal}. I'd like guidance on the practical steps and would value your experience.`); }}>View profile & request</button></article>) : <div className="kmb-empty-network">No matching mentors are currently listed. Your goal can still be saved and TTHC can notify you when a suitable mentor becomes available.</div>}</div>{selectedMentor && <div className="kmb-mentor-modal"><div className="kmb-modal-card"><button type="button" className="kmb-modal-close" onClick={() => setSelectedMentor(null)}>×</button><span className="kmb-label">MENTOR PROFILE</span><h3>{selectedMentor.displayName}</h3><p>{selectedMentor.bio}</p><div className="kmb-trust-note"><strong>{verificationLabels[selectedMentor.verification]}</strong><span>{getVerificationTrustNote(selectedMentor.verification)}</span></div><label className="kmb-message-label">Why would you like this mentorship?</label><textarea value={message} onChange={(event) => setMessage(event.target.value)} />{requestedRecords.length ? <p className="kmb-share-note">{requestedRecords.length} record categories selected for sharing. The mentor receives only those categories if the request is accepted.</p> : null}<div className="kmb-modal-actions"><button type="button" className="kmb-secondary" onClick={() => setSelectedMentor(null)}>Cancel</button><button type="button" className="kmb-primary-button" disabled={busy || !user} onClick={submitRequest}>{busy ? "Sending…" : "Send mentorship request"}</button></div></div></div>}{requestId && <div className="kmb-request-sent">✓ Mentorship request saved. The mentor will only receive the information you explicitly share when the request is accepted.</div>}{error && <div className="kmb-network-error">⚠️ {error}</div>}<div className="kmb-mentor-application"><div><span className="kmb-label">WANT TO HELP?</span><h3>Become a TTHC mentor</h3><p>Apply with your experience and areas of knowledge. Verification will be transparent, evidence-aware and reviewed rather than automatically granted.</p></div><button type="button" className="kmb-secondary" disabled={busy || !user} onClick={startApplication}>{applicationStatus === "submitted" ? "Application submitted" : "Start mentor application"}</button></div>{profile?.isTester ? <small className="kmb-network-note">Tester mode: network data is real Firestore data, while mentor directory entries remain preview records until the admin directory is connected.</small> : null}</section>;
}
