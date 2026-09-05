import { auth, db, storage } from '../firebase/config';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { findSnakeSpecies } from '../data/species/speciesRegistry';
import { getSpeciesVisualMorphs } from '../data/species/speciesGenetics';

export type MorphCreditMode = 'name' | 'social' | 'anonymous';
export type MorphMediaKind = 'image' | 'video';

export interface MorphSubmissionInputV2 {
  speciesId?: string; morphId: string; morphName: string; description: string; observedTraits: string; proofDetails: string; proofReference?: string;
  image: File; factualAccuracyConfirmed: boolean; photoRequirementsConfirmed: boolean; allowMorphLibraryLink?: boolean; creditMode: MorphCreditMode; creditName?: string; creditSocial?: string;
}

function validateText(value: string, field: string, required = false): string { const trimmed = value.trim(); if (required && !trimmed) throw new Error(`${field} is required.`); if (trimmed.length > 4000) throw new Error(`${field} is too long.`); return trimmed; }
function slugify(value: string): string { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
function mediaKind(file: File): MorphMediaKind { if (file.type.startsWith('image/')) return 'image'; if (['video/mp4', 'video/webm', 'video/quicktime'].includes(file.type.toLowerCase())) return 'video'; throw new Error('Please choose a JPG, PNG, WebP image or MP4, WebM or MOV video.'); }

async function prepareImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file); const maxDimension = 1800; const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d'); if (!context) throw new Error('Unable to prepare the image.');
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high'; context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to compress the image.')), 'image/jpeg', 0.84));
  } catch (error) { throw new Error('Tiny Titans could not process this image. Please choose a JPG, PNG or WebP image.', { cause: error }); }
}

export async function submitMorphImageV2(input: MorphSubmissionInputV2): Promise<{ submissionId: string }> {
  const user = auth.currentUser; if (!user) throw new Error('You must be signed in to submit morph media.');
  const speciesId = input.speciesId?.trim() || 'heterodon-nasicus'; const species = findSnakeSpecies(speciesId); if (!species) throw new Error('Please select a recognised snake species before submitting morph media.');
  const morphId = input.morphId.trim(); const morphName = input.morphName.trim(); if (!morphId || !morphName) throw new Error('Please select a morph from the Morph Library.');
  const canonicalMorph = getSpeciesVisualMorphs(species.id).find((entry) => entry.geneId === morphId || entry.name.trim().toLowerCase() === morphName.toLowerCase());
  if (!canonicalMorph) throw new Error(`“${morphName}” is not a recognised Morph Library entry for ${species.commonNames[0] ?? species.acceptedScientificName}.`);

  const description = validateText(input.description, 'Animal description', true); const observedTraits = validateText(input.observedTraits, 'Known genetic information'); const proofDetails = validateText(input.proofDetails, 'Evidence / proof', true); const proofReference = validateText(input.proofReference ?? '', 'Proof reference');
  if (!input.image) throw new Error('Please add an image or video.'); const kind = mediaKind(input.image); const maxBytes = kind === 'video' ? 25 * 1024 * 1024 : 8 * 1024 * 1024;
  if (input.image.size > maxBytes) throw new Error(kind === 'video' ? 'Video attachments must be 25 MB or smaller.' : 'Image attachments must be 8 MB or smaller.');
  if (!input.factualAccuracyConfirmed) throw new Error('Please confirm the morph identification is supported by factual evidence.');
  if (!input.photoRequirementsConfirmed) throw new Error('Please confirm the submitted media meets the Morph Gallery requirements.');
  if (input.creditMode === 'name' && !input.creditName?.trim()) throw new Error('Please enter the name you want displayed, or choose another credit option.');
  if (input.creditMode === 'social' && !input.creditSocial?.trim()) throw new Error('Please enter the social handle/link you want displayed, or choose another credit option.');

  const creditName = validateText(input.creditName ?? '', 'Credit name'); const creditSocial = validateText(input.creditSocial ?? '', 'Credit social');
  const allowMorphLibraryLink = input.allowMorphLibraryLink ?? (typeof window !== 'undefined' && window.confirm(`May Tiny Titans link this approved ${kind} to the ${canonicalMorph.name} entry in the ${species.commonNames[0] ?? species.acceptedScientificName} Morph Library and display it in the Morph Gallery?\n\nChoose Cancel to keep the media out of the public Morph Library.`));
  const payload = kind === 'image' ? await prepareImage(input.image) : input.image; const extension = kind === 'image' ? 'jpg' : input.image.type === 'video/webm' ? 'webm' : input.image.type === 'video/quicktime' ? 'mov' : 'mp4';
  const submissionRef = doc(collection(db, 'morphImageSubmissions')); const storagePath = `morph-submissions/${user.uid}/${submissionRef.id}/${slugify(canonicalMorph.name) || 'morph'}.${extension}`; const storageRef = ref(storage, storagePath); let uploaded = false;
  try {
    await uploadBytes(storageRef, payload, { contentType: kind === 'image' ? 'image/jpeg' : input.image.type, customMetadata: { speciesId: species.id, morphId: canonicalMorph.geneId, contributorUid: user.uid, mediaType: kind } }); uploaded = true; const imageUrl = await getDownloadURL(storageRef);
    await setDoc(submissionRef, { userId: user.uid, speciesId: species.id, speciesName: species.acceptedScientificName, morphId: canonicalMorph.geneId, morphName: canonicalMorph.name, description, observedTraits, proofDetails, proofReference: proofReference || null, photoRequirementsConfirmed: true, factualAccuracyConfirmed: true, allowMorphLibraryLink, creditType: input.creditMode, creditName: input.creditMode === 'name' ? creditName : null, creditSocial: input.creditMode === 'social' ? creditSocial : null, attachment: { path: storagePath, type: kind, sizeBytes: payload.size, originalType: input.image.type, originalSizeBytes: input.image.size }, imageUrl, status: 'Pending', submittedAt: serverTimestamp() });
    return { submissionId: submissionRef.id };
  } catch (error) { if (uploaded) await deleteObject(storageRef).catch(() => undefined); throw error instanceof Error ? error : new Error(`We couldn't upload the morph ${kind}.`, { cause: error }); }
}
