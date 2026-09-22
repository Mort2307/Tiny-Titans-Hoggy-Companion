import { seed, type UniversalSpeciesSeed } from './universalSpeciesSeedTypes';

const spider = (
  s: string,
  c: string,
  f: string,
  r: UniversalSpeciesSeed['riskClass'],
  l: string | string[] = 'terrestrial',
  d: UniversalSpeciesSeed['dietaryGuild'] | string[] = 'carnivore',
  aliases: string[] = [],
) => {
  const resolvedAliases = Array.isArray(l) ? l : Array.isArray(d) ? d : aliases;
  const resolvedLifestyle = Array.isArray(l) ? 'terrestrial' : l;
  const resolvedDietaryGuild = Array.isArray(d) ? 'carnivore' : d;
  return seed(s, c, 'arachnid', 'Arachnida', 'Araneae', f, r, resolvedLifestyle, resolvedDietaryGuild, resolvedAliases, 'spiders');
};
const scorpion = (s: string, c: string, f: string, r: UniversalSpeciesSeed['riskClass'], aliases: string[] = []) =>
  seed(s, c, 'arachnid', 'Arachnida', 'Scorpiones', f, r, 'terrestrial', 'carnivore', aliases, 'scorpions');
const whip = (s: string, c: string, f: string) =>
  seed(s, c, 'arachnid', 'Arachnida', 'Thelyphonida', f, 'specialist', 'terrestrial', 'carnivore', [], 'whip-spiders-vinegaroons');

export const UNIVERSAL_ARACHNID_SEEDS: UniversalSpeciesSeed[] = [
  // Tarantulas and other commonly kept spiders.
  spider('Brachypelma hamorii','Mexican Redknee Tarantula','Theraphosidae','companion'),
  spider('Brachypelma boehmei','Mexican Fireleg Tarantula','Theraphosidae','companion'),
  spider('Tliltocatl albopilosus','Honduran Curly Hair Tarantula','Theraphosidae','companion',['curlyhair tarantula']),
  spider('Tliltocatl vagans','Mexican Redrump Tarantula','Theraphosidae','companion',['red rump tarantula']),
  spider('Grammostola pulchripes','Chaco Golden Knee Tarantula','Theraphosidae','companion'),
  spider('Grammostola rosea','Chilean Rose Tarantula','Theraphosidae','companion',['Chilean rose hair']),
  spider('Grammostola porteri','Chilean Rose Tarantula','Theraphosidae','specialist',['rose tarantula']),
  spider('Aphonopelma chalcodes','Arizona Blonde Tarantula','Theraphosidae','companion'),
  spider('Chromatopelma cyaneopubescens','Green Bottle Blue Tarantula','Theraphosidae','companion',['GBB']),
  spider('Poecilotheria regalis','Indian Ornamental Tarantula','Theraphosidae','specialist'),
  spider('Poecilotheria metallica','Gooty Sapphire Ornamental','Theraphosidae','specialist',['Gooty ornamental']),
  spider('Cyriopagopus lividum','Cobalt Blue Tarantula','Theraphosidae','specialist'),
  spider('Harpactira pulchripes','Golden Blue-legged Baboon','Theraphosidae','specialist'),
  spider('Caribena versicolor','Martinique Pinktoe Tarantula','Theraphosidae','companion',['Avicularia versicolor']),
  spider('Avicularia avicularia','Pinktoe Tarantula','Theraphosidae','companion'),
  spider('Psalmopoeus irminia','Venezuelan Suntiger','Theraphosidae','specialist',['suntiger tarantula']),
  spider('Psalmopoeus cambridgei','Trinidad Chevron Tarantula','Theraphosidae','specialist'),
  spider('Theraphosa blondi','Goliath Birdeater','Theraphosidae','specialist'),
  spider('Theraphosa stirmi','Burgundy Goliath Birdeater','Theraphosidae','specialist'),
  spider('Lasiodora parahybana','Salmon Pink Birdeater','Theraphosidae','specialist'),
  spider('Pterinochilus murinus','Orange Baboon Tarantula','Theraphosidae','specialist',['OBT']),
  spider('Hysterocrates gigas','Hysterocrates Earth Tiger','Theraphosidae','specialist'),
  spider('Monocentropus balfouri','Socotra Blue Baboon','Theraphosidae','specialist'),
  spider('Pterinopelma sazimai','Brazilian Blue Tarantula','Theraphosidae','specialist'),
  spider('Davus pentaloris','Guatemalan Tiger Rump','Theraphosidae','specialist'),
  spider('Nhandu chromatus','Brazilian Red and White Tarantula','Theraphosidae','specialist'),
  spider('Pamphobeteus antinous','Bolivian Blue Leg','Theraphosidae','specialist'),
  spider('Xenesthis immanis','Colombian Giant Redleg','Theraphosidae','specialist'),
  spider('Megaphobema robustum','Colombian Giant Redleg','Theraphosidae','specialist'),
  spider('Selenocosmia crassipes','Australian Barking Spider','Theraphosidae','specialist'),
  spider('Haplocosmia himalayana','Himalayan Earth Tiger','Theraphosidae','specialist'),
  spider('Chilobrachys fimbriatus','Indian Violet Tarantula','Theraphosidae','specialist'),
  spider('Heterothele villosella','Usambara Baboon','Theraphosidae','specialist'),
  spider('Encyocratella olivacea','Olive Ornamental Baboon','Theraphosidae','specialist'),
  spider('Ceratogyrus darlingi','Rear-horned Baboon','Theraphosidae','specialist'),
  spider('Augacephalus ezendami','Burst-legged Baboon','Theraphosidae','specialist'),
  spider('Stromatopelma calceatum','Featherleg Baboon','Theraphosidae','specialist'),
  spider('Heteroscodra maculata','Togo Starburst Baboon','Theraphosidae','specialist'),
  spider('Ephebopus cyanognathus','Blue Fang Skeleton Tarantula','Theraphosidae','specialist'),
  spider('Ephebopus murinus','Skeleton Leg Tarantula','Theraphosidae','specialist'),
  spider('Psalmopoeus pulcher','Panama Blonde','Theraphosidae','specialist'),
  spider('Psalmopoeus victori','Mexican Redleg','Theraphosidae','specialist'),
  spider('Citharischius crawshayi','King Baboon Spider','Theraphosidae','specialist',['king baboon']),
  spider('Idiothele mira','Fort Hall Baboon','Theraphosidae','specialist'),
  spider('Pterinopelma longisternale','Brazilian Chestnut Tarantula','Theraphosidae','specialist'),
  spider('Acanthoscurria geniculata','Brazilian Whiteknee Tarantula','Theraphosidae','companion'),
  spider('Nhandu tripepii','Brazilian Giant Blonde Tarantula','Theraphosidae','specialist'),

  // Non-theraphosid spiders and spiders frequently represented in exotics collections.
  spider('Phidippus regius','Regal Jumping Spider','Salticidae','companion','arboreal','carnivore'),
  spider('Phidippus audax','Bold Jumping Spider','Salticidae','companion','arboreal','carnivore'),
  spider('Hyllus diardi','Heavy Jumping Spider','Salticidae','specialist','arboreal','carnivore'),
  spider('Caribena laeta','Pinkfoot Goliath Bird-eating Spider','Theraphosidae','specialist','arboreal','carnivore'),
  spider('Damon diadema','Giant East African Tailless Whip Scorpion','Charontidae','companion','arboreal','carnivore'),
  spider('Phrynus marginemaculatus','Tailless Whip Scorpion','Phrynidae','companion','terrestrial','carnivore'),

  // Scorpions.
  scorpion('Pandinus imperator','Emperor Scorpion','Scorpionidae','companion',['emperor scorpion']),
  scorpion('Heterometrus spinifer','Asian Forest Scorpion','Scorpionidae','specialist'),
  scorpion('Heterometrus petersii','Chinese Forest Scorpion','Scorpionidae','specialist'),
  scorpion('Euscorpius flavicaudis','European Yellow-tailed Scorpion','Euscorpiidae','companion'),
  scorpion('Centruroides sculpturatus','Arizona Bark Scorpion','Buthidae','venomous'),
  scorpion('Androctonus australis','North African Fat-tailed Scorpion','Buthidae','venomous'),
  scorpion('Leiurus quinquestriatus','Deathstalker Scorpion','Buthidae','venomous'),
  scorpion('Tityus stigmurus','Brazilian Yellow Scorpion','Buthidae','venomous'),
  scorpion('Hadrurus arizonensis','Arizona Hairy Scorpion','Caraboctonidae','specialist'),
  scorpion('Hadogenes troglodytes','Giant Flat Rock Scorpion','Hormuridae','specialist'),
  scorpion('Opistophthalmus glabrifrons','Glabrous Burrowing Scorpion','Scorpionidae','specialist'),
  scorpion('Urodacus yaschenkoi','Flinders Ranges Scorpion','Urodacidae','specialist'),

  // Uropygids and related arachnids.
  whip('Mastigoproctus giganteus','Giant Vinegaroon','Thelyphonidae'),
  whip('Mastigoproctus barahonensis','Dominican Vinegaroon','Thelyphonidae'),
];
