import fs from 'node:fs';

const router = fs.readFileSync('src/routes/AppRouter.tsx', 'utf8');
const morphLibrary = fs.readFileSync('src/pages/MorphLibrary.tsx', 'utf8');
const creatorSubmissions = fs.readFileSync('src/pages/CreatorSubmissions.tsx', 'utf8');
const submissionService = fs.readFileSync('src/services/morphSubmissionServiceV2.ts', 'utf8');

const requiredRoutes = [
  '/morph-library',
  '/morph-library/evidence',
  '/creator/submissions',
  '/creator/morph-library',
  '/creator/morph-terminology',
  '/report-bug',
  '/feedback',
  '/behaviour-observatory/submit',
];

const requiredContracts = [
  ['Morph Library imports submitMorphImageV2', morphLibrary.includes('submitMorphImageV2')],
  ['Morph Library imports createUserMorphSubmission', morphLibrary.includes('createUserMorphSubmission')],
  ['Morph Library passes canonical morphId to image submission', /morphId:\s*selectedMorph\.geneId/.test(morphLibrary)],
  ['Morph Library passes canonical morphName to image submission', /morphName:\s*selectedMorph\.name/.test(morphLibrary)],
  ['Submission service persists morphId', submissionService.includes('morphId,')],
  ['Submission service persists morphName', submissionService.includes('morphName,')],
  ['Creator submissions loads both photo and terminology queues', creatorSubmissions.includes('Promise.all([getMorphImageSubmissions(), getAllUserMorphSubmissions()])')],
  ['Creator submissions validates photo approval', creatorSubmissions.includes('validateMorphSubmissionForApproval')],
  ['Creator submissions guards approval transition', creatorSubmissions.includes('canTransitionMorphSubmission')],
];

const failures = [];
for (const route of requiredRoutes) if (!router.includes(`path=\"${route}\"`)) failures.push(`Submission-related route missing: ${route}`);
for (const [label, ok] of requiredContracts) if (!ok) failures.push(label);
if (!router.includes('CreatorSpeciesPreview')) failures.push('Creator species preview route/component wiring is missing.');

if (failures.length) {
  console.error('TINY TITANS SUBMISSION CONTRACTS FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Tiny Titans submission contracts passed: ${requiredRoutes.length} routes and ${requiredContracts.length} submission/linkage contracts checked.`);
