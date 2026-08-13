import type { MorphDefinition } from './morphs';

/**
 * Hognose-Morphs.com reference catalogue.
 *
 * This layer deliberately sits beside the canonical genetics database so that
 * named phenotypes can be displayed without pretending every named trait is
 * an independent genetic locus.
 */
export type MorphReferenceEntry = MorphDefinition & {
  sourceUrl?: string;
  contains?: string[];
  sourceLabel?: string;
};

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const gene = (
  name: string,
  inheritance: MorphDefinition['inheritance'],
  description = 'Western Hognose genetic trait listed in the Hognose Morphs reference catalogue.',
): MorphReferenceEntry => ({
  geneId: slug(name),
  name,
  kind: 'Gene',
  isGene: true,
  category: 'Genetic Trait',
  inheritance,
  hetPossible: inheritance === 'Recessive',
  verification: 'Recognised',
  description,
  sourceUrl: `https://hognose-morphs.com/`,
  sourceLabel: 'Hognose Morphs',
});

const combination = (
  name: string,
  contains: string[] = [],
  description = 'Recognised named Western Hognose combination listed in the Hognose Morphs reference catalogue.',
): MorphReferenceEntry => ({
  geneId: slug(name),
  name,
  kind: 'Combination',
  isGene: false,
  isCombination: true,
  category: 'Named Combination',
  inheritance: 'Unknown',
  hetPossible: false,
  verification: 'Recognised',
  components: contains.map((item) => ({ morphId: slug(item), type: item.toLowerCase().includes('super') ? 'Super' : 'Gene' })),
  contains,
  description,
  sourceUrl: `https://hognose-morphs.com/`,
  sourceLabel: 'Hognose Morphs',
});

export const hognoseMorphCatalog: MorphReferenceEntry[] = [
  // Reference filters / foundational traits surfaced by Hognose Morphs.
  gene('Albino', 'Recessive'),
  gene('Anaconda', 'Incomplete Dominant'),
  gene('Antarctic', 'Incomplete Dominant'),
  gene('Arctic', 'Incomplete Dominant'),
  gene('Axanthic', 'Recessive'),
  gene('Caramel', 'Recessive'),
  gene('Cinnamon', 'Unknown'),
  gene('Desert', 'Unknown'),
  gene('Extreme Red', 'Polygenic'),
  gene('Diablo', 'Polygenic'),
  gene("Evan's Hypo", 'Recessive'),
  gene('Gaverth Green', 'Unknown'),
  gene('Granite', 'Unknown'),
  gene('Granite Jungle', 'Unknown'),
  gene('Lavender', 'Recessive'),
  gene('Lemon Ghost', 'Polygenic'),
  gene('Leucistic', 'Recessive'),
  gene('Pastel', 'Polygenic'),
  gene('Pink Pastel', 'Polygenic'),
  gene('Pistachio', 'Unknown'),
  gene('Purple Line', 'Line-bred'),
  gene('Sable', 'Recessive'),
  gene('Savannah', 'Unknown'),
  gene('Shadow', 'Polygenic'),
  gene('Skullface', 'Unknown'),
  gene('Superarctic', 'Incomplete Dominant'),
  gene('Superantarctic', 'Incomplete Dominant'),
  gene('Superconda', 'Incomplete Dominant'),
  gene('Swiss Chocolate', 'Unknown'),
  gene('Symphony', 'Polygenic'),
  gene('Toffeebelly', 'Recessive'),
  gene('True Hypo', 'Recessive'),
  gene('Woma', 'Unknown'),

  // Named phenotypes/combinations surfaced on the reference site's catalogue.
  combination('Normal'),
  combination('Anaconda', ['Anaconda']),
  combination('Superconda', ['Superconda']),
  combination('Arctic', ['Arctic']),
  combination('Grey Fog'),
  combination('Platinum', ['Arctic', 'Superconda'], 'Named combination containing Arctic and Superconda.'),
  combination('Superarctic', ['Superarctic']),
  combination('Superarctic Anaconda', ['Superarctic', 'Anaconda']),
  combination('Superarctic Superconda', ['Superarctic', 'Superconda']),
  combination('Antarctic', ['Antarctic']),
  combination('Superantarctic', ['Superantarctic']),
  combination('Antarctic Anaconda', ['Antarctic', 'Anaconda']),
  combination('Antarctic Superconda', ['Antarctic', 'Superconda']),
  combination('Antarctic Arctic', ['Antarctic', 'Arctic']),
  combination('Albino', ['Albino']),
  combination('Albino Anaconda', ['Albino', 'Anaconda']),
  combination('Albino Superconda', ['Albino', 'Superconda']),
  combination('Albino Arctic', ['Albino', 'Arctic']),
  combination('Albino Arctic Anaconda', ['Albino', 'Arctic', 'Anaconda']),
  combination('Albino Arctic Superconda', ['Albino', 'Arctic', 'Superconda']),
  combination('Subzero'),
  combination('Bubs Daddy'),
  combination('Super Daddy'),
  combination('Albino Antarctic', ['Albino', 'Antarctic']),
  combination('Albino Antarctic Anaconda', ['Albino', 'Antarctic', 'Anaconda']),
  combination('Albino Antarctic Superconda', ['Albino', 'Antarctic', 'Superconda']),
  combination('Albino Arctic Antarctic', ['Albino', 'Arctic', 'Antarctic']),
  combination('Albino Arctic Antarctic Anaconda', ['Albino', 'Arctic', 'Antarctic', 'Anaconda']),
  combination('Axanthic'),
  combination('Axanthic Anaconda', ['Axanthic', 'Anaconda']),
];

export const hognoseMorphReferenceByName = new Map(
  hognoseMorphCatalog.map((entry) => [entry.name.toLowerCase(), entry]),
);

export function getHognoseMorphReference(name: string): MorphReferenceEntry | undefined {
  return hognoseMorphReferenceByName.get(name.trim().toLowerCase());
}
