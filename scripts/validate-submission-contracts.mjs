import fs from 'node:fs';

const router = fs.readFileSync('src/routes/AuthenticatedRoutes.tsx', 'utf8');
const morphLibrary = fs.readFileSync('src/pages/MorphLibrary.tsx', 'utf8');
const morphLibraryHook = fs.readFileSync('src/hooks/useMorphLibrary.ts', 'utf8');
const morphImageSubmission = fs.readFileSync('src/hooks/useMorphImageSubmission.ts', 'utf8');
const newMorphSubmission = fs.readFileSync('src/hooks/useNewMorphSubmission.ts', 'utf8');
const morphImageDialog = fs.readFileSync('src/components/morph-library/MorphImageSubmissionDialog.tsx', 'utf8');
const newMorphDialog = fs.readFileSync('src/components/morph-library/NewMorphSubmissionDialog.tsx', 'utf8');
const speciesMorphImageDialog = fs.readFileSync('src/pages/SpeciesMorphImageSubmissionDialog.tsx', 'utf8');
const communityVariationMediaDialog = fs.readFileSync('src/components/morph-library/CommunityVariationImageSubmissionDialog.tsx', 'utf8');
const creatorVariationReview = fs.readFileSync('src/components/CreatorVariationCardReview.tsx', 'utf8');
const creatorVariationService = fs.readFileSync('src/services/creatorUserMorphSubmissionService.ts', 'utf8');
const variationCardService = fs.readFileSync('src/services/communityVariationCardService.ts', 'utf8');
const firestoreRules = fs.readFileSync('firestore.rules', 'utf8');
const creatorApprovalFunction = fs.readFileSync('functions/creatorApproval.js', 'utf8');
const creatorSubmissions = fs.readFileSync('src/pages/CreatorSubmissions.tsx', 'utf8');
const creatorReviewStudio = fs.readFileSync('src/pages/CreatorReviewStudio.tsx', 'utf8');
const creatorReviewHook = fs.readFileSync('src/hooks/useCreatorReviewStudio.ts', 'utf8');
const creatorReviewLib = fs.readFileSync('src/lib/creatorReviewStudio.ts', 'utf8');
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
  ['Morph Library submission flow calls submitMorphImageV2 through its controller', morphImageSubmission.includes('submitMorphImageV2')],
  ['Morph Library terminology flow calls createUserMorphSubmission through its controller', newMorphSubmission.includes('createUserMorphSubmission')],
  ['Morph Library passes canonical morphId to image submission', /morphId:selectedMorph\.geneId/.test(morphImageSubmission)],
  ['Morph Library passes canonical morphName to image submission', /morphName:selectedMorph\.name/.test(morphImageSubmission)],
  ['Morph Library passes selected speciesId to image submission', /submitMorphImageV2\(\{speciesId,morphId:selectedMorph\.geneId/.test(morphImageSubmission)],
  ['Universal variation proposals use UniversalSpeciesPicker', newMorphDialog.includes('UniversalSpeciesPicker')],
  ['Universal species image submissions use UniversalSpeciesPicker', speciesMorphImageDialog.includes('UniversalSpeciesPicker')],
  ['Hognose canonical image submission is hard-locked to Western Hognose', morphImageSubmission.includes('const speciesId="heterodon-nasicus"') && morphImageSubmission.includes('selectedSpecies.id!=="heterodon-nasicus"') && !morphImageDialog.includes('SpeciesSelector')],
  ['Morph Library passes selected speciesId to terminology submission', /createUserMorphSubmission\(user\.uid,\{speciesId,/.test(newMorphSubmission)],
  ['Morph Library image submission records explicit link consent', submissionService.includes('allowMorphLibraryLink') && submissionService.includes('window.confirm')],
  ['Submission service accepts species context', submissionService.includes('speciesId?: string')],
  ['Submission service validates universal species context', submissionService.includes('findUniversalSpecies(speciesId)')],
  ['Submission service persists speciesId', submissionService.includes('speciesId: species.id')],
  ['Submission service persists speciesName', submissionService.includes('speciesName: species.acceptedScientificName')],
  ['User terminology service accepts species context', userSubmissionService.includes('speciesId?: string')],
  ['User terminology service persists species context', userSubmissionService.includes('speciesName: species.acceptedScientificName')],
  ['Submission type stores speciesId', submissionTypes.includes('speciesId: string')],
  ['Submission type stores Morph Library link consent', submissionTypes.includes('allowMorphLibraryLink?: boolean')],
  ['Legacy Hognose selector remains available for Hognose-only surfaces', speciesSelector.includes('INITIAL_SNAKE_SPECIES')],
  ['Universal variation proposal service validates against the universal registry', userSubmissionService.includes('findUniversalSpecies')],
  ['Variation proposals use the moderated top-level queue', userSubmissionService.includes('variationCardSubmissions')],
  ['Variation proposal queue is Creator-moderated in Firestore', firestoreRules.includes('match /variationCardSubmissions/{submissionId}') && firestoreRules.includes('allow update, delete: if isCreator()')],
  ['Approved community variation cards are Creator-published only', firestoreRules.includes('match /approvedMorphVariations/{variationId}') && creatorVariationService.includes('calculatorEligible: false')],
  ['Approved variation cards are readable by the species library', variationCardService.includes('approvedMorphVariations')],
  ['Community variation cards accept user-supplied media', communityVariationMediaDialog.includes('submitCommunityVariationImageV2') && submissionService.includes('submitCommunityVariationImageV2')],
  ['Community variation media is verified server-side before publication', creatorApprovalFunction.includes('approvedMorphVariations') && creatorApprovalFunction.includes('variationCardId')],
  ['Creator submissions includes variation-card review', creatorSubmissions.includes('CreatorVariationCardReview') && creatorVariationReview.includes('reviewUserMorphSubmission')],
  ['Creator submissions uses the Review Studio', creatorSubmissions.includes('CreatorReviewStudio')],
  ['Creator Review Studio loads photo queue through its controller', creatorReviewHook.includes('getMorphImageSubmissions')],
  ['Creator Review Studio provides live editable draft state through its controller', creatorReviewHook.includes('setDraft') && creatorReviewHook.includes('function patch(')],
  ['Creator Review Studio provides canonical morph selection through its controller', creatorReviewHook.includes('getSpeciesVisualMorphs') && creatorReviewHook.includes('function selectMorph(')],
  ['Creator Review Studio validates edited approval state through its controller', creatorReviewHook.includes('validateMorphSubmissionForApproval') && creatorReviewHook.includes('const proposed={...selected,...draft}')],
  ['Creator Review Studio guards approval transition', creatorReviewHook.includes('canTransitionMorphSubmission')],
  ['Creator Review Studio provides Save Draft', creatorReviewHook.includes('saveDraft') && creatorReviewStudio.includes('Save Draft')],
  ['Creator Review Studio provides Needs Info', creatorReviewHook.includes('requestInfo') && creatorReviewStudio.includes('Request Info')],
  ['Creator Review Studio provides Approve & Publish', creatorReviewHook.includes('approve') && creatorReviewStudio.includes('Approve & Publish')],
  ['Creator Review Studio keeps Creator notes private', creatorReviewStudio.includes('creatorReviewerNotes') && creatorReviewHook.includes('creatorReviewerNotes')],
  ['Creator Review Studio uses the shared review-state helper', creatorReviewLib.includes('ReviewDraft') && creatorReviewHook.includes('toDraft')],
  ['Review service calls secure save function', creatorReviewService.includes('saveMorphSubmissionReview') && creatorReviewService.includes('europe-west2')],
  ['Review function is Creator-authorized', creatorApproval.includes('Only the Tiny Titans owner can edit Creator submissions.')],
  ['Review function whitelists editable fields', creatorApproval.includes('EDITABLE_KEYS')],
  ['Review function records field-level audit changes', creatorApproval.includes('changes') && creatorApproval.includes('creatorAudit') && creatorApproval.includes('before: beforeValue')],
];

const failures = [];
for (const route of requiredRoutes) if (!router.includes(`path=\"${route}\"`)) failures.push(`Submission-related route missing: ${route}`);
for (const [label, ok] of requiredContracts) if (!ok) failures.push(label);
if (!router.includes('path=\"/creator/species-preview\"') || !router.includes('CreatorSpeciesPreview')) failures.push('Creator species preview route/component wiring is missing.');

if (failures.length) {
  console.error('TINY TITANS SUBMISSION CONTRACTS FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Tiny Titans submission contracts passed: ${requiredRoutes.length} routes and ${requiredContracts.length} species/submission linkage contracts checked.`);