export type FoodType =
  | "Pinkie Mouse"
  | "Fuzzy Mouse"
  | "Hopper Mouse"
  | "Adult Mouse"
  | "Rat Pup"
  | "Rat Fuzzy"
  | "Quail"
  | "Other";



export type FeedingMethod =
  | "Tongs"
  | "Drop Feed"
  | "Hand Fed"
  | "Scented"
  | "Other";



export type FeedingResponse =
  | "Accepted"
  | "Refused"
  | "Partial"
  | "Regurgitated";



export type FeedingRecord = {

  id: string;


  snakeId: string;



  date: string;



  foodType: FoodType;


  customFood?: string;



  size?: string;



  weight?: number;



  feedingMethod?: FeedingMethod;



  response: FeedingResponse;



  notes?: string;

};