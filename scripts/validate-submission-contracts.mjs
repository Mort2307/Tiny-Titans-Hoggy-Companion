import fs from 'node:fs';

const router = fs.readFileSync('src/routes/AppRouter.tsx', 'utf8');
const morphLibrary = fs.readFileSync('src/pages/MorphLibrary.tsx', 'utf8');
const creatorSubmissions = fs.readFileSync('src/pages/CreatorSubmissions.tsx', 'utf8');
const submissionService = fs.readFileSync('src/services/morphSubmissionServiceV2.ts', 'utf8');
const userSubmissionService = fs.readFileSync('src/services/morphUserSubmissionService.ts', 'utf8');
const submissionTypes = fs.readFileSync('src/types/morphSubmission.ts', 'utf8');
const speciesSelector = fs.readFileSync('src/components/SpeciesSelector.tsx', 'utf8');

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
  ['Morph Library passes selected speciesId to image submission', /speciesId,\s*morphId:\s*selectedMorph\.geneId/.test(morphLibrary)],
  ['Morph Library uses the canonical SpeciesSelector', /<SpeciesSelector[^>]+morph-image-submission-species/.test(morphLibrary) && /<SpeciesSelector[^>]+user-morph-submission-species/.test(morphLibrary)],
  ['Morph Library gates unmapped species genetics', morphLibrary.includes('isSpeciesGeneticsMapped') && morphLibrary.includes('species-specific genetics catalogue has not been reviewed and mapped yet')],
  ['Morph Library passes selected speciesId to terminology submission', /createUserMorphSubmission\(user\.uid,\s*\{\s*speciesId,/.test(morphLibrary)],
  ['Submission service accepts species context', submissionService.includes('speciesId?: string')],
  ['Submission service validates species context', submissionService.includes('findSnakeSpecies(speciesId)')],
  ['Submission service persists speciesId', submissionService.includes('speciesId: species.id')],
  ['Submission service persists speciesName', submissionService.includes('speciesName: species.acceptedScientificName')],
  ['User terminology service accepts species context', userSubmissionService.includes('speciesId?: string')],
  ['User terminology service persists species context', userSubmissionService.includes('speciesName: species.acceptedScientificName')],
  ['Submission type stores speciesId', submissionTypes.includes('speciesId: string')],
  ['Species selector reads the canonical species registry', speciesSelector.includes('INITIAL_SNAKE_SPECIES')],
  ['Creator submissions loads both photo and terminology queues', creatorSubmissions.includes('Promise.all([getMorphImageSubmissions(), getAllUserMorphSubmissions()])')],
  ['Creator submissions displays species context', creatorSubmissions.includes('displaySpecies(item.speciesId, item.speciesName)')],
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

console.log(`Tiny Titans submission contracts passed: ${requiredRoutes.length} routes and ${requiredContracts.length} species/submission linkage contracts checked.`);