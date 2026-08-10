import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Layout from "../components/layout/Layout";

import Login from "../pages/Login";
import AccountSetup from "../pages/AccountSetup";
import MyAccount from "../pages/MyAccount";

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

import {
  useAuth,
} from "../context/AuthContext";

/* =========================================
   TEMPORARY PLACEHOLDER PAGES
========================================= */

function GeneticsCalculator() {
  return (
    <div className="page-container">
      <div className="welcome-card">
        <h1>Genetics Calculator</h1>

        <p>Coming Soon</p>
      </div>
    </div>
  );
}

function KnowledgeBase() {
  return (
    <div className="page-container">
      <div className="welcome-card">
        <h1>Knowledge Base</h1>

        <p>Coming Soon</p>
      </div>
    </div>
  );
}

/* =========================================
   ROUTER GATE
========================================= */

function AppRouterGate() {
  const {
    user,
    profile,
    loading,
    profileLoading,
  } = useAuth();

  /* =======================================
     GLOBAL AUTH / PROFILE LOADING
  ======================================= */

  if (loading || profileLoading) {
    return (
      <div className="page-container">
        <div className="welcome-card">
          <h1>🐍 Loading Tiny Titans...</h1>
        </div>
      </div>
    );
  }

  /* =======================================
     NOT LOGGED IN
  ======================================= */

  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />
      </Routes>
    );
  }

  /* =======================================
     ACCOUNT SETUP REQUIRED
  ======================================= */

  if (!profile || !profile.setupComplete) {
    return (
      <Routes>
        <Route
          path="/account-setup"
          element={<AccountSetup />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/account-setup"
              replace
            />
          }
        />
      </Routes>
    );
  }

  /* =======================================
     FULLY AUTHENTICATED APPLICATION
  ======================================= */

  return (
    <Routes>

      {/* =====================================
          APPLICATION LAYOUT
      ===================================== */}

      <Route element={<Layout />}>

        {/* ===============================
            HOME
        =============================== */}

        <Route
          path="/"
          element={<Home />}
        />

        {/* ===============================
            ACCOUNT
        =============================== */}

        <Route
          path="/account"
          element={<MyAccount />}
        />

        {/* ===============================
            SNAKES
        =============================== */}

        <Route
          path="/snakes"
          element={<MySnakes />}
        />

        <Route
          path="/snakes/:id"
          element={<SnakeProfile />}
        />

        <Route
          path="/snakes/:id/edit"
          element={<SnakeEdit />}
        />

        {/* ===============================
            MORPHS
        =============================== */}

        <Route
          path="/morph-library"
          element={<MorphLibrary />}
        />

        {/* ===============================
            GENETICS
        =============================== */}

        <Route
          path="/calculator"
          element={<GeneticsCalculator />}
        />

        {/* ===============================
            KNOWLEDGE BASE
        =============================== */}

        <Route
          path="/knowledge-base"
          element={<KnowledgeBase />}
        />

        {/* ===============================
            FEEDING
        =============================== */}

        <Route
          path="/feeding"
          element={<FeedingTracker />}
        />

        <Route
          path="/feeding/:id"
          element={<FeedingTracker />}
        />

        {/* ===============================
            SHEDDING
        =============================== */}

        <Route
          path="/shedding"
          element={<ShedTracker />}
        />

        <Route
          path="/shedding/:id"
          element={<ShedTracker />}
        />

        {/* ===============================
            WEIGHTS
        =============================== */}

        <Route
          path="/weights"
          element={<WeightIndex />}
        />

        <Route
          path="/weights/:id"
          element={<WeightRecords />}
        />

        {/* ===============================
            BREEDING
        =============================== */}

        <Route
          path="/breeding"
          element={<BreedingPlanner />}
        />

        {/* ===============================
            AUTH ROUTES
        =============================== */}

        <Route
          path="/login"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

        <Route
          path="/account-setup"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

        {/* ===============================
            FALLBACK
        =============================== */}

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Route>
    </Routes>
  );
}

/* =========================================
   APP ROUTER
========================================= */

function AppRouter() {
  return (
    <BrowserRouter>
      <AppRouterGate />
    </BrowserRouter>
  );
}

export default AppRouter;