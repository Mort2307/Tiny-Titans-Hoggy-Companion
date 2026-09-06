import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { buildTitanProactiveIntelligence, type TitanProactiveInput, type TitanRecordCounts } from "./titanProactiveEngine";
import type { TitanIntelligenceResult } from "./titanIntelligenceContracts";

interface TitanIntelligenceContextValue { intelligence:TitanIntelligenceResult; refresh:(input:TitanProactiveInput)=>TitanIntelligenceResult }
const TitanIntelligenceContext=createContext<TitanIntelligenceContextValue|null>(null);

export function TitanIntelligenceProvider({children,input}:{children:ReactNode;input?:Partial<TitanProactiveInput>}){
  const counts: TitanRecordCounts=useMemo(()=>({
    snakes:input?.counts?.snakes??0,weights:input?.counts?.weights??0,feedings:input?.counts?.feedings??0,sheds:input?.counts?.sheds??0,
    health:input?.counts?.health??0,behaviour:input?.counts?.behaviour??0,husbandry:input?.counts?.husbandry??0,breeding:input?.counts?.breeding??0,
  }),[input?.counts?.snakes,input?.counts?.weights,input?.counts?.feedings,input?.counts?.sheds,input?.counts?.health,input?.counts?.behaviour,input?.counts?.husbandry,input?.counts?.breeding]);
  const recentEventTypes=input?.recentEventTypes;
  const staleAreas=input?.staleAreas;
  const intelligence=useMemo(()=>buildTitanProactiveIntelligence({ ...input, counts, recentEventTypes, staleAreas }),[input,counts,recentEventTypes,staleAreas]);
  const value=useMemo<TitanIntelligenceContextValue>(()=>({intelligence,refresh:buildTitanProactiveIntelligence}),[intelligence]);
  return <TitanIntelligenceContext.Provider value={value}>{children}</TitanIntelligenceContext.Provider>;
}
export function useTitanIntelligence():TitanIntelligenceContextValue{const context=useContext(TitanIntelligenceContext);if(!context)throw new Error("useTitanIntelligence must be used inside TitanIntelligenceProvider");return context;}
