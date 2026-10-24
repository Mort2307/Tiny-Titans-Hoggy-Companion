import { seed, type UniversalSpeciesSeed } from './universalSpeciesSeedTypes';

/**
 * Curated expansion of common companion, aviary and specialist birds.
 * Preserves the original 20 bird seeds in universalSpeciesSeedExotics.ts.
 *
 * Taxonomy-only records: no invented nutrition percentages, enclosure sizes,
 * temperature targets, clinical advice, mutation genotypes or licensing claims.
 * No third-party imagery is embedded or fetched by these records.
 */
const ORDERS: Record<string, string> = {
  Psittaculidae: 'Psittaciformes', Psittacidae: 'Psittaciformes', Cacatuidae: 'Psittaciformes',
  Estrildidae: 'Passeriformes', Fringillidae: 'Passeriformes', Sturnidae: 'Passeriformes',
  Columbidae: 'Columbiformes', Phasianidae: 'Galliformes', Odontophoridae: 'Galliformes',
  Anatidae: 'Anseriformes', Musophagidae: 'Musophagiformes', Ramphastidae: 'Piciformes',
};
const GROUND_FAMILIES = new Set(['Phasianidae', 'Odontophoridae', 'Anatidae']);

type BirdRow = readonly [
  scientific: string,
  common: string,
  family: string,
  dietaryGuild: UniversalSpeciesSeed['dietaryGuild'],
  riskClass?: UniversalSpeciesSeed['riskClass'],
  aliases?: string[],
];

const BIRD_ROWS: BirdRow[] = [
  [
    "Psittacula krameri",
    "Rose-ringed Parakeet",
    "Psittaculidae",
    "omnivore",
    "companion",
    [
      "Indian Ringneck",
      "Ringneck Parakeet",
      "Indian Ring-necked Parakeet",
      "Alexandrinus krameri"
    ]
  ],
  [
    "Psittacula eupatria",
    "Alexandrine Parakeet",
    "Psittaculidae",
    "omnivore",
    "specialist",
    [
      "Alexandrine Parrot"
    ]
  ],
  [
    "Psittacula cyanocephala",
    "Plum-headed Parakeet",
    "Psittaculidae",
    "omnivore"
  ],
  [
    "Psittacula derbiana",
    "Derbyan Parakeet",
    "Psittaculidae",
    "omnivore"
  ],
  [
    "Psittacula alexandri",
    "Red-breasted Parakeet",
    "Psittaculidae",
    "omnivore"
  ],
  [
    "Psittacula roseata",
    "Blossom-headed Parakeet",
    "Psittaculidae",
    "omnivore"
  ],
  [
    "Psittacula himalayana",
    "Slaty-headed Parakeet",
    "Psittaculidae",
    "omnivore"
  ],
  [
    "Psittacula columboides",
    "Malabar Parakeet",
    "Psittaculidae",
    "omnivore"
  ],
  [
    "Agapornis fischeri",
    "Fischer's Lovebird",
    "Psittaculidae",
    "granivore"
  ],
  [
    "Agapornis nigrigenis",
    "Black-cheeked Lovebird",
    "Psittaculidae",
    "granivore"
  ],
  [
    "Agapornis lilianae",
    "Lilian's Lovebird",
    "Psittaculidae",
    "granivore",
    "companion",
    [
      "Nyasa Lovebird"
    ]
  ],
  [
    "Agapornis taranta",
    "Black-winged Lovebird",
    "Psittaculidae",
    "granivore",
    "specialist",
    [
      "Abyssinian Lovebird"
    ]
  ],
  [
    "Agapornis canus",
    "Grey-headed Lovebird",
    "Psittaculidae",
    "granivore"
  ],
  [
    "Neophema pulchella",
    "Turquoise Parrot",
    "Psittaculidae",
    "granivore"
  ],
  [
    "Neophema splendida",
    "Scarlet-chested Parrot",
    "Psittaculidae",
    "granivore"
  ],
  [
    "Neophema elegans",
    "Elegant Parrot",
    "Psittaculidae",
    "granivore"
  ],
  [
    "Neopsephotus bourkii",
    "Bourke's Parrot",
    "Psittaculidae",
    "granivore",
    "companion",
    [
      "Bourke's Parakeet"
    ]
  ],
  [
    "Psephotus haematonotus",
    "Red-rumped Parrot",
    "Psittaculidae",
    "granivore"
  ],
  [
    "Bolborhynchus lineola",
    "Barred Parakeet",
    "Psittacidae",
    "omnivore",
    "companion",
    [
      "Lineolated Parakeet",
      "Linnie"
    ]
  ],
  [
    "Myiopsitta monachus",
    "Monk Parakeet",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Quaker Parrot"
    ]
  ],
  [
    "Cyanoliseus patagonus",
    "Burrowing Parrot",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Patagonian Conure"
    ]
  ],
  [
    "Pyrrhura perlata",
    "Crimson-bellied Conure",
    "Psittacidae",
    "omnivore"
  ],
  [
    "Pyrrhura frontalis",
    "Maroon-bellied Conure",
    "Psittacidae",
    "omnivore"
  ],
  [
    "Pyrrhura leucotis",
    "White-eared Conure",
    "Psittacidae",
    "omnivore"
  ],
  [
    "Pyrrhura picta",
    "Painted Conure",
    "Psittacidae",
    "omnivore"
  ],
  [
    "Aratinga jandaya",
    "Jenday Conure",
    "Psittacidae",
    "omnivore"
  ],
  [
    "Aratinga nenday",
    "Nanday Parakeet",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Nanday Conure"
    ]
  ],
  [
    "Eupsittula aurea",
    "Peach-fronted Parakeet",
    "Psittacidae",
    "omnivore",
    "companion",
    [
      "Peach-fronted Conure"
    ]
  ],
  [
    "Eupsittula pertinax",
    "Brown-throated Parakeet",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Brown-throated Conure"
    ]
  ],
  [
    "Thectocercus acuticaudatus",
    "Blue-crowned Parakeet",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Blue-crowned Conure"
    ]
  ],
  [
    "Psittacara mitratus",
    "Mitred Parakeet",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Mitred Conure"
    ]
  ],
  [
    "Psittacara leucophthalmus",
    "White-eyed Parakeet",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "White-eyed Conure"
    ]
  ],
  [
    "Ara macao",
    "Scarlet Macaw",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Ara militaris",
    "Military Macaw",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Ara ambiguus",
    "Great Green Macaw",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Ara severus",
    "Chestnut-fronted Macaw",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Severe Macaw"
    ]
  ],
  [
    "Diopsittaca nobilis",
    "Red-shouldered Macaw",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Hahn's Macaw"
    ]
  ],
  [
    "Anodorhynchus hyacinthinus",
    "Hyacinth Macaw",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Primolius maracana",
    "Blue-winged Macaw",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Illiger's Macaw"
    ]
  ],
  [
    "Amazona aestiva",
    "Turquoise-fronted Amazon",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Blue-fronted Amazon"
    ]
  ],
  [
    "Amazona amazonica",
    "Orange-winged Amazon",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Amazona ochrocephala",
    "Yellow-crowned Amazon",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Amazona auropalliata",
    "Yellow-naped Amazon",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Amazona oratrix",
    "Yellow-headed Amazon",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Double Yellow-headed Amazon"
    ]
  ],
  [
    "Amazona finschi",
    "Lilac-crowned Amazon",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Amazona autumnalis",
    "Red-lored Amazon",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Amazona albifrons",
    "White-fronted Amazon",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Pionus menstruus",
    "Blue-headed Pionus",
    "Psittacidae",
    "omnivore"
  ],
  [
    "Pionus maximiliani",
    "Scaly-headed Pionus",
    "Psittacidae",
    "omnivore",
    "companion",
    [
      "Maximilian's Pionus"
    ]
  ],
  [
    "Pionus chalcopterus",
    "Bronze-winged Pionus",
    "Psittacidae",
    "omnivore"
  ],
  [
    "Poicephalus meyeri",
    "Meyer's Parrot",
    "Psittacidae",
    "omnivore"
  ],
  [
    "Poicephalus gulielmi",
    "Red-fronted Parrot",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Jardine's Parrot"
    ]
  ],
  [
    "Poicephalus robustus",
    "Cape Parrot",
    "Psittacidae",
    "omnivore",
    "specialist"
  ],
  [
    "Poicephalus rueppellii",
    "Rüppell's Parrot",
    "Psittacidae",
    "omnivore"
  ],
  [
    "Psittacus timneh",
    "Timneh Parrot",
    "Psittacidae",
    "omnivore",
    "specialist",
    [
      "Timneh African Grey"
    ]
  ],
  [
    "Trichoglossus moluccanus",
    "Rainbow Lorikeet",
    "Psittaculidae",
    "nectarivore",
    "specialist"
  ],
  [
    "Trichoglossus haematodus",
    "Coconut Lorikeet",
    "Psittaculidae",
    "nectarivore",
    "specialist"
  ],
  [
    "Glossopsitta concinna",
    "Musk Lorikeet",
    "Psittaculidae",
    "nectarivore",
    "specialist"
  ],
  [
    "Lorius lory",
    "Black-capped Lory",
    "Psittaculidae",
    "nectarivore",
    "specialist"
  ],
  [
    "Cacatua goffiniana",
    "Tanimbar Corella",
    "Cacatuidae",
    "omnivore",
    "specialist",
    [
      "Goffin's Cockatoo"
    ]
  ],
  [
    "Cacatua sanguinea",
    "Little Corella",
    "Cacatuidae",
    "omnivore",
    "specialist"
  ],
  [
    "Cacatua moluccensis",
    "Salmon-crested Cockatoo",
    "Cacatuidae",
    "omnivore",
    "specialist",
    [
      "Moluccan Cockatoo"
    ]
  ],
  [
    "Cacatua ducorpsii",
    "Solomons Cockatoo",
    "Cacatuidae",
    "omnivore",
    "specialist"
  ],
  [
    "Calyptorhynchus banksii",
    "Red-tailed Black Cockatoo",
    "Cacatuidae",
    "omnivore",
    "specialist"
  ],
  [
    "Chloebia gouldiae",
    "Gouldian Finch",
    "Estrildidae",
    "granivore",
    "companion",
    [
      "Lady Gouldian Finch",
      "Erythrura gouldiae"
    ]
  ],
  [
    "Lonchura striata",
    "White-rumped Munia",
    "Estrildidae",
    "granivore",
    "companion",
    [
      "Society Finch",
      "Bengalese Finch"
    ]
  ],
  [
    "Lonchura punctulata",
    "Scaly-breasted Munia",
    "Estrildidae",
    "granivore",
    "companion",
    [
      "Spice Finch"
    ]
  ],
  [
    "Lonchura oryzivora",
    "Java Sparrow",
    "Estrildidae",
    "granivore",
    "companion",
    [
      "Java Finch",
      "Padda oryzivora"
    ]
  ],
  [
    "Lonchura malacca",
    "Tricoloured Munia",
    "Estrildidae",
    "granivore"
  ],
  [
    "Lonchura maja",
    "White-headed Munia",
    "Estrildidae",
    "granivore"
  ],
  [
    "Lonchura castaneothorax",
    "Chestnut-breasted Mannikin",
    "Estrildidae",
    "granivore"
  ],
  [
    "Poephila acuticauda",
    "Long-tailed Finch",
    "Estrildidae",
    "granivore"
  ],
  [
    "Poephila cincta",
    "Black-throated Finch",
    "Estrildidae",
    "granivore"
  ],
  [
    "Emblema pictum",
    "Painted Finch",
    "Estrildidae",
    "granivore"
  ],
  [
    "Neochmia temporalis",
    "Red-browed Finch",
    "Estrildidae",
    "granivore"
  ],
  [
    "Neochmia phaeton",
    "Crimson Finch",
    "Estrildidae",
    "granivore"
  ],
  [
    "Erythrura trichroa",
    "Blue-faced Parrotfinch",
    "Estrildidae",
    "granivore"
  ],
  [
    "Erythrura psittacea",
    "Red-throated Parrotfinch",
    "Estrildidae",
    "granivore"
  ],
  [
    "Amandava amandava",
    "Red Avadavat",
    "Estrildidae",
    "granivore",
    "companion",
    [
      "Strawberry Finch"
    ]
  ],
  [
    "Uraeginthus bengalus",
    "Red-cheeked Cordon-bleu",
    "Estrildidae",
    "granivore"
  ],
  [
    "Uraeginthus angolensis",
    "Blue Waxbill",
    "Estrildidae",
    "granivore"
  ],
  [
    "Estrilda astrild",
    "Common Waxbill",
    "Estrildidae",
    "granivore"
  ],
  [
    "Estrilda melpoda",
    "Orange-cheeked Waxbill",
    "Estrildidae",
    "granivore"
  ],
  [
    "Estrilda troglodytes",
    "Black-rumped Waxbill",
    "Estrildidae",
    "granivore"
  ],
  [
    "Spermestes cucullata",
    "Bronze Mannikin",
    "Estrildidae",
    "granivore"
  ],
  [
    "Lagonosticta senegala",
    "Red-billed Firefinch",
    "Estrildidae",
    "granivore"
  ],
  [
    "Serinus mozambicus",
    "Yellow-fronted Canary",
    "Fringillidae",
    "granivore",
    "companion",
    [
      "Green Singing Finch"
    ]
  ],
  [
    "Serinus serinus",
    "European Serin",
    "Fringillidae",
    "granivore",
    "specialist"
  ],
  [
    "Carduelis carduelis",
    "European Goldfinch",
    "Fringillidae",
    "granivore",
    "specialist"
  ],
  [
    "Streptopelia roseogrisea",
    "African Collared Dove",
    "Columbidae",
    "granivore",
    "companion",
    [
      "Barbary Dove",
      "Ringneck Dove"
    ]
  ],
  [
    "Geopelia cuneata",
    "Diamond Dove",
    "Columbidae",
    "granivore"
  ],
  [
    "Geopelia striata",
    "Zebra Dove",
    "Columbidae",
    "granivore"
  ],
  [
    "Columba livia",
    "Rock Dove",
    "Columbidae",
    "granivore",
    "companion",
    [
      "Domestic Pigeon",
      "Fancy Pigeon"
    ]
  ],
  [
    "Ocyphaps lophotes",
    "Crested Pigeon",
    "Columbidae",
    "granivore",
    "specialist"
  ],
  [
    "Phaps chalcoptera",
    "Common Bronzewing",
    "Columbidae",
    "granivore",
    "specialist"
  ],
  [
    "Coturnix japonica",
    "Japanese Quail",
    "Phasianidae",
    "omnivore",
    "companion",
    [
      "Coturnix Quail"
    ]
  ],
  [
    "Synoicus chinensis",
    "King Quail",
    "Phasianidae",
    "omnivore",
    "companion",
    [
      "Chinese Painted Quail",
      "Button Quail"
    ]
  ],
  [
    "Coturnix coturnix",
    "Common Quail",
    "Phasianidae",
    "omnivore"
  ],
  [
    "Callipepla californica",
    "California Quail",
    "Odontophoridae",
    "omnivore"
  ],
  [
    "Colinus virginianus",
    "Northern Bobwhite",
    "Odontophoridae",
    "omnivore",
    "specialist",
    [
      "Bobwhite Quail"
    ]
  ],
  [
    "Pavo cristatus",
    "Indian Peafowl",
    "Phasianidae",
    "omnivore",
    "specialist",
    [
      "Peacock",
      "Peahen"
    ]
  ],
  [
    "Phasianus colchicus",
    "Common Pheasant",
    "Phasianidae",
    "omnivore",
    "specialist"
  ],
  [
    "Chrysolophus pictus",
    "Golden Pheasant",
    "Phasianidae",
    "omnivore",
    "specialist"
  ],
  [
    "Chrysolophus amherstiae",
    "Lady Amherst's Pheasant",
    "Phasianidae",
    "omnivore",
    "specialist"
  ],
  [
    "Lophura nycthemera",
    "Silver Pheasant",
    "Phasianidae",
    "omnivore",
    "specialist"
  ],
  [
    "Gallus gallus",
    "Red Junglefowl",
    "Phasianidae",
    "omnivore",
    "companion",
    [
      "Domestic Chicken",
      "Chicken"
    ]
  ],
  [
    "Meleagris gallopavo",
    "Wild Turkey",
    "Phasianidae",
    "omnivore",
    "companion",
    [
      "Domestic Turkey",
      "Turkey"
    ]
  ],
  [
    "Anas platyrhynchos",
    "Mallard",
    "Anatidae",
    "omnivore",
    "companion",
    [
      "Domestic Duck"
    ]
  ],
  [
    "Cairina moschata",
    "Muscovy Duck",
    "Anatidae",
    "omnivore",
    "companion"
  ],
  [
    "Gracula religiosa",
    "Common Hill Myna",
    "Sturnidae",
    "omnivore",
    "specialist",
    [
      "Hill Myna"
    ]
  ],
  [
    "Tauraco persa",
    "Guinea Turaco",
    "Musophagidae",
    "frugivore",
    "specialist"
  ],
  [
    "Tauraco leucolophus",
    "White-crested Turaco",
    "Musophagidae",
    "frugivore",
    "specialist"
  ],
  [
    "Ramphastos sulfuratus",
    "Keel-billed Toucan",
    "Ramphastidae",
    "frugivore",
    "specialist"
  ],
  [
    "Ramphastos vitellinus",
    "Channel-billed Toucan",
    "Ramphastidae",
    "frugivore",
    "specialist"
  ]
];

export const UNIVERSAL_BIRD_EXPANSION_SEEDS: UniversalSpeciesSeed[] = BIRD_ROWS.map(
  ([scientific, common, family, dietaryGuild, riskClass = 'companion', aliases = []]) =>
    seed(scientific, common, 'bird', 'Aves', ORDERS[family] ?? 'Aves', family,
      riskClass, GROUND_FAMILIES.has(family) ? 'terrestrial' : 'arboreal',
      dietaryGuild, aliases, 'birds'),
);
