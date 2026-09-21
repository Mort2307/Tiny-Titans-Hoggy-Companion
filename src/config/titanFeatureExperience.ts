import { TITAN_V50_FEATURES, type V50Feature } from "../intelligence/v50/titanV50FeatureMatrix";

export const TITAN_FEATURE_ICONS: Record<number, string> = {
  1:"🕵️",2:"📷",3:"🐉",4:"🌳",5:"⏳",6:"🧠",7:"📈",8:"↔️",9:"🧠",10:"🌍",11:"🧬",12:"🛋️",13:"🪪",14:"🩺",15:"🔎",16:"🧪",17:"🔥",18:"⚠️",19:"🌡️",20:"🏠",21:"🌱",22:"🪴",23:"📚",24:"⚖️",25:"🥚",26:"🕵️",27:"📊",28:"🚪",29:"🚨",30:"🔔",31:"🏗️",32:"⚙️",33:"🐣",34:"📐",35:"🏅",36:"⚖️",37:"🧬",38:"📦",39:"📓",40:"🎓",41:"🏆",42:"🌍",43:"🕸️",44:"❓",45:"📡",46:"🧬",47:"🌎",48:"🔬",49:"⚡",50:"🤯",
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