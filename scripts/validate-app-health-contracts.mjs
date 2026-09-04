import fs from 'node:fs';

const router = fs.readFileSync('src/routes/AppRouter.tsx', 'utf8');
const lazyPagesPath = 'src/routes/lazyPages.tsx';
const lazyPages = fs.existsSync(lazyPagesPath) ? fs.readFileSync(lazyPagesPath, 'utf8') : '';
const routeModuleSource = `${router}\n${lazyPages}`;
const requiredPages = [
  'Home', 'MySnakes', 'SnakeProfile', 'SnakeTimeline', 'FeedingTracker', 'ShedTracker',
  'HealthTracker', 'BehaviourTracker', 'MorphLibrary', 'MorphEvidenceAudit', 'Calculator',
  'BreedingPlanner', 'BreedingReadinessIntelligence', 'CommunityHub', 'WallOfTitans',
  'LearningHub', 'AdaptiveLearningHub', 'LearnAchievements', 'DataPrivacy', 'FamilyManager',
  'FamilyReview', 'FamilyHistory',
];
const requiredRoutes = [
  '/', '/snakes', '/morph-library', '/morph-library/evidence', '/calculator', '/feeding',
  '/shedding', '/weights', '/health', '/behaviour', '/husbandry', '/breeding', '/community',
  '/learn', '/adaptive-learning', '/learn/achievements', '/account/data-privacy', '/account/family',
  '/account/family/manage', '/account/family/review', '/account/family/history',
];
const failures = [];
for (const page of requiredPages) {
  if (!fs.existsSync(`src/pages/${page}.tsx`)) failures.push(`Missing required page file: ${page}.tsx`);
  if (!routeModuleSource.includes(`../pages/${page}`)) failures.push(`Route module does not load required page: ${page}`);
}
for (const route of requiredRoutes) {
  if (!router.includes(`path="${route}"`)) failures.push(`Required route missing: ${route}`);
}
if (!router.includes('path="*"')) failures.push('Router is missing its fallback route.');
if (failures.length) {
  console.error('APP HEALTH CONTRACT REPORT');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`App health contract passed: ${requiredPages.length} core page contracts and ${requiredRoutes.length} critical route contracts checked.`);
console.log('Note: this is structural evidence; browser journey testing remains separate.');
