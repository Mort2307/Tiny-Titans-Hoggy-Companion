export type WeightUnit =
  | "g"
  | "kg";


export type WeightRecord = {

  id: string;

  snakeId: string;

  weight: number;

  date: string;

  unit: WeightUnit;

};