import type { UniversalDietaryGuild, UniversalLifestyle, UniversalSpeciesClass, UniversalSpeciesRisk } from './universalSpeciesTypes';

export interface UniversalSpeciesSeed {
  scientific: string;
  common: string;
  className: UniversalSpeciesClass;
  taxonomicClass: string;
  order: string;
  family: string;
  riskClass: UniversalSpeciesRisk;
  lifestyle: UniversalLifestyle[];
  dietaryGuild: UniversalDietaryGuild;
  aliases?: string[];
}

export const seed = (
  scientific: string,
  common: string,
  className: UniversalSpeciesClass,
  taxonomicClass: string,
  order: string,
  family: string,
  riskClass: UniversalSpeciesRisk,
  lifestyle: string,
  dietaryGuild: UniversalDietaryGuild,
  aliases: string[] = [],
): UniversalSpeciesSeed => ({
  scientific, common, className, taxonomicClass, order, family, riskClass,
  lifestyle: lifestyle.split(',') as UniversalLifestyle[],
  dietaryGuild, aliases,
});
