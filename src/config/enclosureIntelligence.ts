import type { HeatingType, SubstrateMixPart, SubstrateType } from "../types/Enclosure";
import { husbandryReferenceBands } from "../data/husbandryReferences";

export type EnvironmentKey = "warmSideTemperature" | "coolSideTemperature" | "ambientTemperature" | "baskingTemperature" | "nightTemperature" | "humidity";
export type EnclosureField = "dimensions" | "enclosureType" | "heating" | "thermostat" | "substrate" | "uvb" | "hides" | "water" | "furnishings" | "bioactive" | "maintenance" | "all";
export type DraftReadings = Record<EnvironmentKey, string>;
export type Metric = { key: EnvironmentKey; label: string; unit: string; min: number; max: number; icon: string };

export const metrics: Metric[] = [
  { key:"warmSideTemperature",label:"Warm side",unit:"°C",min:husbandryReferenceBands.temperature.warmMinC,max:husbandryReferenceBands.temperature.warmMaxC,icon:"🌡️" },
  { key:"coolSideTemperature",label:"Cool side",unit:"°C",min:husbandryReferenceBands.temperature.coolMinC,max:husbandryReferenceBands.temperature.coolMaxC,icon:"❄️" },
  { key:"ambientTemperature",label:"Ambient",unit:"°C",min:husbandryReferenceBands.temperature.coolMinC,max:husbandryReferenceBands.temperature.warmMaxC,icon:"🌬️" },
  { key:"baskingTemperature",label:"Basking / surface",unit:"°C",min:husbandryReferenceBands.temperature.baskingMinC,max:husbandryReferenceBands.temperature.baskingMaxC,icon:"☀️" },
  { key:"nightTemperature",label:"Night",unit:"°C",min:16,max:husbandryReferenceBands.temperature.warmMaxC,icon:"🌙" },
  { key:"humidity",label:"Humidity",unit:"%",min:husbandryReferenceBands.humidity.minPercent,max:husbandryReferenceBands.humidity.maxPercent,icon:"💧" },
];

export const heatingTypes: HeatingType[] = ["Heat Mat","CHE","Halogen","Deep Heat Projector","Radiant Heat Panel","Other"];
export const heatingDevices = ["Deep Heat Projector","Ceramic Heat Emitter","Halogen flood","Heat mat","Radiant heat panel","Custom / other"];
export const thermostatOptions = ["Dimming","Pulse proportional","On/off","Proportional / other","Custom / other"];
export const uvbOptions = ["T5 HO UVB","T8 UVB","Compact UVB","Mercury vapour","LED only","Custom / other"];
export const substrateTypes: SubstrateType[] = ["Aspen","Coco Fibre","Bioactive","Soil Mix","Sand Mix","Other"];

export const substratePresets: Array<{name:string;description:string;parts:SubstrateMixPart[];substrate:SubstrateType}> = [
  {name:"70 / 30 Aspen + Coco",description:"Aspen-dominant dry mix with added fibre structure.",parts:[{material:"Aspen",percentage:70},{material:"Coco fibre",percentage:30}],substrate:"Aspen"},
  {name:"80 / 20 Soil + Sand",description:"Soil-based mix with a mineral component; actual materials and moisture behaviour matter.",parts:[{material:"Soil",percentage:80},{material:"Sand",percentage:20}],substrate:"Soil Mix"},
  {name:"Bioactive-style base",description:"A starting substrate profile for a bioactive setup, not a universal recipe.",parts:[{material:"Soil",percentage:60},{material:"Sand",percentage:20},{material:"Organic matter",percentage:20}],substrate:"Bioactive"},
];
export const emptyReadings: DraftReadings = {warmSideTemperature:"",coolSideTemperature:"",ambientTemperature:"",baskingTemperature:"",nightTemperature:"",humidity:""};
