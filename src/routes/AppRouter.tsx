import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "../components/Layout/Layout";
import Calculator from "../pages/Calculator";
import Login from "../pages/Login";
import AccountSetup from "../pages/AccountSetup";
import MyAccount from "../pages/MyAccount";
import EditProfile from "../pages/EditProfile";
import Security from "../pages/Security";
import Settings from "../pages/Settings";
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
import BecomeATitan from "../pages/BecomeATitan";
import CreatorAdmin from "../pages/CreatorAdmin";
import EducatorDashboard from "../pages/EducatorDashboard";
import AdaptiveLearningHub from "../pages/AdaptiveLearningHub";
import LearnTopic from "../pages/LearnTopic";
import LearnAchievements from "../pages/LearnAchievements";
import KnowledgeBase from "../pages/KnowledgeBase";
import Personalisation from "../pages/Personalisation";
import { useAuth } from "../context/AuthContext";
import { UnitProvider } from "../context/UnitContext";

function AppRouterGate() {
  const { user, profile, loading, profileLoading } = useAuth();
  if (loading || profileLoading) return <div className="page-container"><div className="welcome-card"><h1>🐍 Loading Tiny Titans...</h1></div></div>;
  if (!user) return <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>;
  if (!profile || !profile.setupComplete) return <Routes><Route path="/account-setup" element={<AccountSetup />} /><Route path="*" element={<Navigate to="/account-setup" replace />} /></Routes>;
  return <UnitProvider><Routes><Route element={<Layout />}>
    <Route path="/" element={<Home />} /><Route path="/account" element={<MyAccount />} /><Route path="/account/profile" element={<EditProfile />} /><Route path="/account/security" element={<Security />} /><Route path="/account/settings" element={<Settings />} /><Route path="/account/personalise" element={<Personalisation />} />
    <Route path="/snakes" element={<MySnakes />} /><Route path="/snakes/:id" element={<SnakeProfile />} /><Route path="/snakes/:id/master-record" element={<SnakeMasterRecord />} /><Route path="/snakes/:id/edit" element={<SnakeEdit />} />
    <Route path="/morph-library" element={<MorphLibrary />} /><Route path="/calculator" element={<Calculator />} /><Route path="/knowledge-base" element={<KnowledgeBase />} /><Route path="/learn" element={<AdaptiveLearningHub />} /><Route path="/learn/topic/:id" element={<LearnTopic />} /><Route path="/learn/achievements" element={<LearnAchievements />} />
    <Route path="/feeding" element={<FeedingTracker />} /><Route path="/feeding/:id" element={<FeedingTracker />} /><Route path="/shedding" element={<ShedTracker />} /><Route path="/shedding/:id" element={<ShedTracker />} />
    <Route path="/weights" element={<WeightIndex />} /><Route path="/weights/:id" element={<WeightRecords />} /><Route path="/breeding" element={<BreedingPlanner />} />
    <Route path="/report-issue" element={<ReportIssue />} /><Route path="/founder" element={<Founder />} /><Route path="/become-a-titan" element={<BecomeATitan />} />
    <Route path="/creator" element={<CreatorAdmin />} /><Route path="/educator" element={<EducatorDashboard />} />
    <Route path="/login" element={<Navigate to="/" replace />} /><Route path="/account-setup" element={<Navigate to="/" replace />} /><Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes></UnitProvider>;
}
export default function AppRouter() { return <BrowserRouter><AppRouterGate /></BrowserRouter>; }