export type BreedingStatus =
  | "Planned"
  | "Paired"
  | "Locked"
  | "Gravid"
  | "Laid"
  | "Complete"
  | "Failed";

export type BreedingProject = {
  id: string;
  ownerId: string;
  name: string;
  maleId: string;
  femaleId: string;
  status: BreedingStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
  notes?: string;
  expectedTraits?: string[];
  expectedGenetics?: unknown;
  targetTraits?: string[];
  goal?: string;
  priority?: "Low" | "Normal" | "High" | "Flagship";
  holdbackStrategy?: string;
  futurePairingNotes?: string;
};

export type BreedingPairing = {
  id: string;
  projectId?: string;
  maleId: string;
  femaleId: string;
  pairingDate: string;
  status: BreedingStatus;
  notes?: string;
  expectedTraits?: string[];
  expectedGenetics?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type EggClutch = {
  id: string;
  projectId?: string;
  pairingId: string;
  laidDate: string;
  eggCount: number;
  viableEggs?: number;
  infertileEggs?: number;
  incubatorTemperature?: number;
  incubationDays?: number;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type HatchlingRecord = {
  id: string;
  projectId?: string;
  clutchId: string;
  hatchDate: string;
  name?: string;
  sex: "Male" | "Female" | "Unknown";
  morph?: string;
  morphId?: string;
  hets?: string[];
  weightAtHatch?: number;
  notes?: string;
  snakeId?: string;
  holdback?: boolean;
  holdbackReason?: string;
  futurePairingGoal?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};
