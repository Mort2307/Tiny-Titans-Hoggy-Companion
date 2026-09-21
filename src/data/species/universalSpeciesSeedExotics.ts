import { seed, type UniversalSpeciesSeed } from './universalSpeciesSeedTypes';

const MAMMAL_ORDERS: Record<string, string> = {
  Chinchillidae:'Rodentia', Octodontidae:'Rodentia', Petauridae:'Diprotodontia', Erinaceidae:'Eulipotyphla',
  Nesomyidae:'Rodentia', Muridae:'Rodentia', Dipodidae:'Rodentia', Heteromyidae:'Rodentia', Caviidae:'Rodentia',
  Sciuridae:'Rodentia', Tenrecidae:'Afrosoricida', Herpestidae:'Carnivora', Viverridae:'Carnivora', Procyonidae:'Carnivora',
  Hystricidae:'Rodentia', Callitrichidae:'Primates', Cebidae:'Primates', Mustelidae:'Carnivora'
};
const BIRD_ORDERS: Record<string, string> = {
  Psittaculidae:'Psittaciformes', Cacatuidae:'Psittaciformes', Psittacidae:'Psittaciformes', Fringillidae:'Passeriformes',
  Estrildidae:'Passeriformes', Ramphastidae:'Piciformes', Musophagidae:'Musophagiformes', Bucerotidae:'Bucerotiformes'
};
const FISH_ORDERS: Record<string, string> = {
  Osphronemidae:'Anabantiformes', Poeciliidae:'Cyprinodontiformes', Cichlidae:'Cichliformes', Callichthyidae:'Siluriformes',
  Loricariidae:'Siluriformes', Characidae:'Characiformes', Danionidae:'Cypriniformes', Cyprinidae:'Cypriniformes',
  Botiidae:'Cypriniformes', Cobitidae:'Cypriniformes', Syngnathidae:'Syngnathiformes', Pomacentridae:'Perciformes',
  Acanthuridae:'Acanthuriformes', Callionymidae:'Syngnathiformes'
};
const CEPHALOPOD_ORDERS: Record<string, string> = { Octopodidae:'Octopoda', Sepiidae:'Sepiida', Nautilidae:'Nautilida' };
const mammal = (s: string, c: string, f: string, r: UniversalSpeciesSeed['riskClass'], l: string, d: UniversalSpeciesSeed['dietaryGuild'], a: string[] = []) =>
  seed(s, c, 'mammal', 'Mammalia', MAMMAL_ORDERS[f] ?? 'Mammalia', f, r, l, d, a);
const bird = (s: string, c: string, f: string, r: UniversalSpeciesSeed['riskClass'], l: string, d: UniversalSpeciesSeed['dietaryGuild'], a: string[] = []) =>
  seed(s, c, 'bird', 'Aves', BIRD_ORDERS[f] ?? 'Aves', f, r, l, d, a);
const fish = (s: string, c: string, f: string, r: UniversalSpeciesSeed['riskClass'], l: string, d: UniversalSpeciesSeed['dietaryGuild'], a: string[] = []) =>
  seed(s, c, 'fish', 'Actinopterygii', FISH_ORDERS[f] ?? 'Actinopterygii', f, r, l, d, a);
const marine = (s: string, c: string, f: string, r: UniversalSpeciesSeed['riskClass'], a: string[] = []) =>
  seed(s, c, 'cephalopod', 'Cephalopoda', CEPHALOPOD_ORDERS[f] ?? 'Cephalopoda', f, r, 'aquatic', 'carnivore', a);

export const UNIVERSAL_EXOTIC_SEEDS: UniversalSpeciesSeed[] = [
  // Small mammals commonly represented in specialist/exotic collections.
  mammal('Chinchilla lanigera','Long-tailed Chinchilla','Chinchillidae','companion','terrestrial,arboreal','herbivore'),
  mammal('Octodon degus','Degu','Octodontidae','companion','terrestrial','herbivore'),
  mammal('Petaurus breviceps','Sugar Glider','Petauridae','specialist','arboreal','omnivore'),
  mammal('Atelerix albiventris','Four-toed Hedgehog','Erinaceidae','specialist','terrestrial','insectivore'),
  mammal('Cricetomys ansorgei','Gambian Pouched Rat','Nesomyidae','specialist','terrestrial','omnivore'),
  mammal('Mastomys natalensis','Natal Multimammate Mouse','Muridae','specialist','terrestrial','omnivore'),
  mammal('Meriones unguiculatus','Mongolian Gerbil','Muridae','companion','terrestrial,fossorial','omnivore'),
  mammal('Jaculus jaculus','Lesser Egyptian Jerboa','Dipodidae','specialist','terrestrial,fossorial','omnivore'),
  mammal('Dipodomys deserti','Desert Kangaroo Rat','Heteromyidae','specialist','terrestrial,fossorial','herbivore'),
  mammal('Hydrochoerus hydrochaeris','Capybara','Caviidae','specialist','semi-aquatic,terrestrial','herbivore'),
  mammal('Cynomys ludovicianus','Black-tailed Prairie Dog','Sciuridae','specialist','terrestrial,fossorial','herbivore'),
  mammal('Echinops telfairi','Lesser Hedgehog Tenrec','Tenrecidae','specialist','terrestrial','insectivore'),
  mammal('Tenrec ecaudatus','Tailless Tenrec','Tenrecidae','specialist','terrestrial','omnivore'),
  mammal('Suricata suricatta','Meerkat','Herpestidae','specialist','terrestrial,fossorial','omnivore'),
  mammal('Genetta genetta','Common Genet','Viverridae','specialist','terrestrial,arboreal','carnivore'),
  mammal('Nasua nasua','South American Coati','Procyonidae','specialist','terrestrial,arboreal','omnivore'),
  mammal('Potos flavus','Kinkajou','Procyonidae','high-risk','arboreal','omnivore'),
  mammal('Procyon lotor','Raccoon','Procyonidae','high-risk','terrestrial,arboreal','omnivore'),
  mammal('Hystrix cristata','Crested Porcupine','Hystricidae','high-risk','terrestrial','herbivore'),
  mammal('Callithrix jacchus','Common Marmoset','Callitrichidae','high-risk','arboreal','omnivore'),
  mammal('Saimiri sciureus','Common Squirrel Monkey','Cebidae','high-risk','arboreal','omnivore'),
  mammal('Mustela putorius furo','Domestic Ferret','Mustelidae','companion','terrestrial','carnivore',['ferret']),
  mammal('Cavia porcellus','Guinea Pig','Caviidae','companion','terrestrial','herbivore'),
  mammal('Erinaceus europaeus','European Hedgehog','Erinaceidae','specialist','terrestrial','insectivore'),

  // Companion and specialist birds.
  bird('Melopsittacus undulatus','Budgerigar','Psittaculidae','companion','arboreal','granivore' as UniversalSpeciesSeed['dietaryGuild']),
  bird('Nymphicus hollandicus','Cockatiel','Cacatuidae','companion','arboreal','granivore' as UniversalSpeciesSeed['dietaryGuild']),
  bird('Agapornis roseicollis','Rosy-faced Lovebird','Psittaculidae','companion','arboreal','granivore' as UniversalSpeciesSeed['dietaryGuild']),
  bird('Agapornis personatus','Masked Lovebird','Psittaculidae','companion','arboreal','granivore' as UniversalSpeciesSeed['dietaryGuild']),
  bird('Forpus coelestis','Pacific Parrotlet','Psittacidae','companion','arboreal','granivore' as UniversalSpeciesSeed['dietaryGuild']),
  bird('Poicephalus senegalus','Senegal Parrot','Psittacidae','companion','arboreal','omnivore'),
  bird('Pyrrhura molinae','Green-cheeked Conure','Psittacidae','companion','arboreal','omnivore'),
  bird('Aratinga solstitialis','Sun Conure','Psittacidae','specialist','arboreal','omnivore'),
  bird('Ara ararauna','Blue-and-yellow Macaw','Psittacidae','specialist','arboreal','omnivore'),
  bird('Ara chloropterus','Red-and-green Macaw','Psittacidae','specialist','arboreal','omnivore'),
  bird('Eclectus roratus','Eclectus Parrot','Psittaculidae','specialist','arboreal','omnivore'),
  bird('Psittacus erithacus','Grey Parrot','Psittacidae','specialist','arboreal','omnivore'),
  bird('Cacatua galerita','Sulphur-crested Cockatoo','Cacatuidae','specialist','arboreal','omnivore'),
  bird('Cacatua alba','Umbrella Cockatoo','Cacatuidae','specialist','arboreal','omnivore'),
  bird('Eolophus roseicapilla','Galah','Cacatuidae','specialist','arboreal','omnivore'),
  bird('Serinus canaria','Domestic Canary','Fringillidae','companion','arboreal','granivore' as UniversalSpeciesSeed['dietaryGuild'],['canary']),
  bird('Taeniopygia guttata','Zebra Finch','Estrildidae','companion','arboreal','granivore' as UniversalSpeciesSeed['dietaryGuild']),
  bird('Ramphastos toco','Toco Toucan','Ramphastidae','specialist','arboreal','omnivore'),
  bird('Tauraco erythrolophus','Red-crested Turaco','Musophagidae','specialist','arboreal','frugivore' as UniversalSpeciesSeed['dietaryGuild']),
  bird('Buceros bicornis','Great Hornbill','Bucerotidae','high-risk','arboreal','omnivore'),

  // Freshwater and marine aquarium fish.
  fish('Betta splendens','Siamese Fighting Fish','Osphronemidae','companion','aquatic','omnivore',['betta']),
  fish('Poecilia reticulata','Guppy','Poeciliidae','companion','aquatic','omnivore'),
  fish('Xiphophorus maculatus','Platy','Poeciliidae','companion','aquatic','omnivore'),
  fish('Xiphophorus hellerii','Swordtail','Poeciliidae','companion','aquatic','omnivore'),
  fish('Trichogaster lalius','Dwarf Gourami','Osphronemidae','companion','aquatic','omnivore'),
  fish('Osphronemus goramy','Giant Gourami','Osphronemidae','specialist','aquatic','omnivore'),
  fish('Symphysodon discus','Discus','Cichlidae','specialist','aquatic','omnivore'),
  fish('Pterophyllum scalare','Freshwater Angelfish','Cichlidae','companion','aquatic','omnivore'),
  fish('Astronotus ocellatus','Oscar','Cichlidae','specialist','aquatic','carnivore'),
  fish('Corydoras paleatus','Peppered Cory','Callichthyidae','companion','aquatic','omnivore'),
  fish('Corydoras aeneus','Bronze Cory','Callichthyidae','companion','aquatic','omnivore'),
  fish('Ancistrus cirrhosus','Bristlenose Pleco','Loricariidae','companion','aquatic','herbivore'),
  fish('Paracheirodon innesi','Neon Tetra','Characidae','companion','aquatic','omnivore'),
  fish('Paracheirodon axelrodi','Cardinal Tetra','Characidae','companion','aquatic','omnivore'),
  fish('Danio rerio','Zebrafish','Danionidae','companion','aquatic','omnivore',['zebra danio']),
  fish('Carassius auratus','Goldfish','Cyprinidae','companion','aquatic','omnivore'),
  fish('Chromobotia macracanthus','Clown Loach','Botiidae','specialist','aquatic','omnivore'),
  fish('Pangio kuhlii','Kuhli Loach','Cobitidae','companion','aquatic','omnivore'),
  fish('Hippocampus kuda','Spotted Seahorse','Syngnathidae','specialist','aquatic','carnivore'),
  fish('Amphiprion ocellaris','Ocellaris Clownfish','Pomacentridae','companion','aquatic','omnivore'),
  fish('Paracanthurus hepatus','Regal Blue Tang','Acanthuridae','specialist','aquatic','herbivore'),
  fish('Zebrasoma flavescens','Yellow Tang','Acanthuridae','specialist','aquatic','herbivore'),
  fish('Synchiropus splendidus','Mandarinfish','Callionymidae','specialist','aquatic','carnivore'),

  // Cephalopods — kept as specialist marine records with no casual-handling guidance.
  marine('Octopus vulgaris','Common Octopus','Octopodidae','specialist',['common octopus']),
  marine('Sepia officinalis','Common Cuttlefish','Sepiidae','specialist',['common cuttlefish']),
  marine('Sepia pharaonis','Pharaoh Cuttlefish','Sepiidae','specialist'),
  marine('Nautilus pompilius','Chambered Nautilus','Nautilidae','specialist',['pearly nautilus']),
  marine('Hapalochlaena maculosa','Southern Blue-ringed Octopus','Octopodidae','venomous',['blue ringed octopus']),
];
