import { seed, type UniversalSpeciesSeed } from './universalSpeciesSeedTypes';

const insect = (s: string, c: string, f: string, o: string, r: UniversalSpeciesSeed['riskClass'], l: string, d: UniversalSpeciesSeed['dietaryGuild'], a: string[] = []) =>
  seed(s, c, 'insect', 'Insecta', o, f, r, l, d, a);
const myri = (s: string, c: string, f: string, o: string, r: UniversalSpeciesSeed['riskClass'], a: string[] = []) =>
  seed(s, c, 'myriapod', 'Myriapoda', o, f, r, 'terrestrial,fossorial', 'detritivore', a);
const moll = (s: string, c: string, f: string, r: UniversalSpeciesSeed['riskClass'], l = 'terrestrial', a: string[] = []) =>
  seed(s, c, 'mollusc', 'Gastropoda', 'Stylommatophora', f, r, l, 'herbivore', a);
const crust = (s: string, c: string, f: string, r: UniversalSpeciesSeed['riskClass'], l: string, d: UniversalSpeciesSeed['dietaryGuild'], a: string[] = []) =>
  seed(s, c, 'crustacean', 'Malacostraca', 'Decapoda', f, r, l, d, a);

export const UNIVERSAL_INVERTEBRATE_SEEDS: UniversalSpeciesSeed[] = [
  // Mantids.
  insect('Hierodula membranacea','Giant Asian Mantis','Mantidae','Mantodea','companion','arboreal','carnivore',['giant asian praying mantis']),
  insect('Sphodromantis lineola','African Mantis','Mantidae','Mantodea','companion','arboreal','carnivore'),
  insect('Creobroter gemmatus','Jeweled Flower Mantis','Hymenopodidae','Mantodea','specialist','arboreal','carnivore'),
  insect('Idolomantis diabolica','Devil’s Flower Mantis','Empusidae','Mantodea','specialist','arboreal','carnivore'),
  insect('Hymenopus coronatus','Orchid Mantis','Hymenopodidae','Mantodea','specialist','arboreal','carnivore'),
  insect('Phyllocrania paradoxa','Ghost Mantis','Hymenopodidae','Mantodea','companion','arboreal','carnivore'),
  insect('Deroplatys desiccata','Giant Dead Leaf Mantis','Deroplatyidae','Mantodea','specialist','arboreal','carnivore'),

  // Stick insects and leaf insects.
  insect('Carausius morosus','Indian Stick Insect','Lonchodidae','Phasmatodea','companion','arboreal','herbivore'),
  insect('Medauroidea extradentata','Vietnamese Stick Insect','Lonchodidae','Phasmatodea','companion','arboreal','herbivore'),
  insect('Extatosoma tiaratum','Giant Prickly Stick Insect','Phasmatidae','Phasmatodea','companion','arboreal','herbivore',['macleays spectre']),
  insect('Sungaya inexpectata','Extinctus Walking Stick','Phasmatidae','Phasmatodea','specialist','arboreal','herbivore',['sun gay walking stick']),
  insect('Heteropteryx dilatata','Malaysian Jungle Nymph','Phasmatidae','Phasmatodea','specialist','arboreal','herbivore'),
  insect('Eurycantha calcarata','Giant Spiny Stick Insect','Phasmatidae','Phasmatodea','specialist','terrestrial,arboreal','herbivore'),
  insect('Peruphasma schultei','Black Beauty Stick Insect','Pseudodiacanthiidae','Phasmatodea','specialist','arboreal','herbivore'),
  insect('Pseudodiacantha macklottii','Javanese Stick Insect','Phasmatidae','Phasmatodea','specialist','arboreal','herbivore'),

  // Beetles.
  insect('Pachnoda marginata','Sun Beetle','Scarabaeidae','Coleoptera','companion','terrestrial','omnivore',['fruit beetle']),
  insect('Mecynorrhina torquata','Sunset Flower Beetle','Scarabaeidae','Coleoptera','specialist','terrestrial','omnivore'),
  insect('Goliathus goliatus','Goliath Beetle','Scarabaeidae','specialist','arboreal','omnivore'),
  insect('Dynastes hercules','Hercules Beetle','Scarabaeidae','specialist','terrestrial,arboreal','herbivore'),
  insect('Chalcosoma atlas','Atlas Beetle','Scarabaeidae','specialist','terrestrial,arboreal','herbivore'),
  insect('Lucanus cervus','European Stag Beetle','Lucanidae','specialist','terrestrial','detritivore'),
  insect('Prosopocoilus giraffa','Giraffe Stag Beetle','Lucanidae','specialist','terrestrial','detritivore'),
  insect('Eudicella gralli','African Flower Beetle','Scarabaeidae','specialist','terrestrial,arboreal','omnivore'),
  insect('Cetonia aurata','Rose Chafer','Scarabaeidae','specialist','terrestrial,arboreal','herbivore'),

  // Cockroaches, feeder insects and colony species.
  insect('Blaptica dubia','Dubia Roach','Blaberidae','Blattodea','companion','terrestrial','omnivore',['dubia cockroach']),
  insect('Gromphadorhina portentosa','Madagascar Hissing Cockroach','Blaberidae','Blattodea','companion','terrestrial','omnivore'),
  insect('Archimandrita tesselata','Giant Cave Cockroach','Blaberidae','Blattodea','specialist','terrestrial','omnivore'),
  insect('Elliptorhina chopardi','Cave Hissing Cockroach','Blaberidae','Blattodea','specialist','terrestrial','omnivore'),
  insect('Therea petiveriana','Domino Cockroach','Ectobiidae','Blattodea','companion','terrestrial','omnivore'),
  insect('Shelfordella lateralis','Turkestan Roach','Ectobiidae','Blattodea','companion','terrestrial','omnivore',['red runner']),
  insect('Nauphoeta cinerea','Lobster Roach','Blaberidae','Blattodea','companion','terrestrial','omnivore'),
  insect('Eublaberus distanti','Six-spotted Roach','Blaberidae','Blattodea','specialist','terrestrial','omnivore'),

  insect('Gryllus bimaculatus','African Two-spotted Cricket','Gryllidae','Orthoptera','companion','terrestrial','omnivore',['black cricket']),
  insect('Acheta domesticus','House Cricket','Gryllidae','Orthoptera','companion','terrestrial','omnivore'),
  insect('Gryllodes sigillatus','Banded Cricket','Gryllidae','Orthoptera','companion','terrestrial','omnivore'),
  insect('Locusta migratoria','Migratory Locust','Acrididae','Orthoptera','companion','terrestrial','herbivore'),
  insect('Schistocerca gregaria','Desert Locust','Acrididae','Orthoptera','specialist','terrestrial','herbivore'),
  insect('Tenebrio molitor','Yellow Mealworm','Tenebrionidae','Coleoptera','companion','terrestrial','detritivore'),
  insect('Zophobas morio','Superworm Beetle','Tenebrionidae','Coleoptera','companion','terrestrial','detritivore',['superworm']),
  insect('Alphitobius diaperinus','Lesser Mealworm Beetle','Tenebrionidae','Coleoptera','companion','terrestrial','detritivore'),

  // Lepidoptera and silk moths.
  insect('Bombyx mori','Silkworm','Bombycidae','Lepidoptera','companion','terrestrial','herbivore'),
  insect('Samia ricini','Eri Silkmoth','Saturniidae','Lepidoptera','specialist','terrestrial,arboreal','herbivore'),
  insect('Attacus atlas','Atlas Moth','Saturniidae','specialist','arboreal','herbivore'),
  insect('Antheraea pernyi','Chinese Oak Silkmoth','Saturniidae','specialist','arboreal','herbivore'),
  insect('Gonimbrasia belina','Mopane Worm Moth','Saturniidae','specialist','arboreal','herbivore'),

  // Butterflies and moths kept or bred as exotics/educational animals.
  insect('Danaus plexippus','Monarch Butterfly','Nymphalidae','Lepidoptera','specialist','arboreal','nectarivore'),
  insect('Papilio machaon','Old World Swallowtail','Papilionidae','Lepidoptera','specialist','arboreal','nectarivore'),
  insect('Idea leuconoe','Paper Kite Butterfly','Nymphalidae','Lepidoptera','specialist','arboreal','nectarivore'),
  insect('Greta oto','Glasswing Butterfly','Nymphalidae','Lepidoptera','specialist','arboreal','nectarivore'),

  // Myriapods.
  myri('Archispirostreptus gigas','Giant African Millipede','Spirostreptidae','Polydesmida','companion'),
  myri('Centrobolus splendidus','Scarlet Millipede','Trigoniulidae','Polydesmida','companion'),
  myri('Narceus americanus','Bumblebee Millipede','Spirobolidae','Spirobolida','companion'),
  myri('Chicobolus spinigerus','Ivory Millipede','Spirobolidae','Spirobolida','companion'),
  myri('Scolopendra subspinipes','Vietnamese Centipede','Scolopendridae','Scolopendromorpha','venomous',['asian forest centipede']),
  myri('Scolopendra polymorpha','Desert Centipede','Scolopendridae','Scolopendromorpha','venomous'),
  myri('Scolopendra gigantea','Giant Centipede','Scolopendridae','Scolopendromorpha','venomous'),
  myri('Ethmostigmus rubripes','Giant Blue-legged Centipede','Ethmostigmus','Scolopendromorpha','venomous'),

  // Terrestrial gastropods.
  moll('Lissachatina fulica','Giant African Land Snail','Achatinidae','specialist','terrestrial',['achatina fulica']),
  moll('Archachatina marginata','Giant West African Land Snail','Achatinidae','specialist'),
  moll('Achatina achatina','Giant Ghana Snail','Achatinidae','specialist'),
  moll('Cornu aspersum','Garden Snail','Helicidae','companion'),
  moll('Helix pomatia','Roman Snail','Helicidae','specialist'),
  moll('Theba pisana','White Garden Snail','Helicidae','specialist'),
  moll('Rumina decollata','Decollate Snail','Achatinidae','specialist'),
  moll('Limicolaria flammea','Flame Tree Snail','Achatinidae','specialist'),

  // Freshwater and land crustaceans.
  crust('Coenobita rugosus','Rugose Hermit Crab','Coenobitidae','companion','terrestrial','detritivore'),
  crust('Coenobita perlatus','Strawberry Hermit Crab','Coenobitidae','specialist','terrestrial','detritivore'),
  crust('Neocaridina davidi','Cherry Shrimp','Atyidae','companion','aquatic','omnivore',['red cherry shrimp']),
  crust('Caridina cantonensis','Crystal Red Shrimp','Atyidae','specialist','aquatic','omnivore'),
  crust('Macrobrachium rosenbergii','Giant River Prawn','Palaemonidae','specialist','aquatic','omnivore'),
  crust('Cherax destructor','Common Yabby','Parastacidae','specialist','aquatic','omnivore'),
  crust('Procambarus clarkii','Red Swamp Crayfish','Cambaridae','specialist','aquatic','omnivore',['Louisiana crawfish']),
  crust('Cambarellus diminutus','Least Dwarf Crayfish','Cambaridae','companion','aquatic','omnivore'),
  crust('Geosesarma dennerle','Vampire Crab','Sesarmidae','specialist','semi-aquatic','omnivore'),
  crust('Cardisoma armatum','Rainbow Crab','Gecarcinidae','specialist','semi-aquatic','omnivore'),
];
