import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense, useEffect, useState } from 'react';
import Layout from '../components/Layout/Layout';
import {
  Calculator, Sandbox, Login, AccountSetup, MyAccount, FamilyJoin, FamilyManager, FamilyReview, FamilyHistory,
  EditProfile, Security, Settings, DataPrivacy, ContributionDashboard, Home, MySnakes, SnakeProfile, SnakeEdit,
  SnakeMasterRecord, SnakeTimeline, FeedingTracker, FeedingPreparation, ShedTracker, HealthTracker, BehaviourTracker,
  BehaviourObservatory, KeeperBehaviourHandbook, MakeContribution, WeightIndex, WeightRecords, HusbandryCare,
  EnclosureIntelligence, BreedingPlanner, BreedingAcademy, BreedingReadinessIntelligence, BreedingTimeline,
  BreedingCycleManager, BreedingProductionManager, MorphLibrary, MorphEvidenceAudit, MorphTerminologyAudit,
  ReportIssue, Feedback, MyIssueReports, ConversationInbox, CommunityHub, CommunityManager, FeatureVoting,
  WallOfTitans, Founder, BecomeATitan, CreatorAdmin, CreatorLanding, CreatorMorphLibrary, CreatorPrivacyData,
  CreatorBenchmarkDashboard, CreatorSubmissions, CreatorObservationReview, CreatorIssueQueues, EducatorDashboard,
  TitansChallenge, ChallengeSession, LearnAchievements, LearningHub, KnowledgeBase, LearnTopic, AdaptiveLearningHub,
  Personalisation, TesterCentre, Reminders, ReminderTypePage, KeeperMeetsBreeder, MentorDirectory, MentorProfile,
  MentorshipRequest, MentorshipRequestSent, MentorshipWorkspace, MentorDashboard, BecomeAMentor,
  MentorshipIntelligence, MentorshipDestination, MentorApplicationReview, MyMentees,
} from './lazyPages';
import CreatorRouteGuard from '../components/CreatorRouteGuard';
import RequireCapability from '../components/RequireCapability';
import CreatorTesterInvitation from '../components/CreatorTesterInvitation';
import DataPrivacyConsentModal, { CONSENT_VERSION } from '../components/DataPrivacyConsentModal';
import { useAuth } from '../context/useAuth';
import { UnitProvider } from '../context/UnitContext';
import { getPrivacyPreferences, PRIVACY_CONSENT_VERSION } from '../services/privacyService';

function hasLocalPrivacyConsent(userId: string) {
  try { return window.localStorage.getItem(`tinytitans:privacy-consent:${userId}`) === CONSENT_VERSION; }
  catch { return false; }
}

function PageFallback() {
  return <main className="page-container" aria-live="polite"><section className="welcome-card"><p aria-hidden="true">🐍</p><h1>Loading Tiny Titans…</h1><p>Preparing that bit of the app without loading the whole zoo at once.</p></section></main>;
}

function AppRouterGate() {
  const location = useLocation();
  const { user, profile, loading, profileLoading } = useAuth();
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [privacyConsentVersion, setPrivacyConsentVersion] = useState<string | null>(null);
  const currentDestination = `${location.pathname}${location.search}`;
  const loginRedirect = `/login?redirect=${encodeURIComponent(currentDestination)}`;
  const setupRedirect = `/account-setup?redirect=${encodeURIComponent(currentDestination)}`;

  useEffect(() => {
    let active = true;
    setPrivacyConsentVersion(null);
    if (!user) return () => { active = false; };
    void getPrivacyPreferences(user.uid).then((p) => {
      if (active) setPrivacyConsentVersion(p.consentVersion || profile?.privacyConsentVersion || profile?.dataCollectionPreferences?.consentVersion || '');
    }).catch(() => {
      if (active) setPrivacyConsentVersion(profile?.privacyConsentVersion || profile?.dataCollectionPreferences?.consentVersion || '');
    });
    return () => { active = false; };
  }, [user, profile?.privacyConsentVersion, profile?.dataCollectionPreferences?.consentVersion]);

  if (loading || profileLoading || (user && privacyConsentVersion === null)) return <PageFallback />;
  if (!user) return <Suspense fallback={<PageFallback />}><Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to={loginRedirect} replace />} /></Routes></Suspense>;
  if (!profile || !profile.setupComplete) return <Suspense fallback={<PageFallback />}><Routes><Route path="/account-setup" element={<AccountSetup />} /><Route path="*" element={<Navigate to={setupRedirect} replace />} /></Routes></Suspense>;

  const consentAlreadyStored = privacyConsentVersion === PRIVACY_CONSENT_VERSION || profile.privacyConsentVersion === CONSENT_VERSION || profile.dataCollectionPreferences?.consentVersion === CONSENT_VERSION || hasLocalPrivacyConsent(user.uid);
  const consentRequired = !consentAccepted && !consentAlreadyStored;

  return <UnitProvider><Suspense fallback={<PageFallback />}><Routes><Route element={<Layout />}>
    <Route path="/" element={<Home />} />
    <Route path="/account" element={<MyAccount />} /><Route path="/account/family" element={<FamilyJoin />} /><Route path="/account/family/manage" element={<FamilyManager />} /><Route path="/account/family/review" element={<FamilyReview />} /><Route path="/account/family/history" element={<FamilyHistory />} /><Route path="/account/family/join" element={<FamilyJoin />} /><Route path="/account/profile" element={<EditProfile />} /><Route path="/account/security" element={<Security />} /><Route path="/account/settings" element={<Settings />} /><Route path="/account/data-privacy" element={<DataPrivacy />} /><Route path="/account/intelligence" element={<ContributionDashboard />} /><Route path="/account/personalise" element={<Personalisation />} /><Route path="/reminders" element={<Reminders />} /><Route path="/reminders/:kind" element={<ReminderTypePage />} />
    <Route path="/snakes" element={<MySnakes />} /><Route path="/reptile-room" element={<Navigate to="/" replace />} /><Route path="/reptile-room/vivarium/:id" element={<Navigate to="/" replace />} /><Route path="/snakes/new" element={<SnakeEdit />} /><Route path="/snakes/:id" element={<SnakeProfile />} /><Route path="/snakes/:id/master-record" element={<SnakeMasterRecord />} /><Route path="/snakes/:id/timeline" element={<SnakeTimeline />} /><Route path="/snakes/:id/edit" element={<SnakeEdit />} /><Route path="/morph-library" element={<MorphLibrary />} /><Route path="/morph-library/evidence" element={<MorphEvidenceAudit />} /><Route path="/calculator" element={<Calculator />} /><Route path="/sandbox" element={<Sandbox />} /><Route path="/knowledge-base" element={<KnowledgeBase />} /><Route path="/keeper-handbook" element={<KeeperBehaviourHandbook />} /><Route path="/behaviour-observatory" element={<BehaviourObservatory />} /><Route path="/behaviour-observatory/submit" element={<BehaviourObservatory />} /><Route path="/make-contribution" element={<MakeContribution />} /><Route path="/learn" element={<LearningHub />} /><Route path="/learn/topics" element={<LearningHub />} /><Route path="/learn/topic/:id" element={<LearnTopic />} /><Route path="/adaptive-learning" element={<AdaptiveLearningHub />} /><Route path="/challenge" element={<TitansChallenge />} /><Route path="/challenge/topic/:id" element={<ChallengeSession />} /><Route path="/learn/achievements" element={<LearnAchievements />} />
    <Route path="/feeding" element={<FeedingTracker />} /><Route path="/feeding/preparation" element={<FeedingPreparation />} /><Route path="/feeding/:id" element={<FeedingTracker />} /><Route path="/snakes/:id/feeding" element={<FeedingTracker />} /><Route path="/shedding" element={<ShedTracker />} /><Route path="/shedding/:id" element={<ShedTracker />} /><Route path="/snakes/:id/shedding" element={<ShedTracker />} /><Route path="/weights" element={<WeightIndex />} /><Route path="/weights/:id" element={<WeightRecords />} /><Route path="/snakes/:id/weights" element={<WeightRecords />} /><Route path="/health" element={<HealthTracker />} /><Route path="/health/:id" element={<HealthTracker />} /><Route path="/snakes/:id/health" element={<HealthTracker />} /><Route path="/behaviour" element={<BehaviourTracker />} /><Route path="/behaviour/:id" element={<BehaviourTracker />} /><Route path="/snakes/:id/behaviour" element={<BehaviourTracker />} /><Route path="/husbandry" element={<HusbandryCare />} /><Route path="/husbandry/:id" element={<HusbandryCare />} /><Route path="/enclosure-intelligence" element={<EnclosureIntelligence />} /><Route path="/enclosure-intelligence/:id" element={<EnclosureIntelligence />} /><Route path="/snakes/:id/enclosure" element={<EnclosureIntelligence />} />
    <Route path="/breeding" element={<BreedingPlanner />} /><Route path="/breeding/academy" element={<BreedingAcademy />} /><Route path="/breeding/readiness" element={<BreedingReadinessIntelligence />} /><Route path="/breeding/timeline" element={<BreedingTimeline />} /><Route path="/breeding/cycle" element={<BreedingCycleManager />} /><Route path="/breeding/production" element={<BreedingProductionManager />} />
    <Route path="/community" element={<CommunityHub />} /><Route path="/community/features" element={<FeatureVoting />} /><Route path="/community/mentorship" element={<KeeperMeetsBreeder />} /><Route path="/community/mentorship/mentors" element={<MentorDirectory />} /><Route path="/community/mentorship/mentor/:mentorId" element={<MentorProfile />} /><Route path="/community/mentorship/request/:mentorId" element={<MentorshipRequest />} /><Route path="/community/mentorship/request-sent/:requestId" element={<MentorshipRequestSent />} /><Route path="/community/mentorship/workspace/:workspaceId" element={<MentorshipWorkspace />} /><Route path="/community/mentorship/my-mentees" element={<MyMentees />} /><Route path="/community/mentorship/mentor-dashboard" element={<MentorDashboard />} /><Route path="/community/mentorship/become-a-mentor" element={<BecomeAMentor />} /><Route path="/community/mentorship/intelligence" element={<MentorshipIntelligence />} /><Route path="/community/mentorship/legacy/:destination" element={<MentorshipDestination />} /><Route path="/community/keeper-meets-breeder" element={<Navigate to="/community/mentorship" replace />} /><Route path="/community/keeper-meets-breeder/mentors" element={<Navigate to="/community/mentorship/mentors" replace />} /><Route path="/community/keeper-meets-breeder/mentor/:mentorId" element={<Navigate to="/community/mentorship/mentor/:mentorId" replace />} /><Route path="/community/wall-of-titans" element={<WallOfTitans />} /><Route path="/wall-of-titans" element={<Navigate to="/community/wall-of-titans" replace />} /><Route path="/report-bug" element={<ReportIssue />} /><Route path="/report-issue" element={<Navigate to="/report-bug" replace />} /><Route path="/feedback" element={<Feedback />} /><Route path="/my-issue-reports" element={<MyIssueReports />} /><Route path="/conversations" element={<ConversationInbox />} /><Route path="/founder" element={<Founder />} /><Route path="/become-a-titan" element={<BecomeATitan />} />
    <Route path="/creator" element={<CreatorRouteGuard>{profile.role === 'admin' ? <CreatorAdmin /> : <CreatorLanding />}</CreatorRouteGuard>} /><Route path="/creator/morph-library" element={<CreatorRouteGuard><CreatorMorphLibrary /></CreatorRouteGuard>} /><Route path="/creator/privacy-data" element={<CreatorRouteGuard><CreatorPrivacyData /></CreatorRouteGuard>} /><Route path="/creator/benchmarks" element={<CreatorRouteGuard><CreatorBenchmarkDashboard /></CreatorRouteGuard>} /><Route path="/creator/submissions" element={<CreatorRouteGuard><CreatorSubmissions /></CreatorRouteGuard>} /><Route path="/creator/observations" element={<CreatorRouteGuard><CreatorObservationReview /></CreatorRouteGuard>} /><Route path="/creator/morph-terminology" element={<CreatorRouteGuard><MorphTerminologyAudit /></CreatorRouteGuard>} /><Route path="/creator/issues" element={<CreatorRouteGuard><CreatorIssueQueues /></CreatorRouteGuard>} /><Route path="/creator/community" element={<CreatorRouteGuard><CommunityManager /></CreatorRouteGuard>} /><Route path="/creator/conversations" element={<CreatorRouteGuard><ConversationInbox creatorMode /></CreatorRouteGuard>} /><Route path="/creator/mentor-review" element={<CreatorRouteGuard><MentorApplicationReview /></CreatorRouteGuard>} /><Route path="/creator/tester" element={<RequireCapability capability="tester"><TesterCentre /></RequireCapability>} /><Route path="/creator/tester/:botId" element={<RequireCapability capability="tester"><TesterCentre /></RequireCapability>} /><Route path="/educator" element={<RequireCapability capability="educator"><EducatorDashboard /></RequireCapability>} />
    <Route path="/login" element={<Navigate to="/" replace />} /><Route path="/account-setup" element={<Navigate to="/" replace />} /><Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes></Suspense>{consentRequired && <DataPrivacyConsentModal onAccepted={() => { setConsentAccepted(true); setPrivacyConsentVersion(PRIVACY_CONSENT_VERSION); }} />}{!consentRequired && <CreatorTesterInvitation />}</UnitProvider>;
}

export default function AppRouter() { return <BrowserRouter><AppRouterGate /></BrowserRouter>; }
