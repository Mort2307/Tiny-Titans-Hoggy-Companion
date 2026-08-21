import { useEffect, useState } from "react";
import { listPublishedMentors, type PublishedMentor } from "../../services/mentorDirectoryRepository";

type Props = { goal: string; onSelect: (mentor: PublishedMentor) => void };

export default function LiveMentorDirectory({ goal, onSelect }: Props) {
  const [mentors, setMentors] = useState<PublishedMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    void listPublishedMentors(goal).then((items) => { if (active) setMentors(items); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : "Mentors could not be loaded."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [goal]);

  if (loading) return <div className="kmb-empty-network">Finding approved mentors for this goal…</div>;
  if (error) return <div className="kmb-network-error">⚠️ {error}</div>;
  if (!mentors.length) return <div className="kmb-empty-network"><strong>No approved mentors match this goal yet.</strong><span>Save your goal and TTHC can surface suitable mentors as the community grows.</span></div>;

  return <div className="kmb-mentor-grid">{mentors.map((mentor) => <article className="kmb-mentor-card" key={mentor.id}><div className="kmb-mentor-top"><div className="kmb-avatar">🐍</div><div><h3>{mentor.displayName}</h3><span className="kmb-verification">{mentor.verification}</span></div></div><p>{mentor.bio}</p><div className="kmb-mentor-stats"><span>🕒 {mentor.experienceYears}y experience</span>{mentor.breedingYears ? <span>🥚 {mentor.breedingYears}y breeding</span> : null}{mentor.clutchCount ? <span>🐣 {mentor.clutchCount} clutches</span> : null}</div><div className="kmb-focus-list">{mentor.specialities.map((item) => <span key={item}>{item}</span>)}</div><button type="button" className="kmb-primary-button" onClick={() => onSelect(mentor)}>View profile & request</button></article>)}</div>;
}
