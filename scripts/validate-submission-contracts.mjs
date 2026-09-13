import fs from 'node:fs';

const router = fs.readFileSync('src/routes/AppRouter.tsx', 'utf8');
const morphLibrary = fs.readFileSync('src/pages/MorphLibrary.tsx', 'utf8');
const creatorSubmissions = fs.readFileSync('src/pages/CreatorSubmissions.tsx', 'utf8');
const creatorReviewStudio = fs.readFileSync('src/pages/CreatorReviewStudio.tsx', 'utf8');
const creatorReviewService = fs.readFileSync('src/services/creatorReviewStudioService.ts', 'utf8');
const creatorApproval = fs.readFileSync('functions/creatorReviewStudio.js', 'utf8');
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
  ['Morph Library image submission records explicit link consent', submissionService.includes('allowMorphLibraryLink') && submissionService.includes('window.confirm')],
  ['Submission service accepts species context', submissionService.includes('speciesId?: string')],
  ['Submission service validates species context', submissionService.includes('findSnakeSpecies(speciesId)')],
  ['Submission service persists speciesId', submissionService.includes('speciesId: species.id')],
  ['Submission service persists speciesName', submissionService.includes('speciesName: species.acceptedScientificName')],
  ['User terminology service accepts species context', userSubmissionService.includes('speciesId?: string')],
  ['User terminology service persists species context', userSubmissionService.includes('speciesName: species.acceptedScientificName')],
  ['Submission type stores speciesId', submissionTypes.includes('speciesId: string')],
  ['Submission type stores Morph Library link consent', submissionTypes.includes('allowMorphLibraryLink?: boolean')],
  ['Species selector reads the canonical species registry', speciesSelector.includes('INITIAL_SNAKE_SPECIES')],
  ['Creator submissions uses the Review Studio', creatorSubmissions.includes('CreatorReviewStudio')],
  ['Creator Review Studio loads photo queue', creatorReviewStudio.includes('getMorphImageSubmissions()')],
  ['Creator Review Studio provides live editable draft state', creatorReviewStudio.includes('setDraft') && creatorReviewStudio.includes('function patch(')],
  ['Creator Review Studio provides canonical morph selection', creatorReviewStudio.includes('getSpeciesVisualMorphs') && creatorReviewStudio.includes('selectMorph')],
  ['Creator Review Studio validates edited approval state', creatorReviewStudio.includes('validateMorphSubmissionForApproval') && creatorReviewStudio.includes('const proposed = { ...selected, ...draft }')],
  ['Creator Review Studio guards approval transition', creatorReviewStudio.includes('canTransitionMorphSubmission')],
  ['Creator Review Studio provides Save Draft', creatorReviewStudio.includes('saveDraft') && creatorReviewStudio.includes('Save Draft')],
  ['Creator Review Studio provides Needs Info', creatorReviewStudio.includes('requestInfo') && creatorReviewStudio.includes('NeedsInfo')],
  ['Creator Review Studio provides Approve & Publish', creatorReviewStudio.includes('Approve & Publish')],
  ['Creator Review Studio keeps Creator notes private', creatorReviewStudio.includes('creatorReviewerNotes')],
  ['Review service calls secure save function', creatorReviewService.includes('saveMorphSubmissionReview') && creatorReviewService.includes('europe-west2')],
  ['Review function is Creator-authorized', creatorApproval.includes('Only the Tiny Titans owner can edit Creator submissions.')],
  ['Review function whitelists editable fields', creatorApproval.includes('EDITABLE_KEYS')],
  ['Review function records field-level audit changes', creatorApproval.includes('changes') && creatorApproval.includes('creatorAudit') && creatorApproval.includes('before: beforeValue')],
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