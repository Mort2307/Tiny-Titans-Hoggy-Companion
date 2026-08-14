import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/layout/Layout";
import Calculator from "../pages/Calculator";
import Login from "../pages/Login";
import AccountSetup from "../pages/AccountSetup";
import MyAccount from "../pages/MyAccount";
import Home from "../pages/Home";
import MySnakes from "../pages/MySnakes";
import SnakeProfile from "../pages/SnakeProfile";
import SnakeEdit from "../pages/SnakeEdit";
import SnakeMasterRecord from "../pages/SnakeMasterRecord";
import FeedingTracker from "../pages/FeedingTracker";
import ShedTracker from "../pages/ShedTracker";
import WeightIndex from "../pages/WeightIndex";
import WeightRecords from "../pages/WeightRecords";
import BreedingPlanner from "../pages/BreedingPlanner";
import MorphLibrary from "../pages/MorphLibrary";
import ReportIssue from "../pages/ReportIssue";
import Founder from "../pages/Founder";
import CreatorAdmin from "../pages/CreatorAdmin";
import EducatorDashboard from "../pages/EducatorDashboard";
import { useAuth } from "../context/AuthContext";

function KnowledgeBase() {
  return <div className="page-container"><div className="welcome-card"><h1>Knowledge Base</h1><p>Coming Soon</p></div></div>;
}

function AppRouterGate() {
  const { user, profile, loading, profileLoading } = useAuth();
  if (loading || profileLoading) return <div className="page-container"><div className="welcome-card"><h1>🐍 Loading Tiny Titans...</h1></div></div>;
  if (!user) return <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  if (!profile || !profile.setupComplete) return <Routes><Route path="/account-setup" element={<AccountSetup />} /><Route path="*" element={<Navigate to="/account-setup" replace />} /></Routes>;

  return <Routes><Route element={<Layout />}>
    <Route path="/" element={<Home />} />
    <Route path="/account" element={<MyAccount />} />
    <Route path="/snakes" element={<MySnakes />} />
    <Route path="/snakes/:id" element={<SnakeProfile />} />
    <Route path="/snakes/:id/master-record" element={<SnakeMasterRecord />} />
    <Route path="/snakes/:id/edit" element={<SnakeEdit />} />
    <Route path="/morph-library" element={<MorphLibrary />} />
    <Route path="/calculator" element={<Calculator />} />
    <Route path="/knowledge-base" element={<KnowledgeBase />} />
    <Route path="/feeding" element={<FeedingTracker />} />
    <Route path="/feeding/:id" element={<FeedingTracker />} />
    <Route path="/shedding" element={<ShedTracker />} />
    <Route path="/shedding/:id" element={<ShedTracker />} />
    <Route path="/weights" element={<WeightIndex />} />
    <Route path="/weights/:id" element={<WeightRecords />} />
    <Route path="/breeding" element={<BreedingPlanner />} />
    <Route path="/report-issue" element={<ReportIssue />} />
    <Route path="/founder" element={<Founder />} />
    <Route path="/creator" element={<CreatorAdmin />} />
    <Route path="/educator" element={<EducatorDashboard />} />
    <Route path="/login" element={<Navigate to="/" replace />} />
    <Route path="/account-setup" element={<Navigate to="/" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes>;
}

export default function AppRouter() { return <BrowserRouter><AppRouterGate /></BrowserRouter>; }
