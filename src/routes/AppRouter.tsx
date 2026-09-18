import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import Layout from "../components/Layout/Layout";
const FamilyHistory = lazy(() => import("../pages/FamilyHistory"));
const Calculator = lazy(() => import("../pages/Calculator"));
const Sandbox = lazy(() => import("../pages/Sandbox"));
import Login from "../pages/Login";
import AccountSetup from "../pages/AccountSetup";
const MyAccount = lazy(() => import("../pages/MyAccount"));
const FamilyJoin = lazy(() => import("../pages/FamilyJoin"));
const FamilyManager = lazy(() => import("../pages/FamilyManager"));
const FamilyReview = lazy(() => import("../pages/FamilyReview"));
const EditProfile = lazy(() => import("../pages/EditProfile"));
const Security = lazy(() => import("../pages/Security"));
const Settings = lazy(() => import("../pages/Settings"));
const DataPrivacy = lazy(() => import("../pages/DataPrivacy"));
const ContributionDashboard = lazy(() => import("../pages/ContributionDashboard"));
import Home from "../pages/Home";
const MySnakes = lazy(() => import("../pages/MySnakes"));
const ReptileRoom = lazy(() => import("../pages/ReptileRoom"));
const SnakeProfile = lazy(() => import("../pages/SnakeProfile"));
const SnakeEdit = lazy(() => import("../pages/SnakeEdit"));
const SnakeMasterRecord = lazy(() => import("../pages/SnakeMasterRecord"));
const SnakeTimeline = lazy(() => import("../pages/SnakeTimeline"));
const FeedingTracker = lazy(() => import("../pages/FeedingTracker"));
const FeedingPreparation = lazy(() => import("../pages/FeedingPreparation"));
const ShedTracker = lazy(() => import("../pages/ShedTrackerIntelligent"));
const HealthTracker = lazy(() => import("../pages/HealthTracker"));
const BehaviourTracker = lazy(() => import("../pages/BehaviourTracker"));
const BehaviourObservatory = lazy(() => import("../pages/BehaviourObservatory"));
const KeeperBehaviourHandbook = lazy(() => import("../pages/KeeperBehaviourHandbook"));
const MakeContribution = lazy(() => import("../pages/MakeContribution"));
const SubmitSpecies = lazy(() => import("../pages/SubmitSpecies"));
const WeightIndex = lazy(() => import("../pages/WeightIndex"));
const WeightRecords = lazy(() => import("../pages/WeightRecords"));
const HusbandryCare = lazy(() => import("../pages/SpeciesSafeHusbandryCare"));
const SpeciesSafeEnclosureIntelligence = lazy(() => import("../pages/SpeciesSafeEnclosureIntelligence"));
const BreedingPlanner = lazy(() => import("../pages/SpeciesSafeBreedingPlanner"));
const BreedingAcademy = lazy(() => import("../pages/BreedingAcademyV2"));
const BreedingReadinessIntelligence = lazy(() => import("../pages/BreedingReadinessIntelligence"));
const BreedingTimeline = lazy(() => import("../pages/BreedingTimeline"));
const BreedingCycleManager = lazy(() => import("../pages/BreedingCycleManager"));
const BreedingProductionManager = lazy(() => import("../pages/BreedingProductionManager"));
const SpeciesAwareMorphLibrary = lazy(() => import("../pages/SpeciesAwareMorphLibrary"));
const SpeciesMorphDetail = lazy(() => import("../pages/SpeciesMorphDetail"));
const SpeciesMorphGallery = lazy(() => import("../pages/SpeciesMorphGallery"));
const MorphEvidenceAudit = lazy(() => import("../pages/MorphEvidenceAudit"));
const MorphTerminologyAudit = lazy(() => import("../pages/MorphTerminologyAudit"));
const ReportIssue = lazy(() => import("../pages/ReportIssue"));
const Feedback = lazy(() => import("../pages/Feedback"));
const MyIssueReports = lazy(() => import("../pages/MyIssueReports"));
const ConversationInbox = lazy(() => import("../pages/ConversationInbox"));
const SubmissionConversationInbox = lazy(() => import("../pages/SubmissionConversationInbox"));
const CommunityHub = lazy(() => import("../pages/CommunityHub"));
const CommunityManager = lazy(() => import("../pages/CommunityManager"));
const FeatureVoting = lazy(() => import("../pages/FeatureVoting"));
const WallOfTitans = lazy(() => import("../pages/WallOfTitans"));
const Founder = lazy(() => import("../pages/Founder"));
const BecomeATitan = lazy(() => import("../pages/BecomeATitan"));
const CreatorAdmin = lazy(() => import("../pages/CreatorAdmin"));
const CreatorMorphLibrary = lazy(() => import("../pages/CreatorMorphLibrary"));
const CreatorPrivacyData = lazy(() => import("../pages/CreatorPrivacyData"));
const CreatorBenchmarkDashboard = lazy(() => import("../pages/CreatorBenchmarkDashboard"));
const CreatorSubmissions = lazy(() => import("../pages/CreatorSubmissions"));
const CreatorReviewStudio = lazy(() => import("../pages/CreatorReviewStudio"));
const CreatorObservationReview = lazy(() => import("../pages/CreatorObservationReview"));
const CreatorIssueQueues = lazy(() => import("../pages/CreatorIssueQueues"));
const CreatorOperationsHub = lazy(() => import("../pages/CreatorOperationsHub"));
const CreatorOperationsSection = lazy(() => import("../pages/CreatorOperationsSection"));
const CreatorAnalytics = lazy(() => import("../pages/CreatorOperationsSection").then((module) => ({ default: module.CreatorAnalytics })));
const CreatorPartnerBranding = lazy(() => import("../pages/CreatorPartnerBranding"));
import PartnerLanding from "../pages/PartnerLanding";
const PartnerLandingEditor = lazy(() => import("../pages/PartnerLandingEditor"));
const EducatorDashboard = lazy(() => import("../pages/EducatorDashboard"));
const TitansChallenge = lazy(() => import("../pages/TitansChallenge"));
const ChallengeSession = lazy(() => import("../pages/ChallengeSession"));
const LearnAchievements = lazy(() => import("../pages/LearnAchievements"));
const LearningHub = lazy(() => import("../pages/LearningHub"));
const KnowledgeBase = lazy(() => import("../pages/KnowledgeBase"));
const LearnTopic = lazy(() => import("../pages/LearnTopic"));
const AdaptiveLearningHub = lazy(() => import("../pages/AdaptiveLearningHub"));
const Personalisation = lazy(() => import("../pages/Personalisation"));
const TesterCentre = lazy(() => import("../pages/TesterCentre"));
const Reminders = lazy(() => import("../pages/Reminders"));
const ReminderTypePage = lazy(() => import("../pages/ReminderTypePage"));
import CreatorRouteGuard from "../components/CreatorRouteGuard";
import RequireCapability from "../components/RequireCapability";
import PaidTierGate from "../components/PaidTierGate";
import CreatorTesterInvitation from "../components/CreatorTesterInvitation";
import DataPrivacyConsentModal, { CONSENT_VERSION } from "../components/DataPrivacyConsentModal";
import { useAuth } from "../context/useAuth";
import { UnitProvider } from "../context/UnitContext";
import { getPrivacyPreferences, PRIVACY_CONSENT_VERSION } from "../services/privacyService";
const KeeperMeetsBreeder = lazy(() => import("../pages/KeeperMeetsBreeder"));
const MentorDirectory = lazy(() => import("../pages/MentorDirectory"));
const MentorProfile = lazy(() => import("../pages/MentorProfile"));
const MentorshipRequest = lazy(() => import("../pages/MentorshipRequest"));
const MentorshipRequestSent = lazy(() => import("../pages/MentorshipRequestSent"));
const MentorshipWorkspace = lazy(() => import("../pages/MentorshipWorkspace"));
const MentorDashboard = lazy(() => import("../pages/MentorDashboard"));
const BecomeAMentor = lazy(() => import("../pages/BecomeAMentor"));
const MentorshipIntelligence = lazy(() => import("../pages/MentorshipIntelligence"));
const MentorshipDestination = lazy(() => import("../pages/MentorshipDestination"));
const MentorApplicationReview = lazy(() => import("../pages/MentorApplicationReview"));
const MyMentees = lazy(() => import("../pages/MyMentees"));
const VivariumShowcase = lazy(() => import("../pages/VivariumShowcase"));
const CreatorVivariumShowcase = lazy(() => import("../pages/CreatorVivariumShowcase"));
const CreatorSpeciesSubmissions = lazy(() => import("../pages/CreatorSpeciesSubmissions"));
const CreatorSpeciesPreview = lazy(() => import("../pages/CreatorSpeciesPreview"));
const TitanIntelligence = lazy(() => import("../pages/TitanIntelligence"));
const TitanFeatureExperience = lazy(() => import("../pages/TitanFeatureExperience"));
const PaidPlans = lazy(() => import("../pages/PaidPlans"));
const AccountBilling = lazy(() => import("../pages/AccountBilling"));
const PaidFeatureWorkspace = lazy(() => import("../pages/PaidFeatureWorkspace"));
const PaidMarketplaceFeature = lazy(() => import("../pages/PaidMarketplaceFeature"));
const PaidSupportFeature = lazy(() => import("../pages/PaidSupportFeature"));
const PaidTimelineFeature = lazy(() => import("../pages/PaidTimelineFeature"));
const Marketplace = lazy(() => import("../pages/Marketplace"));
const RescueAnimals = lazy(() => import("../pages/RescuePages").then((module) => ({ default: module.RescueAnimals })));
const RescueAnimalManage = lazy(() => import("../pages/RescuePages").then((module) => ({ default: module.RescueAnimalManage })));
const RescueAnimalQR = lazy(() => import("../pages/RescuePages").then((module) => ({ default: module.RescueAnimalQR })));
const RescueQRCodeCentre = lazy(() => import("../pages/RescuePages").then((module) => ({ default: module.RescueQRCodeCentre })));
const RescueScanner = lazy(() => import("../pages/RescuePages").then((module) => ({ default: module.RescueScanner })));
const RescueSpeciesIncubator = lazy(() => import("../pages/RescuePages").then((module) => ({ default: module.RescueSpeciesIncubator })));
const RescueOperationalPage = lazy(() => import("../pages/RescuePages").then((module) => ({ default: module.RescueOperationalPage })));
const RescuePeople = lazy(() => import("../pages/RescuePeople"));
import RescuePublicProfile from "../pages/RescuePublicProfile";
const RescueDirectoryProfile = lazy(() => import("../pages/RescueDirectoryProfile"));
const RescueWorkspaceEntry = lazy(() => import("../pages/RescueWorkspaceEntry"));
import RescueAnimalRoute from "../pages/RescueAnimalRoute";
import RescueOperationalGate from "../components/RescueOperationalGate";
const CreatorRescuePilots = lazy(() => import("../pages/CreatorRescuePilots"));
const RescueIntake = lazy(() => import("../pages/RescueOperationsPages").then((module) => ({ default: module.RescueIntake })));
const RescueQuarantine = lazy(() => import("../pages/RescueOperationsPages").then((module) => ({ default: module.RescueQuarantine })));
const RescueMedical = lazy(() => import("../pages/RescueOperationsPages").then((module) => ({ default: module.RescueMedical })));
const RescueTasks = lazy(() => import("../pages/RescueOperationsPages").then((module) => ({ default: module.RescueTasks })));
const RescueFoster = lazy(() => import("../pages/RescueOperationsPages").then((module) => ({ default: module.RescueFoster })));
const RescueTransfers = lazy(() => import("../pages/RescueOperationsPages").then((module) => ({ default: module.RescueTransfers })));
const RescueLocations = lazy(() => import("../pages/RescueOperationsPages").then((module) => ({ default: module.RescueLocations })));
const RescueCompliance = lazy(() => import("../pages/RescueOperationsPages").then((module) => ({ default: module.RescueCompliance })));
const RescuePublicPreview = lazy(() => import("../pages/RescueOperationsPages").then((module) => ({ default: module.RescuePublicPreview })));

const RouteLoadingFallback = () => (
  <div className="page-container" aria-live="polite">
    <div className="welcome-card">
      <h1>Loading Tiny Titans...</h1>
      <p>Opening this area…</p>
    </div>
  </div>
);

function hasLocalPrivacyConsent(userId: string) { try { return window.localStorage.getItem(`tinytitans:privacy-consent:${userId}`) === CONSENT_VERSION; } catch { return false; } }
function AppRouterGate() {
  const location = useLocation(); const { user, profile, loading, profileLoading } = useAuth(); const [consentAccepted, setConsentAccepted] = useState(false); const [privacyConsentVersion, setPrivacyConsentVersion] = useState<string | null>(null);
  const currentDestination = `${location.pathname}${location.search}`; const loginRedirect = `/login?redirect=${encodeURIComponent(currentDestination)}`; const setupRedirect = `/account-setup?redirect=${encodeURIComponent(currentDestination)}`;
  const rescuePublicProfileRoute = <Route path="/rescue/public/:organisationId" element={<RescuePublicProfile/>}/>;
  useEffect(() => { let active=true; setPrivacyConsentVersion(null); if(!user)return()=>{active=false}; void getPrivacyPreferences(user.uid).then(preferences=>{if(active)setPrivacyConsentVersion(preferences.consentVersion||profile?.privacyConsentVersion||profile?.dataCollectionPreferences?.consentVersion||"")}).catch(()=>{if(active)setPrivacyConsentVersion(profile?.privacyConsentVersion||profile?.dataCollectionPreferences?.consentVersion||"")}); return()=>{active=false}; },[user,profile?.privacyConsentVersion,profile?.dataCollectionPreferences?.consentVersion]);
  if(location.pathname.startsWith("/partner/"))return <Suspense fallback={<RouteLoadingFallback />}><Routes><Route path="/partner/:slug" element={<PartnerLanding/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Suspense>;
  if(loading||profileLoading)return <div className="page-container"><div className="welcome-card"><h1>Loading Tiny Titans...</h1></div></div>;
  if(!user)return <Suspense fallback={<RouteLoadingFallback />}><Routes><Route path="/login" element={<Login/>}/>{rescuePublicProfileRoute}<Route path="/rescue/animals/:animalId" element={<RescueAnimalRoute/>}/><Route path="*" element={<Navigate to={loginRedirect} replace/>}/></Routes></Suspense>;
  if(!profile||!profile.setupComplete)return <Suspense fallback={<RouteLoadingFallback />}><Routes><Route path="/account-setup" element={<AccountSetup/>}/>{rescuePublicProfileRoute}<Route path="/rescue/animals/:animalId" element={<RescueAnimalRoute/>}/><Route path="*" element={<Navigate to={setupRedirect} replace/>}/></Routes></Suspense>;
  const consentAlreadyStored=privacyConsentVersion===PRIVACY_CONSENT_VERSION||profile.privacyConsentVersion===CONSENT_VERSION||profile.dataCollectionPreferences?.consentVersion===CONSENT_VERSION||hasLocalPrivacyConsent(user.uid); const consentRequired=privacyConsentVersion!==null&&!consentAccepted&&!consentAlreadyStored;
  return <UnitProvider><Suspense fallback={<RouteLoadingFallback />}><Routes><Route element={<Layout/>}>
    <Route path="/" element={<Home/>}/><Route path="/account" element={<MyAccount/>}/><Route path="/account/partner-landing" element={<PartnerLandingEditor/>}/>
    <Route path="/rescue" element={<RescueWorkspaceEntry/>}/><Route path="/rescue/organisation" element={<RescueDirectoryProfile/>}/><Route path="/rescue/compliance" element={<RescueOperationalGate><RescueCompliance/></RescueOperationalGate>}/><Route path="/rescue/public-preview" element={<RescueOperationalGate><RescuePublicPreview/></RescueOperationalGate>}/><Route path="/rescue/directory-profile" element={<RescueDirectoryProfile/>}/>{rescuePublicProfileRoute}<Route path="/rescue/animals" element={<RescueOperationalGate><RescueAnimals/></RescueOperationalGate>}/><Route path="/rescue/intake" element={<RescueOperationalGate><RescueIntake/></RescueOperationalGate>}/><Route path="/rescue/quarantine" element={<RescueOperationalGate><RescueQuarantine/></RescueOperationalGate>}/><Route path="/rescue/medical" element={<RescueOperationalGate><RescueMedical/></RescueOperationalGate>}/><Route path="/rescue/tasks" element={<RescueOperationalGate><RescueTasks/></RescueOperationalGate>}/><Route path="/rescue/foster" element={<RescueOperationalGate><RescueFoster/></RescueOperationalGate>}/><Route path="/rescue/transfers" element={<RescueOperationalGate><RescueTransfers/></RescueOperationalGate>}/><Route path="/rescue/locations" element={<RescueOperationalGate><RescueLocations/></RescueOperationalGate>}/><Route path="/rescue/animals/:animalId/manage" element={<RescueOperationalGate><RescueAnimalManage/></RescueOperationalGate>}/><Route path="/rescue/animals/:animalId/qr" element={<RescueOperationalGate><RescueAnimalQR/></RescueOperationalGate>}/><Route path="/rescue/qr" element={<RescueOperationalGate><RescueQRCodeCentre/></RescueOperationalGate>}/><Route path="/rescue/scan" element={<RescueOperationalGate><RescueScanner/></RescueOperationalGate>}/><Route path="/rescue/species-incubator" element={<RescueOperationalGate><RescueSpeciesIncubator/></RescueOperationalGate>}/><Route path="/rescue/team" element={<RescuePeople/>}/><Route path="/rescue/reports" element={<RescueOperationalGate><RescueOperationalPage kind="reports"/></RescueOperationalGate>}/><Route path="/rescue/adoption" element={<RescueOperationalGate><RescueOperationalPage kind="adoption"/></RescueOperationalGate>}/><Route path="/rescue/animals/:animalId" element={<RescueAnimalRoute/>}/>
    <Route path="/account/billing" element={<AccountBilling/>}/><Route path="/plans" element={<PaidPlans/>}/><Route path="/marketplace" element={<Marketplace/>}/><Route path="/paid/marketplace" element={<PaidMarketplaceFeature/>}/><Route path="/paid/support" element={<PaidSupportFeature/>}/><Route path="/paid/timeline" element={<PaidTimelineFeature/>}/><Route path="/paid/*" element={<PaidFeatureWorkspace/>}/>
    <Route path="/account/family" element={<FamilyJoin/>}/><Route path="/account/family/manage" element={<FamilyManager/>}/><Route path="/account/family/review" element={<FamilyReview/>}/><Route path="/account/family/history" element={<FamilyHistory/>}/><Route path="/account/family/join" element={<FamilyJoin/>}/><Route path="/account/profile" element={<EditProfile/>}/><Route path="/account/security" element={<Security/>}/><Route path="/account/settings" element={<Settings/>}/><Route path="/account/data-privacy" element={<DataPrivacy/>}/><Route path="/account/intelligence" element={<ContributionDashboard/>}/>
    <Route path="/titan-intelligence" element={<TitanIntelligence/>}/><Route path="/titan-intelligence/feature/:featureId" element={<PaidTierGate entitlement="titan_intelligence"><TitanFeatureExperience/></PaidTierGate>}/><Route path="/account/personalise" element={<Personalisation/>}/><Route path="/reminders" element={<Reminders/>}/><Route path="/reminders/:kind" element={<ReminderTypePage/>}/>
    <Route path="/snakes" element={<MySnakes/>}/><Route path="/reptile-room" element={<ReptileRoom/>}/><Route path="/snakes/new" element={<SnakeEdit/>}/><Route path="/snakes/:id" element={<SnakeProfile/>}/><Route path="/snakes/:id/master-record" element={<SnakeMasterRecord/>}/><Route path="/snakes/:id/timeline" element={<SnakeTimeline/>}/><Route path="/snakes/:id/edit" element={<SnakeEdit/>}/>
    <Route path="/morph-library" element={<SpeciesAwareMorphLibrary/>}/><Route path="/morph-library/:morphId/gallery" element={<SpeciesMorphGallery/>}/><Route path="/morph-library/:morphId" element={<SpeciesMorphDetail/>}/><Route path="/morph-library/evidence" element={<MorphEvidenceAudit/>}/><Route path="/calculator" element={<Calculator/>}/><Route path="/sandbox" element={<Sandbox/>}/><Route path="/knowledge-base" element={<KnowledgeBase/>}/><Route path="/keeper-handbook" element={<KeeperBehaviourHandbook/>}/><Route path="/behaviour-observatory" element={<BehaviourObservatory/>}/><Route path="/behaviour-observatory/submit" element={<BehaviourObservatory/>}/><Route path="/make-contribution" element={<MakeContribution/>}/><Route path="/submit-species" element={<SubmitSpecies/>}/>
    <Route path="/learn" element={<LearningHub/>}/><Route path="/learn/topics" element={<LearningHub/>}/><Route path="/learn/topic/:id" element={<LearnTopic/>}/><Route path="/adaptive-learning" element={<AdaptiveLearningHub/>}/><Route path="/challenge" element={<TitansChallenge/>}/><Route path="/challenge/topic/:id" element={<ChallengeSession/>}/><Route path="/learn/achievements" element={<LearnAchievements/>}/>
    <Route path="/feeding" element={<FeedingTracker/>}/><Route path="/feeding/preparation" element={<FeedingPreparation/>}/><Route path="/feeding/:id" element={<FeedingTracker/>}/><Route path="/snakes/:id/feeding" element={<FeedingTracker/>}/><Route path="/shedding" element={<ShedTracker/>}/><Route path="/shedding/:id" element={<ShedTracker/>}/><Route path="/snakes/:id/shedding" element={<ShedTracker/>}/><Route path="/weights" element={<WeightIndex/>}/><Route path="/weights/:id" element={<WeightRecords/>}/><Route path="/snakes/:id/weights" element={<WeightRecords/>}/><Route path="/health" element={<HealthTracker/>}/><Route path="/health/:id" element={<HealthTracker/>}/><Route path="/snakes/:id/health" element={<HealthTracker/>}/><Route path="/behaviour" element={<BehaviourTracker/>}/><Route path="/behaviour/:id" element={<BehaviourTracker/>}/><Route path="/snakes/:id/behaviour" element={<BehaviourTracker/>}/>
    <Route path="/husbandry" element={<HusbandryCare/>}/><Route path="/husbandry/:id" element={<HusbandryCare/>}/><Route path="/enclosure-intelligence" element={<SpeciesSafeEnclosureIntelligence/>}/><Route path="/enclosure-intelligence/:id" element={<SpeciesSafeEnclosureIntelligence/>}/><Route path="/snakes/:id/enclosure" element={<SpeciesSafeEnclosureIntelligence/>}/><Route path="/breeding" element={<BreedingPlanner/>}/><Route path="/breeding/academy" element={<BreedingAcademy/>}/><Route path="/breeding/readiness" element={<BreedingReadinessIntelligence/>}/><Route path="/breeding/timeline" element={<BreedingTimeline/>}/><Route path="/breeding/cycle" element={<BreedingCycleManager/>}/><Route path="/breeding/production" element={<BreedingProductionManager/>}/>
    <Route path="/community" element={<CommunityHub/>}/><Route path="/community/vivarium-showcase" element={<VivariumShowcase/>}/><Route path="/community/features" element={<FeatureVoting/>}/><Route path="/community/mentorship" element={<KeeperMeetsBreeder/>}/><Route path="/community/mentorship/mentors" element={<MentorDirectory/>}/><Route path="/community/mentorship/mentor/:mentorId" element={<MentorProfile/>}/><Route path="/community/mentorship/request/:mentorId" element={<MentorshipRequest/>}/><Route path="/community/mentorship/request-sent/:requestId" element={<MentorshipRequestSent/>}/><Route path="/community/mentorship/workspace/:workspaceId" element={<MentorshipWorkspace/>}/><Route path="/community/mentorship/my-mentees" element={<MyMentees/>}/><Route path="/community/mentorship/mentor-dashboard" element={<MentorDashboard/>}/><Route path="/community/mentorship/become-a-mentor" element={<BecomeAMentor/>}/><Route path="/community/mentorship/intelligence" element={<MentorshipIntelligence/>}/><Route path="/community/mentorship/legacy/:destination" element={<MentorshipDestination/>}/><Route path="/community/keeper-meets-breeder" element={<Navigate to="/community/mentorship" replace/>}/><Route path="/community/keeper-meets-breeder/mentors" element={<Navigate to="/community/mentorship/mentors" replace/>}/><Route path="/community/keeper-meets-breeder/mentor/:mentorId" element={<Navigate to="/community/mentorship/mentor/:mentorId" replace/>}/><Route path="/community/wall-of-titans" element={<WallOfTitans/>}/><Route path="/wall-of-titans" element={<Navigate to="/community/wall-of-titans" replace/>}/>
    <Route path="/report-bug" element={<ReportIssue/>}/><Route path="/report-issue" element={<Navigate to="/report-bug" replace/>}/><Route path="/feedback" element={<Feedback/>}/><Route path="/my-issue-reports" element={<MyIssueReports/>}/><Route path="/conversations" element={<ConversationInbox/>}/><Route path="/conversations/submissions" element={<SubmissionConversationInbox/>}/><Route path="/founder" element={<Founder/>}/><Route path="/become-a-titan" element={<BecomeATitan/>}/>
    <Route path="/creator" element={<CreatorRouteGuard><CreatorOperationsHub/></CreatorRouteGuard>}/><Route path="/creator/admin" element={<CreatorRouteGuard><CreatorAdmin/></CreatorRouteGuard>}/><Route path="/creator/content" element={<CreatorRouteGuard><CreatorOperationsSection mode="content"/></CreatorRouteGuard>}/><Route path="/creator/review-queues" element={<CreatorRouteGuard><CreatorOperationsSection mode="reviews"/></CreatorRouteGuard>}/><Route path="/creator/intelligence" element={<CreatorRouteGuard><CreatorOperationsSection mode="intelligence"/></CreatorRouteGuard>}/><Route path="/creator/moderation" element={<CreatorRouteGuard><CreatorOperationsSection mode="moderation"/></CreatorRouteGuard>}/><Route path="/creator/configuration" element={<CreatorRouteGuard><CreatorOperationsSection mode="configuration"/></CreatorRouteGuard>}/><Route path="/creator/analytics" element={<CreatorRouteGuard><CreatorAnalytics/></CreatorRouteGuard>}/><Route path="/creator/qa" element={<CreatorRouteGuard><CreatorOperationsSection mode="qa"/></CreatorRouteGuard>}/><Route path="/creator/partner-branding" element={<CreatorRouteGuard><CreatorPartnerBranding/></CreatorRouteGuard>}/><Route path="/creator/partner-branding/edit" element={<CreatorRouteGuard><PartnerLandingEditor creatorMode/></CreatorRouteGuard>}/><Route path="/creator/rescue-pilots" element={<CreatorRouteGuard><CreatorRescuePilots/></CreatorRouteGuard>}/>
    <Route path="/creator/species-preview" element={<CreatorRouteGuard><CreatorSpeciesPreview/></CreatorRouteGuard>}/><Route path="/creator/morph-library" element={<CreatorRouteGuard><CreatorMorphLibrary/></CreatorRouteGuard>}/><Route path="/creator/privacy-data" element={<CreatorRouteGuard><CreatorPrivacyData/></CreatorRouteGuard>}/><Route path="/creator/benchmarks" element={<CreatorRouteGuard><CreatorBenchmarkDashboard/></CreatorRouteGuard>}/><Route path="/creator/submissions" element={<CreatorRouteGuard><CreatorSubmissions/></CreatorRouteGuard>}/><Route path="/creator/review-studio" element={<CreatorRouteGuard><CreatorReviewStudio/></CreatorRouteGuard>}/><Route path="/creator/species-submissions" element={<CreatorRouteGuard><CreatorSpeciesSubmissions/></CreatorRouteGuard>}/><Route path="/creator/vivarium-showcase" element={<CreatorRouteGuard><CreatorVivariumShowcase/></CreatorRouteGuard>}/><Route path="/creator/observations" element={<CreatorRouteGuard><CreatorObservationReview/></CreatorRouteGuard>}/><Route path="/creator/morph-terminology" element={<CreatorRouteGuard><MorphTerminologyAudit/></CreatorRouteGuard>}/><Route path="/creator/issues" element={<CreatorRouteGuard><CreatorIssueQueues/></CreatorRouteGuard>}/><Route path="/creator/community" element={<CreatorRouteGuard><CommunityManager/></CreatorRouteGuard>}/><Route path="/creator/conversations" element={<CreatorRouteGuard><ConversationInbox creatorMode/></CreatorRouteGuard>}/><Route path="/creator/submission-conversations" element={<CreatorRouteGuard><SubmissionConversationInbox creatorMode/></CreatorRouteGuard>}/><Route path="/creator/mentor-review" element={<CreatorRouteGuard><MentorApplicationReview/></CreatorRouteGuard>}/><Route path="/creator/tester" element={<RequireCapability capability="tester"><TesterCentre/></RequireCapability>}/><Route path="/creator/tester/paid-tiers" element={<RequireCapability capability="tester"><TesterCentre/></RequireCapability>}/><Route path="/creator/tester/:botId" element={<RequireCapability capability="tester"><TesterCentre/></RequireCapability>}/><Route path="/educator" element={<RequireCapability capability="educator"><EducatorDashboard/></RequireCapability>}/>
    <Route path="/login" element={<Navigate to="/" replace/>}/><Route path="/account-setup" element={<Navigate to="/" replace/>}/><Route path="*" element={<Navigate to="/" replace/>}/>
  </Route></Routes></Suspense>{consentRequired&&<DataPrivacyConsentModal onAccepted={()=>{setConsentAccepted(true);setPrivacyConsentVersion(PRIVACY_CONSENT_VERSION)}}/>}{!consentRequired&&<CreatorTesterInvitation/>}</UnitProvider>;
}
export default function AppRouter(){return <BrowserRouter><AppRouterGate/></BrowserRouter>}
