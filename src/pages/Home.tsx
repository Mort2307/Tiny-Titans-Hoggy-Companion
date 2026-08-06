import DashboardCard from "../components/DashboardCard";


function Home() {

return (

<div className="dashboard">


<section className="welcome-card">

<h2>
Welcome to Tiny Titans
</h2>


<p>
Your Western Hognose companion app.
Explore genetics, husbandry, and your snakes.
</p>


</section>




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



</section>


</div>

);

}


export default Home;