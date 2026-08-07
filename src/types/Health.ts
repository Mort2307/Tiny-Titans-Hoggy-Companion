export type HealthEventType =
  | "Routine Check"
  | "Vet Visit"
  | "Medication"
  | "Illness"
  | "Injury"
  | "Observation"
  | "Other";



export type HealthStatus =
  | "Normal"
  | "Monitoring"
  | "Treatment"
  | "Recovered";



export type HealthRecord = {

  id: string;


  snakeId: string;


  date: string;


  eventType: HealthEventType;


  status: HealthStatus;


  title: string;


  description: string;



  medication?: string;


  dosage?: string;


  duration?: string;



  vetName?: string;



  followUpDate?: string;



  notes?: string;

};