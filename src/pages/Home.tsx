import { useEffect, useState } from "react";
import DashboardCard from "../components/DashboardCard";
import { useAuth } from "../context/AuthContext";
import { getUserSnakes } from "../services/snakeService";
import "./Home.css";

function Home() {
  const { user, profile } = useAuth();
  const [snakeCount, setSnakeCount] = useState<number | null>(null);
  const displayName = profile?.displayName || user?.displayName || "Tiny Titan";
  const experience = profile?.experienceLevel === "pro" ? "Advanced" : profile?.experienceLevel === "intermediate" ? "Intermediate" : "Beginner";
  const profileLabel = profile?.profileType === "educator" ? "Educator" : profile?.profileType === "learner" ? "Learner" : profile?.profileType === "professional" ? "Professional" : "Keeper";
  const learningLabel = profile?.learningLevel === "explorer" ? "Explorer" : profile?.learningLevel === "learner" ? "Learner" : profile?.learningLevel === "student" ? "Student" : "Adult";

  useEffect(() => {
    if (!user) return;
    void getUserSnakes(user.uid).then((snakes) => setSnakeCount(snakes.length)).catch(() => setSnakeCount(null));
  }, [user]);

  return <div className="dashboard">
    <section className="welcome-card">
      <div className="welcome-content">
        <p className="welcome-eyebrow">🐍 Tiny Titans</p>
        <h2>Welcome back, {displayName}!</h2>
        <p>Your Western Hognose companion for husbandry, genetics, learning and breeding.</p>
      </div>
      <div className="profile-summary">
        <div className="profile-level"><span>Experience</span><strong>{experience}</strong></div>
        <div className="profile-category"><span>Profile</span><strong>{profileLabel}</strong></div>
        <div className="profile-category"><span>Learning</span><strong>{learningLabel}</strong></div>
        <div className="profile-category"><span>Snakes</span><strong>{snakeCount ?? "—"}</strong></div>
      </div>
    </section>

    {profile?.profileType === "educator" && <section className="dashboard-section"><div className="section-heading"><div><p className="section-eyebrow">EDUCATION</p><h3>Your teaching centre</h3></div></div><section className="dashboard-grid"><DashboardCard icon="🧑‍🏫" title="Educator Centre" description="Create classrooms, plan lessons and manage teaching activities" link="/educator" /><DashboardCard icon="🎓" title="Adaptive Learning" description="Explore content tailored to your chosen age and experience layer" link="/learn" /></section></section>}

    <section className="dashboard-section"><div className="section-heading"><div><p className="section-eyebrow">TINY TITANS</p><h3>Your tools</h3></div></div>
      <section className="dashboard-grid">
        <DashboardCard icon="🐍" title="My Hoggies" description="Manage your snakes, genetics, weights and personal records" link="/snakes" />
        <DashboardCard icon="🍽️" title="Feeding Tracker" description="Track meals, feeding dates and individual feeding history" link="/feeding" />
        <DashboardCard icon="💧" title="Shed Tracker" description="Monitor blue phase, sheds and individual shed history" link="/shedding" />
        <DashboardCard icon="⚖️" title="Weight Records" description="Track growth and build each snake's personal baseline" link="/weights" />
        <DashboardCard icon="📊" title="Adaptive Learning" description="Learn at the language and depth that suits you" link="/learn" />
        <DashboardCard icon="🥚" title="Breeding Planner" description="Manage pairings and breeding projects" link="/breeding" />
        <DashboardCard icon="🧬" title="Morph Library" description="Explore Western Hognose morphs and genetics" link="/morph-library" />
        <DashboardCard icon="📚" title="Knowledge Base" description="Learn about Western Hognose husbandry and behaviour" link="/knowledge-base" />
        <DashboardCard icon="🧬" title="Genetics Calculator" description="Explore inheritance and breeding outcomes" link="/calculator" />
      </section>
    </section>
  </div>;
}

export default Home;
