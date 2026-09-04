import { auth, db, storage } from '../firebase/config';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { findSnakeSpecies } from '../data/species/speciesRegistry';

export type MorphCreditMode = 'name' | 'social' | 'anonymous';

export interface MorphSubmissionInputV2 {
  /** Optional during the migration window; legacy Morph Library entries are Hognose genetics. */
  speciesId?: string;
  morphId: string;
  morphName: string;
  description: string;
  observedTraits: string;
  proofDetails: string;
  proofReference?: string;
  image: File;
  factualAccuracyConfirmed: boolean;
  photoRequirementsConfirmed: boolean;
  creditMode: MorphCreditMode;
  creditName?: string;
  creditSocial?: string;
}

function validateText(value: string, field: string, required = false): string {
  const trimmed = value.trim();
  if (required && !trimmed) throw new Error(`${field} is required.`);
  if (trimmed.length > 4000) throw new Error(`${field} is too long.`);
  return trimmed;
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

async function prepareImage(file: File): Promise<Blob> {
  try {
    if (!file.type.startsWith('image/')) throw new Error('Unable to prepare the image.');
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Unable to prepare the image.');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Unable to compress the image.')),
        'image/jpeg',
        0.84,
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unable to prepare the image.') throw error;
    throw new Error('Tiny Titans could not read this image. Please choose a normal camera/gallery image such as JPG, PNG or WebP.', { cause: error });
  }
}

export async function submitMorphImageV2(input: MorphSubmissionInputV2): Promise<{ submissionId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('You must be signed in to submit a morph image.');

  const speciesId = input.speciesId?.trim() || 'heterodon-nasicus';
  const species = findSnakeSpecies(speciesId);
  if (!species) throw new Error('Please select a recognised snake species before submitting a morph image.');

  const morphId = input.morphId.trim();
  const morphName = input.morphName.trim();
  if (!morphId || !morphName) throw new Error('Please select a morph from the Morph Library.');

  const description = validateText(input.description, 'Animal description', true);
  const observedTraits = validateText(input.observedTraits, 'Known genetic information');
  const proofDetails = validateText(input.proofDetails, 'Evidence / proof', true);
  const proofReference = validateText(input.proofReference ?? '', 'Proof reference');

  if (!input.image) throw new Error('Please add the primary morph photograph.');
  if (!input.factualAccuracyConfirmed) throw new Error('Please confirm that the morph identification is supported by factual evidence.');
  if (!input.photoRequirementsConfirmed) throw new Error('Please confirm that the primary photograph meets the Morph Library photo requirements.');
  if (input.creditMode === 'name' && !input.creditName?.trim()) throw new Error('Please enter the name you want displayed, or choose another credit option.');
  if (input.creditMode === 'social' && !input.creditSocial?.trim()) throw new Error('Please enter the social handle/link you want displayed, or choose another credit option.');

  const creditName = validateText(input.creditName ?? '', 'Credit name');
  const creditSocial = validateText(input.creditSocial ?? '', 'Credit social');
  const compressed = await prepareImage(input.image);

  const submissionRef = doc(collection(db, 'morphImageSubmissions'));
  const storagePath = `morph-submissions/${user.uid}/${submissionRef.id}/${slugify(morphName) || 'morph'}.jpg`;
  const storageRef = ref(storage, storagePath);
  let uploaded = false;

  try {
    await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg', customMetadata: { speciesId: species.id, morphId, contributorUid: user.uid } });
    uploaded = true;
    const imageUrl = await getDownloadURL(storageRef);

    await setDoc(submissionRef, {
      userId: user.uid,
      speciesId: species.id,
      speciesName: species.acceptedScientificName,
      morphId,
      morphName,
      description,
      observedTraits,
      proofDetails,
      proofReference: proofReference || null,
      photoRequirementsConfirmed: true,
      factualAccuracyConfirmed: true,
      creditType: input.creditMode,
      creditName: input.creditMode === 'name' ? creditName : null,
      creditSocial: input.creditMode === 'social' ? creditSocial : null,
      attachment: { path: storagePath, type: 'image', sizeBytes: compressed.size, originalType: input.image.type, originalSizeBytes: input.image.size },
      imageUrl,
      status: 'Pending',
      submittedAt: serverTimestamp(),
    });

    return { submissionId: submissionRef.id };
  } catch (error) {
    if (uploaded) await deleteObject(storageRef).catch(() => undefined);
    throw error instanceof Error
      ? error
      : new Error("We couldn't upload the morph image. Please try again.", { cause: error });
  }
}