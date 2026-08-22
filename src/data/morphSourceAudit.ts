export type MorphEvidenceStatus = 'confirmed' | 'recognised' | 'debated' | 'uncertain' | 'combination' | 'line-bred' | 'polygenic';

export interface MorphSourceAuditEntry {
  name: string;
  status: MorphEvidenceStatus;
  inheritance?: string;
  sources: string[];
  note: string;
}

/**
 * 2026-08 Western Hognose terminology cross-reference.
 *
 * This is deliberately an evidence layer rather than a second genetics engine.
 * A term can be present here without being permitted into Mendelian calculation.
 */
export const morphSourceAudit: MorphSourceAuditEntry[] = [
  { name: 'Albino', status: 'confirmed', inheritance: 'Recessive', sources: ['MorphMarket Morphpedia', 'Hognose Morphs'], note: 'Established recessive colour mutation.' },
  { name: 'Axanthic', status: 'confirmed', inheritance: 'Recessive', sources: ['MorphMarket Morphpedia', 'Hognose Morphs'], note: 'Established recessive trait; Anery/Anerythristic are aliases.' },
  { name: 'Lavender', status: 'confirmed', inheritance: 'Recessive', sources: ['MorphMarket Morphpedia', 'Hognose Morphs'], note: 'Established recessive colour mutation.' },
  { name: 'Arctic', status: 'confirmed', inheritance: 'Incomplete Dominant', sources: ['MorphMarket Morphpedia', 'Hognose Morphs'], note: 'Established incomplete-dominant mutation; Super Arctic is the two-copy form.' },
  { name: 'Conda / Anaconda', status: 'confirmed', inheritance: 'Incomplete Dominant', sources: ['MorphMarket Morphpedia', 'Hognose Morphs'], note: 'Pattern-reducing mutation; Super Conda is the two-copy form.' },
  { name: 'Caramel', status: 'recognised', inheritance: 'Recessive', sources: ['MorphMarket Morphpedia', 'Hognose Morphs'], note: 'Recognised recessive trait; compatibility and nomenclature should remain source-aware.' },
  { name: 'Cinnamon', status: 'recognised', inheritance: 'Dominant', sources: ['MorphMarket gene request', 'MorphMarket community', 'Hognose Morphs'], note: 'MorphMarket currently records Cinnamon as dominant. Community documentation discusses variable penetrance and sex-influenced expression, so Tiny Titans should not infer it from appearance alone.' },
  { name: "Evan's Hypo", status: 'debated', inheritance: 'Recessive / T+ albino interpretation', sources: ['MorphMarket Morphpedia'], note: 'The name Hypo is historically established, but Morphpedia notes a growing interpretation that it represents tyrosine-positive albinism. Keep compatibility warnings visible.' },
  { name: 'Dutch Hypo', status: 'recognised', inheritance: 'Recessive / T+ albino interpretation', sources: ['MorphMarket Morphpedia', 'Hognose Morphs'], note: 'Keep distinct from Evan\'s Hypo in compatibility logic unless proven otherwise.' },
  { name: 'True Hypo', status: 'recognised', inheritance: 'Recessive', sources: ['MorphMarket Morphpedia', 'Hognose Morphs'], note: 'Separate terminology from Evans/Dutch Hypo.' },
  { name: 'Sable', status: 'recognised', inheritance: 'Recessive', sources: ['MorphMarket Morphpedia', 'Hognose Morphs'], note: 'Treat as genetic only when lineage supports it; visual similarity is not proof.' },
  { name: 'Swiss Chocolate', status: 'debated', inheritance: 'Recessive / under comparison', sources: ['MorphMarket community', 'MorphMarket trait index'], note: 'Community discussion has compared Swiss Chocolate with Sable; compatibility should not be assumed without evidence.' },
  { name: 'Pistachio', status: 'recognised', sources: ['Hognose Morphs', 'MorphMarket trait index'], note: 'Reference term present; inheritance evidence should remain explicitly sourced.' },
  { name: 'Extreme Red', status: 'polygenic', sources: ['Hognose Morphs', 'MorphMarket trait index'], note: 'Line/polygenic colour selection; not a simple recessive Mendelian locus.' },
  { name: 'Purple Line', status: 'line-bred', sources: ['Hognose Morphs', 'MorphMarket Morphpedia'], note: 'Line-bred terminology; do not expose het notation.' },
  { name: 'RBE Pastel', status: 'polygenic', sources: ['MorphMarket Morphpedia', 'MorphMarket trait index'], note: 'Reference colour/pattern trait; not a simple recessive locus.' },
  { name: 'Pastel', status: 'polygenic', sources: ['Hognose Morphs'], note: 'Reference phenotype/line term; classification must not imply a confirmed single gene.' },
  { name: 'Pink Pastel', status: 'polygenic', sources: ['Hognose Morphs', 'MorphMarket Morphpedia'], note: 'Reference phenotype/line term.' },
  { name: 'Shadow', status: 'debated', sources: ['Hognose Morphs', 'MorphMarket community'], note: 'Keep as a separately labelled phenotype/trait rather than silently converting it into a confirmed locus.' },
  { name: 'Mocha', status: 'recognised', sources: ['MorphMarket community'], note: 'Community-described dominant trait; retain evidence label and do not overstate genetic certainty.' },
  { name: 'Chocolate', status: 'uncertain', sources: ['MorphMarket community', 'MorphMarket trait index'], note: 'Terminology is used in multiple contexts; keep distinct from Swiss Chocolate until compatibility is established.' },
  { name: 'Lemon Ghost', status: 'polygenic', sources: ['Hognose Morphs'], note: 'Line/polygenic phenotype.' },
  { name: 'Diablo', status: 'polygenic', sources: ['Hognose Morphs'], note: 'Reference project/phenotype; do not treat as a Mendelian locus without evidence.' },
  { name: 'Gaverth Green', status: 'uncertain', sources: ['Hognose Morphs'], note: 'Reference catalogue term with limited public genetic documentation.' },
  { name: 'Granite', status: 'uncertain', sources: ['Hognose Morphs'], note: 'Reference catalogue term; genetic basis should remain explicitly unknown until evidenced.' },
  { name: 'Granite Jungle', status: 'uncertain', sources: ['Hognose Morphs'], note: 'Named phenotype/combination term.' },
  { name: 'Savannah', status: 'uncertain', sources: ['Hognose Morphs'], note: 'Reference term; do not promote to a confirmed locus without evidence.' },
  { name: 'Skullface', status: 'uncertain', sources: ['Hognose Morphs'], note: 'Phenotypic terminology; no automatic inheritance assumptions.' },
  { name: 'Symphony', status: 'polygenic', sources: ['Hognose Morphs'], note: 'Reference line/polygenic term.' },
  { name: 'Woma', status: 'uncertain', sources: ['Hognose Morphs'], note: 'Reference term; genetic basis remains explicitly classified as unknown.' },
  { name: 'Leucistic', status: 'recognised', inheritance: 'Recessive', sources: ['Hognose Morphs', 'MorphMarket trait index'], note: 'Recognised phenotype/trait; preserve evidence status.' },
  { name: 'Toffeebelly', status: 'recognised', inheritance: 'Recessive', sources: ['Hognose Morphs', 'MorphMarket Morphpedia'], note: 'Established recessive terminology in the community.' },
  { name: 'Antarctic', status: 'recognised', inheritance: 'Incomplete Dominant', sources: ['Hognose Morphs'], note: 'Reference catalogue trait; keep separate from Arctic.' },
  { name: 'Superantarctic', status: 'combination', sources: ['Hognose Morphs'], note: 'Two-copy form of Antarctic terminology in the reference catalogue.' },
  { name: 'Super Arctic', status: 'confirmed', inheritance: 'Two-copy Arctic', sources: ['Hognose Morphs', 'MorphMarket Morphpedia'], note: 'Not a separate locus; resolves to Arctic ×2.' },
  { name: 'Super Conda', status: 'confirmed', inheritance: 'Two-copy Conda', sources: ['Hognose Morphs', 'MorphMarket Morphpedia'], note: 'Not a separate locus; resolves to Conda ×2.' },
  { name: 'Snow', status: 'combination', sources: ['MorphMarket Morphpedia'], note: 'Albino + Axanthic combination; not a separate gene.' },
  { name: 'Mercury', status: 'combination', sources: ['MorphMarket Morphpedia', 'MorphMarket community'], note: 'Lavender + Axanthic combination.' },
  { name: 'Coral', status: 'combination', sources: ['MorphMarket Morphpedia'], note: 'Albino + Lavender combination.' },
  { name: 'Moondust', status: 'combination', sources: ['MorphMarket Morphpedia'], note: 'Arctic + Lavender combination.' },
  { name: 'Moonstone', status: 'combination', sources: ['MorphMarket Morphpedia'], note: 'Super Arctic + Lavender combination.' },
  { name: 'Platinum', status: 'combination', sources: ['MorphMarket Morphpedia', 'Hognose Morphs'], note: 'Arctic + Super Conda combination.' },
  { name: 'Toxic', status: 'combination', sources: ['MorphMarket Morphpedia', 'MorphMarket community'], note: 'Axanthic + Toffeebelly combination.' },
  { name: 'Toffeeconda', status: 'combination', sources: ['MorphMarket Morphpedia'], note: 'Conda + Toffeebelly combination.' },
];

export const morphSourceAuditByName = new Map(morphSourceAudit.map((entry) => [entry.name.toLowerCase(), entry]));

export const MORPH_SOURCE_AUDIT_LAST_REVIEWED = '2026-08-22';
