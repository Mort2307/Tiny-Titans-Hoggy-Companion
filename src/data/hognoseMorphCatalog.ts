import type { MorphDefinition } from './morphs';

/**
 * External reference catalogue for Western Hognose terminology.
 *
 * This deliberately does NOT promote every marketplace name into a confirmed
 * Mendelian locus. Named phenotypes, combinations, line-bred traits and
 * uncertain terms remain separately classified by the master database.
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
  description = 'Western Hognose reference trait.',
): MorphReferenceEntry => ({
  geneId: slug(name), name, kind: 'Gene', isGene: true, category: 'Reference Trait', inheritance,
  hetPossible: inheritance === 'Recessive', verification: 'Recognised', description,
  sourceUrl: 'https://hognose-morphs.com/', sourceLabel: 'Hognose Morphs',
});

const combination = (
  name: string,
  contains: string[] = [],
  description = 'Recognised named Western Hognose phenotype or combination from an external reference.',
): MorphReferenceEntry => ({
  geneId: slug(name), name, kind: 'Combination', isGene: false, isCombination: true,
  category: 'Named Combination', inheritance: 'Unknown', hetPossible: false,
  verification: 'Recognised',
  components: contains.map((item) => ({ morphId: slug(item), type: item.toLowerCase().includes('super') ? 'Super' : 'Gene' })),
  contains, description, sourceUrl: 'https://hognose-morphs.com/', sourceLabel: 'Hognose Morphs',
});

export const hognoseMorphCatalog: MorphReferenceEntry[] = [
  gene('Albino', 'Recessive'), gene('Anaconda', 'Incomplete Dominant'), gene('Antarctic', 'Incomplete Dominant'),
  gene('Arctic', 'Incomplete Dominant'), gene('Axanthic', 'Recessive'), gene('Caramel', 'Recessive'),
  gene('Cinnamon', 'Dominant', 'MorphMarket currently lists Cinnamon as a dominant Western Hognose trait; community documentation also discusses variable penetrance and sex-influenced expression.'),
  gene('Desert', 'Unknown'), gene('Extreme Red', 'Polygenic'), gene('Diablo', 'Polygenic'), gene("Evan's Hypo", 'Recessive'),
  gene('Dutch Hypo', 'Recessive'), gene('True Hypo', 'Recessive'), gene('Green Hypo', 'Unknown'), gene('Gaverth Green', 'Unknown'),
  gene('Granite', 'Unknown'), gene('Granite Jungle', 'Unknown'), gene('Lavender', 'Recessive'), gene('Lemon Ghost', 'Polygenic'),
  gene('Lemon Hypo', 'Unknown'), gene('Leucistic', 'Recessive'), gene('Pastel', 'Polygenic'), gene('Pink Pastel', 'Polygenic'),
  gene('RBE Pastel', 'Polygenic'), gene('Pistachio', 'Unknown'), gene('Purple Line', 'Line-bred'), gene('Sable', 'Recessive'),
  gene('Savannah', 'Unknown'), gene('Shadow', 'Polygenic'), gene('Skullface', 'Unknown'), gene('Superarctic', 'Incomplete Dominant'),
  gene('Superantarctic', 'Incomplete Dominant'), gene('Superconda', 'Incomplete Dominant'), gene('Swiss Chocolate', 'Unknown'),
  gene('Symphony', 'Polygenic'), gene('Toffeebelly', 'Recessive'), gene('Woma', 'Unknown'), gene('Banded', 'Unknown'),
  gene('Blond', 'Unknown'), gene('Chocolate', 'Unknown'), gene('Green Phase', 'Polygenic'), gene('Jungle', 'Unknown'),
  gene('Jaguar', 'Unknown'), gene('Motley', 'Unknown'), gene('Reverse Stripe', 'Unknown'), gene('Smoke Hypo', 'Unknown'),
  gene('Tiger', 'Polygenic'), gene('Yellow Glow', 'Unknown'), gene('Pink Pastel Albino', 'Recessive'), gene('Toffee Glow', 'Recessive'),
  combination('Normal'), combination('Anaconda', ['Anaconda']), combination('Superconda', ['Superconda']), combination('Arctic', ['Arctic']),
  combination('Grey Fog'), combination('Platinum', ['Arctic', 'Superconda'], 'Named combination containing Arctic and Super Conda.'),
  combination('Superarctic', ['Superarctic']), combination('Superarctic Anaconda', ['Superarctic', 'Anaconda']),
  combination('Superarctic Superconda', ['Superarctic', 'Superconda']), combination('Antarctic', ['Antarctic']),
  combination('Superantarctic', ['Superantarctic']), combination('Antarctic Anaconda', ['Antarctic', 'Anaconda']),
  combination('Antarctic Superconda', ['Antarctic', 'Superconda']), combination('Antarctic Arctic', ['Antarctic', 'Arctic']),
  combination('Albino', ['Albino']), combination('Albino Anaconda', ['Albino', 'Anaconda']), combination('Albino Superconda', ['Albino', 'Superconda']),
  combination('Albino Arctic', ['Albino', 'Arctic']), combination('Albino Arctic Anaconda', ['Albino', 'Arctic', 'Anaconda']),
  combination('Albino Arctic Superconda', ['Albino', 'Arctic', 'Superconda']), combination('Albino Antarctic', ['Albino', 'Antarctic']),
  combination('Albino Antarctic Anaconda', ['Albino', 'Antarctic', 'Anaconda']), combination('Albino Antarctic Superconda', ['Albino', 'Antarctic', 'Superconda']),
  combination('Albino Arctic Antarctic', ['Albino', 'Arctic', 'Antarctic']), combination('Albino Arctic Antarctic Anaconda', ['Albino', 'Arctic', 'Antarctic', 'Anaconda']),
  combination('Axanthic Anaconda', ['Axanthic', 'Anaconda']), combination('Mercury', ['Lavender', 'Axanthic']), combination('Coral', ['Albino', 'Lavender']),
  combination('Moondust', ['Arctic', 'Lavender']), combination('Moonstone', ['Superarctic', 'Lavender']), combination('Ghost', ["Evan's Hypo", 'Axanthic']),
  combination('Snow', ['Albino', 'Axanthic']), combination('Sunburst', ['Albino', 'Sable']), combination('Toffee Glow', ['Albino', 'Toffeebelly']),
  combination('True Sunglow', ['Albino', 'True Hypo']), combination('Ultramel', ['Albino', 'Caramel']), combination('Ultra Albino', ['Albino', 'Caramel']),
  combination('Ultra Caramel', ['Albino', 'Caramel']), combination('Hybino', ['Albino', "Evan's Hypo"]), combination('Purple Haze', ["Evan's Hypo", 'Lavender']),
  combination('T+ Snow', ['Axanthic', "Evan's Hypo"]), combination('Toxic', ['Axanthic', 'Toffeebelly']), combination('Toffeeconda', ['Anaconda', 'Toffeebelly']),
  combination('Thallium', ['Anaconda', 'Axanthic', 'Toffeebelly']),
];

export const hognoseMorphReferenceByName = new Map(hognoseMorphCatalog.map((entry) => [entry.name.toLowerCase(), entry]));
export function getHognoseMorphReference(name: string): MorphReferenceEntry | undefined {
  return hognoseMorphReferenceByName.get(name.trim().toLowerCase());
}
