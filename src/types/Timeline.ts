export type TimelineEventType =
  | "Hatch"
  | "Arrival"
  | "Weight"
  | "Feeding"
  | "Shed"
  | "Behaviour"
  | "Health"
  | "Breeding"
  | "Milestone"
  | "Other";



export type TimelineEvent = {

  id: string;


  snakeId: string;


  date: string;


  type: TimelineEventType;


  title: string;


  description?: string;


  relatedRecordId?: string;


};
