import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Layout from "../components/Layout/Layout";
import Calculator from "../pages/Calculator";
import Sandbox from "../pages/Sandbox";
import Login from "../pages/Login";
import AccountSetup from "../pages/AccountSetup";
import MyAccount from "../pages/MyAccount";
import FamilyAccount from "../pages/FamilyAccount";
import EditProfile from "../pages/EditProfile";
import Security from "../pages/Security";
import Settings from "../pages/Settings";
import DataPrivacy from "../pages/DataPrivacy";
import Home from "../pages/Home";
import MySnakes from "../pages/MySnakes";
import SnakeProfile from "../pages/SnakeProfile";
import SnakeEdit from "../pages/SnakeEdit";
import SnakeMasterRecord from "../pages/SnakeMasterRecord";
import SnakeTimeline from "../pages/SnakeTimeline";
import FeedingTracker from "../pages/FeedingTracker";
import FeedingPreparation from "../pages/FeedingPreparation";
import ShedTracker from "../pages/ShedTrackerIntelligent";
import HealthTracker from "../pages/HealthTracker";
import BehaviourTracker from "../pages/BehaviourTracker";
import WeightIndex from "../pages/WeightIndex";
import WeightRecords from "../pages/WeightRecords";
import HusbandryCare from "../pages/HusbandryCare";
import EnclosureIntelligence from "../pages/EnclosureIntelligence";
import BreedingPlanner from "../pages/BreedingPlanner";
import MorphLibrary from "../pages/MorphLibrary";
import MorphTerminologyAudit from "../pages/MorphTerminologyAudit";
import ReportIssue from "../pages/ReportIssue";
import Feedback from "../pages/Feedback";
import MyIssueReports from "../pages/MyIssueReports";
import ConversationInbox from "../pages/ConversationInbox";
import CommunityHub from "../pages/CommunityHub";
import CommunityCreate from "../pages/CommunityCreate";
import CommunityManager from "../pages/CommunityManager";
import WallOfTitans from "../pages/WallOfTitans";
import KeeperMeetsBreeder from "../pages/KeeperMeetsBreeder";
import MentorshipDestination from "../pages/MentorshipDestination";
import Founder from "../pages/Founder";
import BecomeATitan from "../pages/BecomeATitan";
import CreatorAdmin from "../pages/CreatorAdmin";
import CreatorLanding from "../pages/CreatorLanding";
import CreatorPrivacyData from "../pages/CreatorPrivacyData";
import CreatorSubmissions from "../pages/CreatorSubmissions";
import CreatorIssueQueues from "../pages/CreatorIssueQueues";
import EducatorDashboard from "../pages/EducatorDashboard";
import TitansChallenge from "../pages/TitansChallenge";
import ChallengeSession from "../pages/ChallengeSession";
import LearnAchievements from "../pages/LearnAchievements";
import LearningHub from "../pages/LearningHub";
import KnowledgeBase from "../pages/KnowledgeBase";
import LearnTopic from "../pages/LearnTopic";
import AdaptiveLearningHub from "../pages/AdaptiveLearningHub";
import Personalisation from "../pages/Personalisation";
import TesterCentre from "../pages/TesterCentre";
import CreatorRouteGuard from "../components/CreatorRouteGuard";
import RequireCapability from "../components/RequireCapability";
import CreatorTesterInvitation from "../components/CreatorTesterInvitation";
import DataPrivacyConsentModal, { CONSENT_VERSION } from "../components/DataPrivacyConsentModal";
import { useAuth } from "../context/useAuth";
import { UnitProvider } from "../context/UnitContext";
import { getPrivacyPreferences, PRIVACY_CONSENT_VERSION } from "../services/privacyService";
function hasLocalPrivacyConsent(userId: string) { try { return window.localStorage.getItem(`tinytitans:privacy-consent:${userId}`) === CONSENT_VERSION; } catch { return false; } }
function AppRouterGate() {
  const location = useLocation(); const { user, profile, loading, profileLoading } = useAuth(); const [consentAccepted, setConsentAccepted] = useState(false); const [privacyConsentVersion, setPrivacyConsentVersion] = useState<string | null>(null); const currentDestination = `${location.pathname}${location.search}`; const loginRedirect = `/login?redirect=${encodeURIComponent(currentDestination)}`; const setupRedirect = `/account-setup?redirect=${encodeURIComponent(currentDestination)}`;
  useEffect(() => { let active = true; setPrivacyConsentVersion(null); if (!user) return () => { active = false; }; void getPrivacyPreferences(user.uid).then((preferences) => { if (!active) return; setPrivacyConsentVersion(preferences.consentVersion || profile?.privacyConsentVersion || profile?.dataCollectionPreferences?.consentVersion || ""); }).catch(() => { if (!active) return; setPrivacyConsentVersion(profile?.privacyConsentVersion || profile?.dataCollectionPreferences?.consentVersion || ""); }); return () => { active = false; }; }, [user, profile?.privacyConsentVersion, profile?.dataCollectionPreferences?.consentVersion]);
  if (loading || profileLoading || (user && privacyConsentVersion === null)) return <div className="page-container"><div className="welcome-card"><h1>🐍 Loading Tiny Titans...</h1></div></div>;
  if (!user) return <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to={loginRedirect} replace />} /></Routes>;
  if (!profile || !profile.setupComplete) return <Routes><Route path="/account-setup" element={<AccountSetup />} /><Route path="*" element={<Navigate to={setupRedirect} replace />} /></Routes>;
  const consentAlreadyStored = privacyConsentVersion === PRIVACY_CONSENT_VERSION || profile.privacyConsentVersion === CONSENT_VERSION || profile.dataCollectionPreferences?.consentVersion === CONSENT_VERSION || hasLocalPrivacyConsent(user.uid); const consentRequired = !consentAccepted && !consentAlreadyStored;
  return <UnitProvider><Routes><Route element={<Layout />}>
    <Route path="/" element={<Home />} /><Route path="/account" element={<MyAccount />} /><Route path="/account/family" element={<FamilyAccount />} /><Route path="/account/profile" element={<EditProfile />} /><Route path="/account/security" element={<Security />} /><Route path="/account/settings" element={<Settings />} /><Route path="/account/data-privacy" element={<DataPrivacy />} /><Route path="/account/personalise" element={<Personalisation />} />
    <Route path="/snakes" element={<MySnakes />} /><Route path="/snakes/new" element={<SnakeEdit />} /><Route path="/snakes/:id" element={<SnakeProfile />} /><Route path="/snakes/:id/master-record" element={<SnakeMasterRecord />} /><Route path="/snakes/:id/timeline" element={<SnakeTimeline />} /><Route path="/snakes/:id/edit" element={<SnakeEdit />} /><Route path="/morph-library" element={<MorphLibrary />} /><Route path="/calculator" element={<Calculator />} /><Route path="/sandbox" element={<Sandbox />} /><Route path="/knowledge-base" element={<KnowledgeBase />} /><Route path="/learn" element={<LearningHub />} /><Route path="/learn/topics" element={<LearningHub />} /><Route path="/learn/topic/:id" element={<LearnTopic />} /><Route path="/adaptive-learning" element={<AdaptiveLearningHub />} /><Route path="/challenge" element={<TitansChallenge />} /><Route path="/challenge/topic/:id" element={<ChallengeSession />} /><Route path="/learn/achievements" element={<LearnAchievements />} />
    <Route path="/feeding" element={<FeedingTracker />} /><Route path="/feeding/preparation" element={<FeedingPreparation />} /><Route path="/feeding/:id" element={<FeedingTracker />} /><Route path="/snakes/:id/feeding" element={<FeedingTracker />} /><Route path="/shedding" element={<ShedTracker />} /><Route path="/shedding/:id" element={<ShedTracker />} /><Route path="/snakes/:id/shedding" element={<ShedTracker />} /><Route path="/weights" element={<WeightIndex />} /><Route path="/weights/:id" element={<WeightRecords />} /><Route path="/snakes/:id/weights" element={<WeightRecords />} /><Route path="/health" element={<HealthTracker />} /><Route path="/health/:id" element={<HealthTracker />} /><Route path="/snakes/:id/health" element={<HealthTracker />} /><Route path="/behaviour" element={<BehaviourTracker />} /><Route path="/behaviour/:id" element={<BehaviourTracker />} /><Route path="/snakes/:id/behaviour" element={<BehaviourTracker />} /><Route path="/husbandry" element={<HusbandryCare />} /><Route path="/husbandry/:id" element={<HusbandryCare />} /><Route path="/enclosure-intelligence" element={<EnclosureIntelligence />} /><Route path="/enclosure-intelligence/:id" element={<EnclosureIntelligence />} /><Route path="/snakes/:id/enclosure" element={<EnclosureIntelligence />} /><Route path="/snakes/:id/husbandry" element={<HusbandryCare />} /><Route path="/breeding" element={<BreedingPlanner />} /><Route path="/community" element={<CommunityHub />} /><Route path="/community/create" element={<CommunityCreate />} /><Route path="/community/keeper-meets-breeder" element={<KeeperMeetsBreeder />} /><Route path="/community/keeper-meets-breeder/mentor/:mentorId" element={<MentorshipDestination />} /><Route path="/community/keeper-meets-breeder/request/:mentorId" element={<MentorshipDestination />} /><Route path="/community/keeper-meets-breeder/workspace/:workspaceId" element={<MentorshipDestination />} /><Route path="/community/keeper-meets-breeder/workspace/:workspaceId/milestones" element={<MentorshipDestination />} /><Route path="/community/keeper-meets-breeder/mentor-dashboard" element={<MentorshipDestination />} /><Route path="/community/keeper-meets-breeder/become-a-mentor" element={<MentorshipDestination />} /><Route path="/community/wall-of-titans" element={<WallOfTitans />} /><Route path="/wall-of-titans" element={<Navigate to="/community/wall-of-titans" replace />} /><Route path="/report-bug" element={<ReportIssue />} /><Route path="/report-issue" element={<Navigate to="/report-bug" replace />} /><Route path="/feedback" element={<Feedback />} /><Route path="/my-issue-reports" element={<MyIssueReports />} /><Route path="/conversations" element={<ConversationInbox />} /><Route path="/founder" element={<Founder />} /><Route path="/become-a-titan" element={<BecomeATitan />} />
    <Route path="/creator" element={<CreatorRouteGuard>{profile.role === "admin" ? <CreatorAdmin /> : <CreatorLanding />}</CreatorRouteGuard>} /><Route path="/creator/privacy-data" element={<CreatorRouteGuard><CreatorPrivacyData /></CreatorRouteGuard>} /><Route path="/creator/submissions" element={<CreatorSubmissions />} /><Route path="/creator/morph-terminology" element={<CreatorRouteGuard><MorphTerminologyAudit /></CreatorRouteGuard>} /><Route path="/creator/issues" element={<CreatorRouteGuard><CreatorIssueQueues /></CreatorRouteGuard>} /><Route path="/creator/community" element={<CreatorRouteGuard><CommunityManager /></CreatorRouteGuard>} /><Route path="/creator/conversations" element={<CreatorRouteGuard><ConversationInbox creatorMode /></CreatorRouteGuard>} /><Route path="/creator/mentor-review" element={<CreatorRouteGuard><MentorshipDestination /></CreatorRouteGuard>} /><Route path="/creator/tester" element={<RequireCapability capability="tester"><TesterCentre /></RequireCapability>} /><Route path="/creator/tester/:botId" element={<RequireCapability capability="tester"><TesterCentre /></RequireCapability>} />
    <Route path="/educator" element={<RequireCapability capability="educator"><EducatorDashboard /></RequireCapability>} /><Route path="/login" element={<Navigate to="/" replace />} /><Route path="/account-setup" element={<Navigate to="/" replace />} /><Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes>{consentRequired && <DataPrivacyConsentModal onAccepted={() => { setConsentAccepted(true); setPrivacyConsentVersion(PRIVACY_CONSENT_VERSION); }} />}{!consentRequired && <CreatorTesterInvitation />}</UnitProvider>;
}
export default function AppRouter() { return <BrowserRouter><AppRouterGate /></BrowserRouter>; }
