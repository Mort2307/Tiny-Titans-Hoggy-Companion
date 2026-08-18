export type HusbandryReference = { id: string; title: string; sourceType: "veterinary" | "professional" | "peer-reviewed"; url: string; reviewed: string; notes: string };

export const husbandryReferences: HusbandryReference[] = [
  { id: "rvc-hognose", title: "Royal Veterinary College — Hognose Snake Care", sourceType: "veterinary", url: "https://www.rvc.ac.uk/Media/Default/Beaumont%20Sainsbury%20Animal%20Hospital/EXOTICS/Animal%20Care%20Factsheets/Hognose-snake-care-and-advice-Dec-2022-jh.pdf", reviewed: "December 2022", notes: "Veterinary husbandry reference covering housing, thermal gradient and general care." },
  { id: "reptifiles-hognose", title: "ReptiFiles — Western Hognose Snake Care", sourceType: "professional", url: "https://reptifiles.com/wp-content/uploads/2020/11/Western-Hognose-Snake-Care-Sheet-PDF.pdf", reviewed: "2026", notes: "Detailed husbandry reference including lighting, UVB, heating and enclosure guidance." },
  { id: "canobie-vet", title: "Canobie Veterinary Hospital — Western Hognose Care", sourceType: "veterinary", url: "https://canobievet.com/wp-content/uploads/2025/01/Western-Hognose-Care-Sheet.pdf", reviewed: "2025", notes: "Veterinary care sheet covering temperature, humidity, diet and handling." },
  { id: "cardiac-study", title: "Healthy Western Hognose Snakes — Echocardiographic Study", sourceType: "peer-reviewed", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10847813/", reviewed: "2023", notes: "Peer-reviewed study of 20 three-year-old captive-bred adults; useful as an observed adult weight cohort, not a juvenile growth chart." },
];

export const husbandryReferenceBands = {
  temperature: { coolMinC: 21, coolMaxC: 24, warmMinC: 28, warmMaxC: 32, baskingMinC: 30, baskingMaxC: 35, nightMinC: 18, nightMaxC: 22 },
  humidity: { minPercent: 30, maxPercent: 50 },
  adultObservedWeight: { maleMinG: 60, maleMaxG: 133, femaleMinG: 180, femaleMaxG: 300, ageYears: 3 },
} as const;

export function ageInYears(hatchDate: string): number {
  const birth = new Date(`${hatchDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 0;
  return Math.max(0, (Date.now() - birth.getTime()) / 31557600000);
}
