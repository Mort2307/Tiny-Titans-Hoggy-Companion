import type { TinyTitansIconName } from "../types/tinyTitansIcon";
import { TITAN_V50_FEATURES, type V50Feature } from "../intelligence/v50/titanV50FeatureMatrix";

export const TITAN_FEATURE_ICONS: Record<number, TinyTitansIconName> = {
  1:"search",2:"camera",3:"reptile",4:"family",5:"timeline",6:"titan",7:"analytics",8:"move",9:"behaviour",10:"community",
  11:"genetics",12:"info",13:"account",14:"health",15:"search",16:"testing",17:"power",18:"warning",19:"husbandry",20:"enclosure",
  21:"husbandry",22:"husbandry",23:"knowledge",24:"weight",25:"breeding",26:"search",27:"analytics",28:"move",29:"warning",30:"reminders",
  31:"enclosure",32:"account",33:"reptile",34:"grid",35:"wall",36:"weight",37:"genetics",38:"export",39:"edit",40:"academy",
  41:"wall",42:"community",43:"link",44:"info",45:"messages",46:"genetics",47:"community",48:"knowledge",49:"power",50:"titan",
};

export const geneticsFeatures = new Set([1,2,3,4,5,11,16,23,24,25,34,36,37,43,46,48]);
export const animalFeatures = new Set([6,7,8,9,13,14,15,26,27,28,29,38,39]);
export const husbandryFeatures = new Set([18,19,20,21,22,30,31,32]);
export const communityFeatures = new Set([10,35,36,42,47]);
export const learningFeatures = new Set([40,41,48]);
export const explanationFeatures = new Set([12]);
export const platformLiveFeatures = new Set([17,44,45,49,50]);

export function featureById(id: string | undefined): V50Feature | undefined {
  const numericId = Number(id);
  return Number.isInteger(numericId) ? TITAN_V50_FEATURES.find((feature) => feature.id === numericId) : undefined;
}