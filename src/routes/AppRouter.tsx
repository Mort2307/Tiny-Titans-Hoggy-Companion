import { BrowserRouter, Routes, Route } from "react-router-dom";

import Layout from "../components/layout/Layout";

import Home from "../pages/Home";
import MySnakes from "../pages/MySnakes";
import SnakeProfile from "../pages/SnakeProfile";
import SnakeEdit from "../pages/SnakeEdit";

import FeedingTracker from "../pages/FeedingTracker";
import ShedTracker from "../pages/ShedTracker";
import WeightIndex from "../pages/WeightIndex";
import WeightRecords from "../pages/WeightRecords";

import BreedingPlanner from "../pages/BreedingPlanner";

import MorphLibrary from "../pages/MorphLibrary";



function GeneticsCalculator() {

return (

<h2>
Genetics Calculator (Coming Soon)
</h2>

);

}



function KnowledgeBase() {

return (

<h2>
Knowledge Base (Coming Soon)
</h2>

);

}



function AppRouter() {

return (

<BrowserRouter>

<Layout>

<Routes>


<Route

path="/"

element={<Home />}

/>



{/* My Hoggies */}

<Route

path="/snakes"

element={<MySnakes />}

/>



{/* Individual Snake Profile */}

<Route

path="/snakes/:id"

element={<SnakeProfile />}

/>



{/* Edit Snake */}

<Route

path="/snakes/:id/edit"

element={<SnakeEdit />}

/>



{/* Morph Library */}

<Route

path="/morph-library"

element={<MorphLibrary />}

/>



{/* Genetics Calculator */}

<Route

path="/calculator"

element={<GeneticsCalculator />}

/>



{/* Knowledge Base */}

<Route

path="/knowledge-base"

element={<KnowledgeBase />}

/>



{/* Feeding Tracker */}

<Route

path="/feeding"

element={<FeedingTracker />}

/>



{/* Shed Tracker */}

<Route

path="/shedding"

element={<ShedTracker />}

/>



{/* Weight Index - choose snake */}

<Route

path="/weights"

element={<WeightIndex />}

/>



{/* Individual Snake Weight Records */}

<Route

path="/weights/:id"

element={<WeightRecords />}

/>



{/* Breeding Planner */}

<Route

path="/breeding"

element={<BreedingPlanner />}

/>


</Routes>

</Layout>

</BrowserRouter>

);

}


export default AppRouter;