import DashboardCard from "../components/DashboardCard";
import { useAuth } from "../context/AuthContext";

import "./Home.css";


function Home() {

  const {
    user,
    profile,
  } = useAuth();


  const displayName =
    profile?.displayName ||
    user?.displayName ||
    "Tiny Titan";


  return (

    <div className="dashboard">


      {/* Welcome */}

      <section className="welcome-card">

        <div className="welcome-content">

          <p className="welcome-eyebrow">
            🐍 Tiny Titans
          </p>

          <h2>
            Welcome back, {displayName}!
          </h2>

          <p>
            Your Western Hognose companion
            for husbandry, genetics,
            learning and breeding.
          </p>

        </div>


        <div className="profile-summary">

          <div className="profile-level">

            <span>
              Experience
            </span>

            <strong>
              {profile?.experienceLevel === "pro"
                ? "Pro"
                : profile?.experienceLevel === "intermediate"
                  ? "Intermediate"
                  : "Beginner"}
            </strong>

          </div>


          <div className="profile-category">

            <span>
              Profile
            </span>

            <strong>
              {profile?.category === "child"
                ? "Young Keeper"
                : "Adult Keeper"}
            </strong>

          </div>

        </div>

      </section>



      {/* Tools */}

      <section className="dashboard-section">

        <div className="section-heading">

          <div>

            <p className="section-eyebrow">
              TINY TITANS
            </p>

            <h3>
              Your tools
            </h3>

          </div>

        </div>


        <section className="dashboard-grid">


          <DashboardCard
            icon="🐍"
            title="My Hoggies"
            description="Manage your snakes, genetics, weights and personal records"
            link="/snakes"
          />


          <DashboardCard
            icon="🍽️"
            title="Feeding Tracker"
            description="Track meals, feeding dates and history"
            link="/feeding"
          />


          <DashboardCard
            icon="💧"
            title="Shed Tracker"
            description="Monitor blue phase and shed records"
            link="/shedding"
          />


          <DashboardCard
            icon="⚖️"
            title="Weight Records"
            description="Track growth and health progress"
            link="/weights"
          />


          <DashboardCard
            icon="🥚"
            title="Breeding Planner"
            description="Manage pairings and breeding projects"
            link="/breeding"
          />


          <DashboardCard
            icon="🧬"
            title="Morph Library"
            description="Explore Western Hognose morphs and genetics"
            link="/morph-library"
          />


          <DashboardCard
            icon="📚"
            title="Knowledge Base"
            description="Learn about Western Hognose husbandry and behaviour"
            link="/knowledge-base"
          />


          <DashboardCard
            icon="🧬"
            title="Genetics Calculator"
            description="Explore inheritance and breeding outcomes"
            link="/calculator"
          />


        </section>

      </section>


    </div>

  );
}


export default Home;